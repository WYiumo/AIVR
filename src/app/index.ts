import * as pc from 'playcanvas';
import { Scene } from './scene';
import { VrManager } from './vr-manager';
import { AssetManager } from './asset-manager';
import { FontManager } from './font-manager';
import { VrController } from '../entities/controller';
import { SplatLoader } from '../entities/splat-loader';
import { createVrButton } from '../ui/vr-button';
import { VrVoicePanel } from '../ui/vr-voice-panel';


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
    private assetManager: AssetManager;
    private vrController: VrController | null = null;
    private voicePanel: VrVoicePanel | null = null;
    private config: AppConfig;
    private splatLoader: SplatLoader | null = null;

    constructor(app: pc.Application, config: Partial<AppConfig> = {}) {
        this.app = app;
        this.config = { ...defaultConfig, ...config };
        this.vrManager = new VrManager(app);
        this.scene = new Scene(app, this.vrManager);
        this.assetManager = new AssetManager(app);
    }

    /**
     * 初始化应用
     */
    async init(): Promise<void> {
        if (this.config.debug) {
            console.log('AIVR App 初始化中...');
        }

        await this.assetManager.loadAsset();
        console.log(this.app.assets);

        await this.scene.init();
        
        // 创建相机
        this.createCamera();

        // 创建VR按钮
        createVrButton(this.vrManager, this.app.root.findByName('Camera') as pc.Entity);

        // 预加载字体
        await this.initFonts();

        // 设置VR事件监听
        this.setupVrEvents();

        if (this.config.debug) {
            console.log('AIVR App 初始化完成');
        }
    }

    /**
     * 初始化字体
     */
    private async initFonts(): Promise<void> {
        const fontManager = FontManager.getInstance(this.app);
        await fontManager.loadFont('SimHei', 'assets/font/SimHei.ttf');
        if (this.config.debug) {
            console.log('字体加载完成');
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
        // camera.lookAt(new pc.Vec3(0, 0, -1));

        this.scene.setCamera(camera);
        this.scene.addEntity(camera);

        if (this.config.debug) {
            console.log('相机已创建:', camera.getPosition());
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

        // 创建VR语音面板
        this.voicePanel = new VrVoicePanel(this.app, this.scene, {
            onStartRecording: () => {
                const handler = this.voicePanel?.getASRHandler();
                handler?.startRecording();
            },
            onStopRecording: () => {
                const handler = this.voicePanel?.getASRHandler();
                handler?.stopRecording();
            },
            onClear: () => {
                const handler = this.voicePanel?.getASRHandler();
                handler?.clearResults();
            },
            onResult: (result) => {
                if (this.config.debug) {
                    console.log('语音识别结果:', result.text);
                }
                // TODO: 处理语音命令
            }
        });

        // 设置语音面板 Y 按钮回调
        this.vrController?.setYButtonCallback(() => {
            console.log('Y按钮按下');
            this.voicePanel?.followTarget();
        });

        // 初始化 ASR
        // this.voicePanel.initASR();

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

        // 销毁VR语音面板
        if (this.voicePanel) {
            this.voicePanel.destroy();
            this.voicePanel = null;
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
