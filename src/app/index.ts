import * as pc from 'playcanvas';
import { Scene } from './scene';
import { VrManager } from './vr-manager';
import { AssetManager } from './asset-manager';
import { FontManager } from './font-manager';
import { VrController } from '../entities/controller';
import { SplatLoader } from '../entities/splat-loader';
import { InteractionManager } from '../interaction/interaction-manager';
import { Grabbable } from '../interaction/grabbable';
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
 * 负责初始化 PlayCanvas 应用、场景、VR 资源、加载模型。
 * 交互（拾取/抓取/旋转）委托给 InteractionManager。
 */
export class App {
    private app: pc.Application;
    private scene: Scene;
    private vrManager: VrManager;
    private assetManager: AssetManager;
    private config: AppConfig;

    // VR 会话期对象
    private vrController: VrController | null = null;
    private voicePanel: VrVoicePanel | null = null;
    private interaction: InteractionManager | null = null;
    private splatLoader: SplatLoader | null = null;

    // 模型加载配置
    private readonly DEFAULT_MODEL_URL = '/avocado_chair.ply';
    private readonly MODEL_DISTANCE = 1.5;  // 相机前方米数

    constructor(app: pc.Application, config: Partial<AppConfig> = {}) {
        this.app = app;
        this.config = { ...defaultConfig, ...config };
        this.vrManager = new VrManager(app);
        this.assetManager = new AssetManager(app);
        this.scene = new Scene(app);
    }

    /**
     * 初始化应用
     */
    async init(): Promise<void> {
        if (this.config.debug) {
            console.log('AIVR App 初始化中...');
        }

        await this.assetManager.loadInitAsset();
        await this.scene.init();

        this.createCamera();
        createVrButton(this.vrManager, this.app.root.findByName('Camera') as pc.Entity);

        await this.initFonts();
        this.setupVrEvents();

        if (this.config.debug) {
            console.log('AIVR App 初始化完成');
        }
    }

    private async initFonts(): Promise<void> {
        const fontManager = FontManager.getInstance(this.app);
        await fontManager.loadFont('SimHei', 'assets/font/SimHei.ttf');
        if (this.config.debug) {
            console.log('字体加载完成');
        }
    }

    private createCamera(): void {
        const camera = new pc.Entity('Camera');
        camera.addComponent('camera', {
            clearColor: this.scene.config.backgroundColor,
            fov: 60,
            nearClip: 0.1,
            farClip: 1000
        });
        this.scene.setCamera(camera);
        this.scene.addEntity(camera);
    }

    private setupVrEvents(): void {
        this.vrManager.on('sessionstart', () => this.onVrStart());
        this.vrManager.on('sessionend', () => this.onVrEnd());
    }

    private onVrStart(): void {
        if (this.config.debug) {
            console.log('VR会话已开始');
        }

        this.vrController = new VrController(this.app);
        this.interaction = new InteractionManager(this.app, this.vrController);

        this.voicePanel = new VrVoicePanel(this.app, this.scene, {
            onStartRecording: () => this.voicePanel?.getASRHandler()?.startRecording(),
            onStopRecording: () => this.voicePanel?.getASRHandler()?.stopRecording(),
            onClear: () => this.voicePanel?.getASRHandler()?.clearResults(),
            onResult: (result) => {
                if (this.config.debug) {
                    console.log('语音识别结果:', result.text);
                }
                this.loadModelInFrontOfCamera();
            }
        });

        // Y 按钮 - 切换语音面板显示/隐藏
        this.vrController?.setYButtonCallback(() => this.voicePanel?.toggleVisibility());

        this.voicePanel.initASR();

        const vrBtn = document.getElementById('vr-button');
        if (vrBtn) vrBtn.style.display = 'none';
    }

    private onVrEnd(): void {
        if (this.config.debug) {
            console.log('VR会话已结束');
        }

        this.interaction?.destroy();
        this.interaction = null;

        this.voicePanel?.destroy();
        this.voicePanel = null;

        this.vrController?.destroy();
        this.vrController = null;

        this.splatLoader?.destroy();
        this.splatLoader = null;

        const vrBtn = document.getElementById('vr-button');
        if (vrBtn) vrBtn.style.display = 'block';
    }

    /**
     * 每帧更新
     */
    update(dt: number): void {
        this.vrController?.update(dt);
        this.interaction?.update(dt);
        this.scene.update(dt);
    }

    /**
     * 加载 3D 模型到相机前方
     */
    private async loadModelInFrontOfCamera(): Promise<void> {
        const camera = this.scene.getCamera();
        if (!camera) return;

        const camPos = camera.getPosition();
        const forward = camera.forward;
        const pos = new pc.Vec3().copy(camPos).add(forward.mulScalar(this.MODEL_DISTANCE));
        pos.y -= 0.2;

        if (!this.splatLoader) {
            this.splatLoader = new SplatLoader(this.app);
        }

        // 销毁已有模型（如有）
        if (this.splatLoader.getEntity()) {
            // 释放正在抓取的物体
            this.interaction?.manipulator.endHold();
            this.splatLoader.destroy();
        }

        try {
            const entity = await this.splatLoader.load({
                url: this.DEFAULT_MODEL_URL,
                position: pos,
                scale: new pc.Vec3(1, 1, 1)
            });
            // 注册为可抓取（XRPicker 才能拾取）
            if (this.interaction) {
                new Grabbable(entity, this.interaction.registry);
                if (this.config.debug) {
                    console.log('[App] 模型已注册为 grabbable, registry size:', this.interaction.registry.size);
                }
            }
            this.voicePanel?.setStatus('State: Model loaded');
        } catch (e) {
            console.error('模型加载失败:', e);
            this.voicePanel?.setStatus('State: Load failed');
        }
    }

    getApp(): pc.Application { return this.app; }
    getScene(): Scene { return this.scene; }
    getVrManager(): VrManager { return this.vrManager; }
    getInteractionManager(): InteractionManager | null { return this.interaction; }

    /**
     * 加载 splat 文件（公开 API）
     */
    async loadSplat(url: string, position?: pc.Vec3, scale?: pc.Vec3): Promise<void> {
        if (!this.splatLoader) {
            this.splatLoader = new SplatLoader(this.app);
        }
        await this.splatLoader.load({ url, position, scale });
    }

    getSplatLoader(): SplatLoader | null { return this.splatLoader; }
}
