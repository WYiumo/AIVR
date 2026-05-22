import * as pc from 'playcanvas';
import { VrManager } from './vr-manager';
import { Ground } from '../entities/ground';
import { Sky } from '../entities/sky';

/**
 * 地面配置
 */
export interface GroundConfig {
    /** 是否启用地面 */
    enabled?: boolean;
    /** 地面大小 */
    size?: number;
    /** 地面颜色 */
    color?: pc.Color;
}

/**
 * 天空配置
 */
export interface SkyConfig {
    /** 是否启用天空 */
    enabled?: boolean;
    /** 天空类型: 'infinite' | 'box' | 'dome' */
    type?: 'infinite' | 'box' | 'dome';
    /** 天空缩放 */
    scale?: number;
    /** 曝光度 */
    exposure?: number;
}

/**
 * 场景配置
 */
export interface SceneConfig {
    /** 背景颜色 */
    backgroundColor: pc.Color;
    /** 是否显示网格 */
    showGrid: boolean;
    /** 网格大小 */
    gridScale: number;
    /** 地面配置 */
    ground?: GroundConfig;
    /** 天空配置 */
    sky?: SkyConfig;
}

/**
 * 默认场景配置
 */
const defaultConfig: SceneConfig = {
    backgroundColor: new pc.Color(0.8, 0.9, 0.9),
    showGrid: true,
    gridScale: 10,
    ground: {
        enabled: true,
        size: 100,
    },
    sky: {
        enabled: true,
        type: 'infinite',
        scale: 200,
        exposure: 2.0
    }
};

/**
 * 场景管理器
 * 负责场景创建、实体管理和VR支持
 */
export class Scene {
    readonly app: pc.Application;
    readonly vrManager: VrManager;
    readonly config: SceneConfig;

    private entities: Set<pc.Entity> = new Set();
    private cameraEntity: pc.Entity | null = null;
    private ground: Ground | null = null;
    private sky: Sky | null = null;


    constructor(
        app: pc.Application,
        vrManager: VrManager,
        config: Partial<SceneConfig> = {}
    ) {
        this.app = app;
        this.vrManager = vrManager;
        this.config = { ...defaultConfig, ...config };
    }

    async init(): Promise<void> {
        this.setupScene();
        this.setupGround();
        this.setupSky();
        // this.setupEventListeners();
    }

    /**
     * 设置场景基础配置
     */
    private setupScene(): void {
        // 设置环境光
        this.app.scene.ambientLight = new pc.Color(0.8, 0.8, 0.8);
    }

    /**
     * 创建地面
     */
    private setupGround(): void {
        const cfg = this.config.ground;
        if (!cfg?.enabled) return;

        this.ground = new Ground(this.app, {
            size: cfg.size,
        });
    }

    /**
     * 创建天空
     */
    private setupSky(): void {
        const cfg = this.config.sky;
        if (!cfg?.enabled) return;

        this.sky = new Sky(this.app, {
            type: cfg.type,
            scale: cfg.scale,
            exposure: cfg.exposure,
        });
    }

    /**
     * 获取地面
     */
    getGround(): Ground | null {
        return this.ground;
    }

    /**
     * 获取天空
     */
    getSky(): Sky | null {
        return this.sky;
    }

    /**
     * 获取相机实体
     */
    getCamera(): pc.Entity | null {
        return this.cameraEntity;
    }

    /**
     * 设置相机实体
     */
    setCamera(entity: pc.Entity): void {
        this.cameraEntity = entity;
    }

    /**
     * 添加实体到场景
     */
    addEntity(entity: pc.Entity): void {
        this.entities.add(entity);
        this.app.root.addChild(entity);
    }

    /**
     * 从场景移除实体
     */
    removeEntity(entity: pc.Entity): void {
        this.entities.delete(entity);
        entity.destroy();
    }

    /**
     * 更新所有实体
     */
    update(_dt: number): void {
        // 可扩展：批量更新实体
    }

    /**
     * 获取所有实体
     */
    getEntities(): Set<pc.Entity> {
        return this.entities;
    }
}
