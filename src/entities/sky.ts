import * as pc from 'playcanvas';

/**
 * 天空类型
 */
export type SkyType = 'infinite' | 'box' | 'dome';

/**
 * 天空配置
 */
export interface SkyConfig {
    /** 天空类型 */
    type?: SkyType;
    /** 天空缩放（对于 box/dome） */
    scale?: number;
    /** 天空中心高度 */
    centerHeight?: number;
    /** 天空盒纹理 URL（可选） */
    cubemapUrl?: string;
    /** 旋转角度（度） */
    rotation?: number;
    /** 曝光度 */
    exposure?: number;
}

interface InternalSkyConfig {
    type: SkyType;
    scale: number;
    centerHeight: number;
    cubemapUrl: string | undefined;
    rotation: number;
    exposure: number;
}

/**
 * 天空类
 * 创建天空盒或无限天空
 */
export class Sky {
    private app: pc.Application;
    private config: InternalSkyConfig;

    constructor(app: pc.Application, config: SkyConfig = {}) {
        this.app = app;

        this.config = {
            type: config.type ?? 'dome',
            scale: config.scale ?? 200,
            centerHeight: config.centerHeight ?? 0.05,
            cubemapUrl: config.cubemapUrl,
            rotation: config.rotation ?? 0,
            exposure: config.exposure ?? 1.0
        };

        this.apply();
    }

    /**
     * 应用天空配置
     */
    private apply(): void {
        const { type, scale, centerHeight, exposure, rotation } = this.config;

        // 设置天空类型
        this.app.scene.sky.type = type;

        // 设置天空盒缩放和中心（对于 box/dome）
        if (type !== 'infinite') {
            this.app.scene.sky.node.setLocalScale(scale, scale, scale);
            this.app.scene.sky.center = new pc.Vec3(0, centerHeight, 0);
        }

        // 设置曝光
        this.app.scene.exposure = exposure;

        // 设置天空盒旋转
        this.app.scene.skyboxRotation = new pc.Quat().setFromEulerAngles(0, rotation, 0);
    }

    /**
     * 设置曝光度
     */
    setExposure(value: number): void {
        this.config.exposure = value;
        this.app.scene.exposure = value;
    }

    /**
     * 获取曝光度
     */
    getExposure(): number {
        return this.config.exposure;
    }

    /**
     * 设置天空类型
     */
    setType(type: SkyType): void {
        this.config.type = type;
        this.apply();
    }

    /**
     * 获取天空类型
     */
    getType(): SkyType {
        return this.config.type;
    }

    /**
     * 设置天空旋转
     */
    setRotation(degrees: number): void {
        this.config.rotation = degrees;
        this.app.scene.skyboxRotation = new pc.Quat().setFromEulerAngles(0, degrees, 0);
    }

    /**
     * 销毁
     */
    destroy(): void {
        // 重置为默认值
        this.app.scene.sky.type = pc.SKYTYPE_INFINITE;
        this.app.scene.exposure = 1.0;
    }
}
