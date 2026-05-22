import * as pc from 'playcanvas';

/**
 * VR控制器信息
 */
export interface ControllerInfo {
    inputSource: pc.XrInputSource;
    entity: pc.Entity;
    isGrabbing: boolean;
    needsAssignment: boolean;  // 是否需要解析左右手
    modelAsset: pc.Asset | null;  // GLB 模型资产
}

/**
 * VR控制器管理器
 * 处理VR手柄控制器的创建、追踪和输入
 */
export class VrController {
    private app: pc.Application;

    private controllers: ControllerInfo[] = [];
    private rightController: ControllerInfo | null = null;
    private leftController: ControllerInfo | null = null;

    private grabbedEntity: pc.Entity | null = null;
    private grabOffset: pc.Vec3 = new pc.Vec3();
    private onYButtonPressed: (() => void) | null = null;
    private prevYButtonState: boolean = false;

    // 模型资产
    private leftModelAsset: pc.Asset | null = null;
    private rightModelAsset: pc.Asset | null = null;

    constructor(app: pc.Application) {
        this.app = app;
        // this.loadControllerModels();
        this.leftModelAsset = this.app.assets.find('leftController');
        this.rightModelAsset = this.app.assets.find('rightController');
        this.setupControllers();
    }

    /**
     * 设置控制器监听
     */
    private setupControllers(): void {
        if (!this.app.xr?.input) return;

        // 监听新连接/断开事件
        this.app.xr.input.on('add', (inputSource: pc.XrInputSource) => {
            this.onControllerAdded(inputSource);
        });

        this.app.xr.input.on('remove', (inputSource: pc.XrInputSource) => {
            this.onControllerRemoved(inputSource);
        });
    }

    /**
     * 控制器添加时
     */
    private onControllerAdded(inputSource: pc.XrInputSource): void {
        // 创建控制器实体
        const controllerEntity = new pc.Entity(`Controller_${inputSource.handedness ?? 'unknown'}`);

        // 添加点光源模拟手柄发光
        controllerEntity.addComponent('light', {
            type: 'point',
            color: new pc.Color(0.2, 0.5, 1.0),
            range: 0.5,
            intensity: 0.5
        });

        this.app.root.addChild(controllerEntity);

        const info: ControllerInfo = {
            inputSource,
            entity: controllerEntity,
            isGrabbing: false,
            needsAssignment: true,
            modelAsset: null  // 初始为 null，等待 GLB 模型加载后替换
        };

        this.controllers.push(info);
        console.log(`VR控制器已连接`);
    }

    /**
     * 控制器移除时
     */
    private onControllerRemoved(inputSource: pc.XrInputSource): void {
        const index = this.controllers.findIndex(c => c.inputSource === inputSource);
        if (index >= 0) {
            this.controllers[index].entity.destroy();
            this.controllers.splice(index, 1);
        }

        if (this.rightController?.inputSource === inputSource) {
            this.rightController = null;
        }
        if (this.leftController?.inputSource === inputSource) {
            this.leftController = null;
        }

        console.log(`VR控制器已断开: ${inputSource.handedness}`);
    }

    /**
     * 将 box 模型替换为 GLB 模型
     */
    private SetupControllerModel(controller: ControllerInfo): void {

        if (controller.modelAsset) return;  // 已设置

        const handedness = controller.inputSource.handedness;
        const modelAsset = handedness === 'left' ? this.leftModelAsset :
            handedness === 'right' ? this.rightModelAsset : null;
        if (!modelAsset) return;

        // 添加 model 组件（GLB）
        const containerResource = modelAsset.resource as any;
        controller.entity.addComponent('model', {
            type: 'asset',
            asset: containerResource?.model,
            castShadows: true
        });

        controller.modelAsset = modelAsset;
        console.log(`控制器模型已替换: ${handedness}`);
    }

    /**
     * 每帧更新
     */
    update(_dt: number): void {
        const inputSources = this.app.xr?.input?.inputSources ?? [];

        // 遍历所有输入源，更新位置和解析 handedness
        for (const inputSource of inputSources) {
            // 找到对应的 ControllerInfo
            const controller = this.controllers.find(c => c.inputSource === inputSource);
            if (!controller) continue;

            // 更新手柄位置和旋转
            const position = inputSource.getLocalPosition();
            const rotation = inputSource.getLocalRotation();
            if (position) controller.entity.setLocalPosition(position);
            if (rotation) controller.entity.setLocalRotation(rotation);

            // 只对标记为需要解析的控制器检测 handedness
            if (controller.needsAssignment && inputSource.handedness) {
                if (inputSource.handedness === 'right') {
                    this.rightController = controller;
                } else if (inputSource.handedness === 'left') {
                    this.leftController = controller;
                }
                controller.needsAssignment = false;
            }

            // 尝试将 box 模型替换为 GLB 模型
            this.SetupControllerModel(controller);

            // 更新抓取状态
            this.updateGrabbing(controller, inputSource);
        }

        // 检测左手 Y 按钮 (按钮索引 5)
        if (this.leftController) {
            const gamepad = (this.leftController.inputSource as any).gamepad;
            const yButtonPressed = gamepad?.buttons?.[5]?.pressed ?? false;

            if (yButtonPressed && !this.prevYButtonState) {
                this.onYButtonPressed?.();
            }
            this.prevYButtonState = yButtonPressed;
        }

        // 射线可视化
        this.drawInputSourceRays();
    }

    /**
     * 绘制 XR 输入源射线（调试用）
     */
    drawInputSourceRays(): void {
        if (!this.app.xr?.active) return;

        for (const inputSource of this.app.xr.input.inputSources) {
            if (inputSource.targetRayMode === pc.XRTARGETRAY_POINTER) {
                const origin = inputSource.getOrigin();
                const direction = inputSource.getDirection();
                                
                if (origin && direction) {
                    const endPoint = direction.clone().mulScalar(10).add(origin);
                    const color = inputSource.selecting ? pc.Color.GREEN : pc.Color.WHITE;
                    this.app.drawLine(origin, endPoint, color);
                }
            }
        }
    }

    /**
     * 设置 Y 按钮按下回调
     */
    setYButtonCallback(callback: () => void): void {
        this.onYButtonPressed = callback;
    }

    /**
     * 更新抓取逻辑
     */
    private updateGrabbing(controller: ControllerInfo, inputSource: pc.XrInputSource): void {
        if (controller.isGrabbing && this.grabbedEntity) {
            const gripPose = inputSource.getPosition();
            if (gripPose) {
                const newPos = new pc.Vec3().add2(gripPose, this.grabOffset);
                this.grabbedEntity.setPosition(newPos);
            }
        }

        // 释放抓取
        if (controller.isGrabbing && !inputSource.selecting) {
            controller.isGrabbing = false;
            this.grabbedEntity = null;
        }
    }

    /**
     * 开始抓取实体
     */
    startGrab(inputSource: pc.XrInputSource, target: pc.Entity): void {
        const controller = this.controllers.find(c => c.inputSource === inputSource);
        if (!controller) return;

        const gripPose = inputSource.getPosition();
        if (!gripPose) return;

        controller.isGrabbing = true;
        this.grabbedEntity = target;
        this.grabOffset.sub2(target.getPosition(), gripPose);
    }

    /**
     * 结束抓取
     */
    endGrab(inputSource: pc.XrInputSource): void {
        const controller = this.controllers.find(c => c.inputSource === inputSource);
        if (controller) {
            controller.isGrabbing = false;
            this.grabbedEntity = null;
        }
    }

    /**
     * 获取右手射线
     */
    getRightRay(): { origin: pc.Vec3; direction: pc.Vec3 } | null {
        if (!this.rightController) return null;

        const inputSource = this.rightController.inputSource;
        const position = inputSource.getPosition();
        const direction = inputSource.getDirection();

        return {
            origin: position ? position.clone() : new pc.Vec3(),
            direction: direction ? direction.clone() : new pc.Vec3(0, 0, -1)
        };
    }

    /**
     * 获取所有控制器
     */
    getControllers(): ControllerInfo[] {
        return this.controllers;
    }

    /**
     * 获取右手控制器
     */
    getRightController(): ControllerInfo | null {
        return this.rightController;
    }

    /**
     * 获取左手控制器
     */
    getLeftController(): ControllerInfo | null {
        return this.leftController;
    }

    /**
     * 销毁
     */
    destroy(): void {
        for (const controller of this.controllers) {
            controller.entity.destroy();
        }
        this.controllers = [];
    }
}
