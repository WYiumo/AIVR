import * as pc from 'playcanvas';
import { Grabbable } from './grabbable';
import { GrabbableRegistry } from './grabbable-registry';
import { HighlightBox } from './highlight-box';
import { VrController, type ControllerInfo } from '../entities/controller';

/**
 * Manipulator - 负责抓取、移动、旋转单一物体。
 * - 抓取: 将物体 reparent 到对应 controller 实体下（自动跟随手柄）
 * - 释放: 还原到原 parent
 * - 旋转: 任一手 Grip 按下时，按右手摇杆方向选择轴 (左右→Y轴 / 上下→X轴)
 * - 提示: 抓取时显示白色线框正方体，边长 = AABB 最长轴
 */
export class Manipulator {
    private held: { grabbable: Grabbable; originalParent: pc.GraphNode } | null = null;
    private highlight: HighlightBox | null = null;

    private readonly rotationSpeed = 20;  // rad/s
    private readonly stickDeadzone = 0.3;

    private controller: VrController;
    private registry: GrabbableRegistry;
    private app: pc.Application;

    constructor(app: pc.Application, controller: VrController, registry: GrabbableRegistry) {
        this.app = app;
        this.controller = controller;
        this.registry = registry;
    }

    /**
     * 是否当前抓取中
     */
    isHolding(): boolean {
        return this.held !== null;
    }

    /**
     * 获取当前抓取的实体
     */
    getHeldEntity(): pc.Entity | null {
        return this.held?.grabbable.entity ?? null;
    }

    /**
     * 开始抓取：将物体 reparent 到 controller 实体下
     */
    startHold(grabbable: Grabbable, inputSource: pc.XrInputSource): void {
        if (this.held) {
            console.log('[Manipulator] 已抓取中，忽略');
            return;
        }

        const ctrl = this.controller.findByInputSource(inputSource);
        if (!ctrl) {
            console.warn('[Manipulator] 找不到 controller for inputSource');
            return;
        }

        const heldEntity = grabbable.entity;
        const originalParent = heldEntity.parent;
        if (!originalParent) {
            console.warn('[Manipulator] 实体没有 parent');
            return;
        }

        this.held = { grabbable, originalParent };

        // reparent 到 controller 实体下 - PlayCanvas 自动同步世界变换
        // addChildAndSaveTransform 保留世界变换，物体停留原世界位置
        // 后续每帧 PlayCanvas 自动用 controller 的世界变换计算物体的世界位置
        // 物体相对 controller 的偏移 = 抓取瞬间的世界位置 - controller 当时的世界位置
        // 用户通过移动手柄来移动物体
        ctrl.entity.addChildAndSaveTransform(heldEntity);
        console.log('[Manipulator] 抓取成功:', heldEntity.name, '→ controller:', ctrl.entity.name);

        // 创建白色线框正方体提示
        this.showHighlight(heldEntity);
    }

    /**
     * 创建/更新白色线框提示框
     */
    private showHighlight(entity: pc.Entity): void {
        if (!this.highlight) {
            this.highlight = new HighlightBox(this.app);
        }
        // 计算边长 = AABB 最长轴
        const aabb = this.registry.getAabb(entity);
        let size = 1;
        if (aabb) {
            const hx = aabb.halfExtents.x * 2;
            const hy = aabb.halfExtents.y * 2;
            const hz = aabb.halfExtents.z * 2;
            size = Math.max(hx, hy, hz);
        } else {
            console.warn('[Manipulator] 无法获取 AABB，使用默认大小 1m');
        }
        this.highlight.setSize(size);

        // 作为子节点附加（注意：要先 remove 之前的父节点）
        const oldParent = this.highlight.entity.parent;
        if (oldParent) {
            oldParent.removeChild(this.highlight.entity);
        }
        
        entity.addChild(this.highlight.entity);
        // 居中（正方体默认中心在原点）
        this.highlight.entity.setLocalPosition(0, 0, 0);
        console.log('[Manipulator] 高亮框边长:', size.toFixed(3), 'm');
    }

    /**
     * 释放：还原到原 parent
     */
    endHold(): void {
        if (!this.held) return;
        const entity = this.held.grabbable.entity;
        if (this.held.originalParent && this.held.originalParent !== entity) {
            this.held.originalParent.addChildAndSaveTransform(entity);
        }
        this.held = null;

        // 销毁高亮框
        if (this.highlight) {
            this.highlight.destroy();
            this.highlight = null;
        }
    }

    /**
     * per-frame: 应用抓取 + 摇杆旋转
     */
    update(_dt: number): void {
        if (!this.held) return;

        // 每帧让 HighlightBox 抵消父旋转，保持世界轴对齐
        this.counterRotateHighlight();

        // Grip 按下 → 进入旋转模式
        const rotating = this.controller.isLeftGripHeld() || this.controller.isRightGripHeld();
        if (!rotating) return;

        // 取摇杆偏转（右手优先，从所有控制器中找右手）
        let ctrl = this.controller.getRightController();
        if (!ctrl) {
            // 回退：遍历所有控制器找右手
            for (const c of this.controller.getControllers()) {
                if (c.inputSource.handedness === 'right') { ctrl = c; break; }
            }
        }
        if (!ctrl) ctrl = this.controller.getLeftController();

        const stick = this.getThumbstick(ctrl);
        if (!stick) return;

        const sx = Math.abs(stick.x) > this.stickDeadzone ? stick.x : 0;
        const sy = Math.abs(stick.y) > this.stickDeadzone ? stick.y : 0;
        if (sx === 0 && sy === 0) return;

        console.log('[Manipulator] 旋转 stick=(' + stick.x.toFixed(2) + ',' + stick.y.toFixed(2) + ')');

        // 按主分量选轴
        let axis: pc.Vec3;
        let amount: number;
        if (Math.abs(sx) > Math.abs(sy)) {
            axis = new pc.Vec3(0, 1, 0);  // Y 轴
            amount = sx;
        } else {
            axis = new pc.Vec3(1, 0, 0);  // X 轴
            amount = sy;
        }

        const delta = amount * this.rotationSpeed * _dt;
        const q = new pc.Quat().setFromAxisAngle(axis, delta);
        const current = this.held.grabbable.entity.getLocalRotation();
        const next = new pc.Quat().mul2(q, current);
        this.held.grabbable.entity.setLocalRotation(next);
    }

    /**
     * HighlightBox 是被抓取实体的子节点，继承父旋转。
     * 层级: controller → held entity → highlight box
     * 目标: highlight 的世界旋转 = identity
     *   → highlight.localRot × held.localRot × controller.worldRot = identity
     *   → highlight.localRot = (held.localRot × controller.worldRot) 的逆
     */
    private counterRotateHighlight(): void {
        if (!this.highlight) return;
        const heldEntity = this.held!.grabbable.entity;

        // 合成 held 父链上的总世界旋转
        // held 在 controller 局部空间下的 local rot
        // controller 的 world rot (getRotation 返回世界旋转)
        // 总世界旋转 = parent.worldRot * held.localRot
        const heldLocalRot = heldEntity.getLocalRotation();
        const parentWorldRot = heldEntity.parent ? heldEntity.parent.getRotation() : pc.Quat.IDENTITY;
        const totalWorldRot = new pc.Quat().mul2(parentWorldRot, heldLocalRot);

        // highlight.localRot = totalWorldRot 的逆
        const inverse = new pc.Quat().copy(totalWorldRot).invert();
        this.highlight.entity.setLocalRotation(inverse);
    }

    private getThumbstick(ctrl: ControllerInfo | null): { x: number; y: number } | null {
        if (!ctrl) return null;
        const gamepad = (ctrl.inputSource as any).gamepad;
        if (!gamepad?.axes) return null;
        // Meta Quest Touch: axes[2]=stick X, axes[3]=stick Y
        return {
            x: gamepad.axes[2] ?? 0,
            y: gamepad.axes[3] ?? 0
        };
    }
}
