import * as pc from 'playcanvas';

/**
 * VR控制器信息
 */
export interface ControllerInfo {
    inputSource: pc.XrInputSource;
    entity: pc.Entity;
    isGrabbing: boolean;
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

    constructor(app: pc.Application) {
        this.app = app;
        this.setupControllers();
    }

    /**
     * 设置控制器监听
     */
    private setupControllers(): void {
        if (!this.app.xr?.input) return;

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
        const controllerEntity = new pc.Entity(`Controller_${inputSource.handedness}`);

        // 添加控制器模型（使用box作为可视化）
        controllerEntity.addComponent('render', {
            type: 'box'
        });
        controllerEntity.setLocalScale(0.02, 0.02, 0.1);

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
            isGrabbing: false
        };

        this.controllers.push(info);

        // 区分左右手
        if (inputSource.handedness === 'right') {
            this.rightController = info;
        } else if (inputSource.handedness === 'left') {
            this.leftController = info;
        }

        console.log(`VR控制器已连接: ${inputSource.handedness}`);
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
     * 每帧更新
     */
    update(_dt: number): void {
        // 更新每个控制器的位置和旋转
        for (const controller of this.controllers) {
            const { inputSource, entity } = controller;

            // 获取手柄位置和旋转
            const position = inputSource.getPosition();
            const rotation = inputSource.getRotation();

            if (position) entity.setPosition(position);
            if (rotation) entity.setRotation(rotation);

            // 更新抓取状态
            this.updateGrabbing(controller, inputSource);
        }
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
