import * as pc from 'playcanvas';

export type XrSessionType = typeof pc.XRTYPE_VR;
export type XrReferenceSpaceType = typeof pc.XRSPACE_LOCALFLOOR;

export interface VrManagerEvents {
    'sessionstart': () => void;
    'sessionend': () => void;
}

/**
 * VR会话管理器
 * 负责VR会话的启动、停止和事件监听
 */
export class VrManager {
    private app: pc.Application;
    private _isActive: boolean = false;
    private eventListeners: Map<keyof VrManagerEvents, Set<Function>> = new Map();

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
     * 获取XR相机
     */
    get xrCamera(): pc.Entity | null {
        // xr.camera 是 CameraComponent，不是Entity
        // 这里返回null，因为我们需要的是Entity来启动XR
        return null;
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
                        this.emit('sessionstart');
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
        this.emit('sessionend');
    }

    /**
     * 监听VR事件
     */
    on(event: keyof VrManagerEvents, callback: Function): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(callback);
    }

    /**
     * 取消监听VR事件
     */
    off(event: keyof VrManagerEvents, callback: Function): void {
        this.eventListeners.get(event)?.delete(callback);
    }

    private emit(event: keyof VrManagerEvents): void {
        this.eventListeners.get(event)?.forEach(cb => cb());
    }
}
