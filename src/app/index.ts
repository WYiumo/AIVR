import * as pc from 'playcanvas';
import { Scene } from './scene';
import { VrManager } from './vr-manager';
import { Cube } from '../entities/cube';
import { VrController } from '../entities/controller';
import { SplatLoader } from '../entities/splat-loader';
import { createVrButton } from '../ui/vr-button';

/**
 * 应用配置
 */
export interface AppConfig {
    /** 是否启用XR */
    xrCompatible: boolean;
    /** 是否显示调试信息 */
    debug: boolean;
}

/**
 * 默认应用配置
 */
const defaultConfig: AppConfig = {
    xrCompatible: true,
    debug: true
};

/**
 * 应用类
 * 负责初始化PlayCanvas应用、场景、VR功能
 */
export class App {
    private app: pc.Application;
    private scene: Scene;
    private vrManager: VrManager;
    private vrController: VrController | null = null;
    private config: AppConfig;
    private cube: Cube | null = null;
    private splatLoader: SplatLoader | null = null;

    constructor(app: pc.Application, config: Partial<AppConfig> = {}) {
        this.app = app;
        this.config = { ...defaultConfig, ...config };
        this.vrManager = new VrManager(app);
        this.scene = new Scene(app, this.vrManager);
    }

    /**
     * 初始化应用
     */
    async init(): Promise<void> {
        if (this.config.debug) {
            console.log('AIVR App 初始化中...');
        }

        // 创建相机
        this.createCamera();

        // 创建蓝色立方体
        this.createCube();

        // 创建VR按钮
        createVrButton(this.vrManager, this.app.root.findByName('Camera') as pc.Entity);

        // 设置VR事件监听
        this.setupVrEvents();

        if (this.config.debug) {
            console.log('AIVR App 初始化完成');
        }
    }

    /**
     * 创建相机
     */
    private createCamera(): void {
        const camera = new pc.Entity('Camera');
        camera.addComponent('camera', {
            clearColor: this.scene.config.backgroundColor,
            fov: 60,
            nearClip: 0.1,
            farClip: 1000
        });

        // 设置相机位置（面向立方体）
        // camera.setPosition(new pc.Vec3(3, 2, 3));
        // camera.lookAt(new pc.Vec3(0, 0.5, 0));

        this.scene.setCamera(camera);
        this.scene.addEntity(camera);

        if (this.config.debug) {
            console.log('相机已创建:', camera.getPosition());
        }
    }

    /**
     * 创建蓝色立方体
     */
    private createCube(): void {
        this.cube = new Cube(this.app, {
            position: new pc.Vec3(0, 1, -2),
            scale: new pc.Vec3(1, 1, 1),
            color: new pc.Color(0.0, 0.3, 1.0)  // 蓝色
        });

        this.scene.addEntity(this.cube.entity);

        if (this.config.debug) {
            console.log('蓝色立方体已创建');
        }
    }

    /**
     * 设置VR事件监听
     */
    private setupVrEvents(): void {
        this.vrManager.on('sessionstart', () => {
            this.onVrStart();
        });

        this.vrManager.on('sessionend', () => {
            this.onVrEnd();
        });
    }

    /**
     * VR会话开始时
     */
    private onVrStart(): void {
        if (this.config.debug) {
            console.log('VR会话已开始');
        }

        // 创建VR控制器管理器
        this.vrController = new VrController(this.app);

        // 隐藏VR按钮
        const vrBtn = document.getElementById('vr-button');
        if (vrBtn) vrBtn.style.display = 'none';
    }

    /**
     * VR会话结束时
     */
    private onVrEnd(): void {
        if (this.config.debug) {
            console.log('VR会话已结束');
        }

        // 销毁VR控制器管理器
        if (this.vrController) {
            this.vrController.destroy();
            this.vrController = null;
        }

        // 显示VR按钮
        const vrBtn = document.getElementById('vr-button');
        if (vrBtn) vrBtn.style.display = 'block';
    }

    /**
     * 每帧更新
     */
    update(dt: number): void {
        // 更新VR控制器
        if (this.vrController) {
            this.vrController.update(dt);
        }

        // 更新场景
        this.scene.update(dt);
    }

    /**
     * 获取PlayCanvas应用
     */
    getApp(): pc.Application {
        return this.app;
    }

    /**
     * 获取场景
     */
    getScene(): Scene {
        return this.scene;
    }

    /**
     * 获取VR管理器
     */
    getVrManager(): VrManager {
        return this.vrManager;
    }

    /**
     * 获取立方体
     */
    getCube(): Cube | null {
        return this.cube;
    }

    /**
     * 加载splat文件
     */
    async loadSplat(url: string, position?: pc.Vec3, scale?: pc.Vec3): Promise<void> {
        if (!this.splatLoader) {
            this.splatLoader = new SplatLoader(this.app);
        }
        await this.splatLoader.load({ url, position, scale });
    }

    /**
     * 获取splat加载器
     */
    getSplatLoader(): SplatLoader | null {
        return this.splatLoader;
    }
}
