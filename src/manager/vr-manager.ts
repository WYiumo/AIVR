import * as pc from 'playcanvas';

export type XrSessionType = typeof pc.XRTYPE_VR;
export type XrReferenceSpaceType = typeof pc.XRSPACE_LOCALFLOOR;


/**
 * VR会话管理器
 * 负责VR会话的启动、停止
 */
export class VrManager {
    private app: pc.Application;
    private _isActive: boolean = false;

    constructor(app: pc.Application) {
        this.app = app;
    }

    /**
     * 检查XR是否支持
     */
    isSupported(): boolean {
        return this.app.xr?.supported ?? false;
    }

    /**
     * 检查VR是否可用
     */
    isAvailable(type: XrSessionType = pc.XRTYPE_VR): boolean {
        // 先检查XR是否支持
        if (!this.isSupported()) {
            return false;
        }
        return this.app.xr?.isAvailable(type) ?? false;
    }

    /**
     * 检查VR会话是否处于活动状态
     */
    get isActive(): boolean {
        return this._isActive;
    }

    /**
     * 获取XR输入
     */
    get input(): any {
        return this.app.xr?.input ?? null;
    }

    /**
     * 启动VR会话
     */
    async startVr(cameraEntity: pc.Entity, options: {
        type?: XrSessionType;
        space?: XrReferenceSpaceType;
    } = {}): Promise<void> {
        const type = options.type ?? pc.XRTYPE_VR;
        const space = options.space ?? pc.XRSPACE_LOCALFLOOR;

        const camera = cameraEntity.camera;
        if (!camera) {
            throw new Error('实体没有相机组件');
        }

        return new Promise((resolve, reject) => {
            camera.startXr(type, space, {
                callback: (err: Error | null) => {
                    if (err) {
                        reject(err);
                    } else {
                        this._isActive = true;
                        this.app.fire('sessionstart');
                        resolve();
                    }
                }
            });
        });
    }

    /**
     * 结束VR会话
     */
    endVr(): void {
        this.app.xr?.end();
        this._isActive = false;
        this.app.fire('sessionend');
    }
}
