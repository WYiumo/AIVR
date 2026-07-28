import * as pc from 'playcanvas';
import { Scene } from './app/scene';
import { VrManager } from './manager/vr-manager';
import { AssetManager } from './manager/assetLoader';
import { FontManager } from './manager/font';
import { PlayerController } from './entities/playerController';
import { InteractionManager } from './manager/interaction';
import { initstartPage } from './ui/start-page';
import { VoicePanel } from './ui/voice-panel';
import { ToolsWheel } from './ui/tools-wheel';
import { ObjectPanel } from './ui/object-panel';
import { XrInputDetector } from './app/xrInput-detector';
import { ObjectIpulationProxy } from './app/objectIpulation-proxy';
import { ASRHandler } from './app/asr-handler';

interface AppConfig {
    /** 是否显示调试信息 */
    debug: boolean;
}
const defaultConfig: AppConfig = {
    debug: true
};

/**
 * 应用类
 * 负责初始化 PlayCanvas 应用、场景、VR 资源。
 */
export class App {
    private app: pc.Application;
    private scene: Scene;
    private vrManager: VrManager;
    private assetManager: AssetManager;
    private fontManager: FontManager;
    private playerController: PlayerController;
    private asrHander: ASRHandler
    private config: AppConfig;

    // VR 会话期对象
    private xrInputDetector: XrInputDetector | null = null;
    private objectProxy: ObjectIpulationProxy | null = null;
    private interaction: InteractionManager | null = null;
    private toolsWheel: ToolsWheel | null = null;
    private voicePanel: VoicePanel | null = null;
    private objectPanel: ObjectPanel | null = null;

    constructor(app: pc.Application, config: Partial<AppConfig> = {}) {
        this.app = app;
        this.config = { ...defaultConfig, ...config };
        this.scene = new Scene(app);
        this.vrManager = new VrManager(app);
        this.assetManager = new AssetManager(app);
        this.fontManager = FontManager.getInstance(app);
        this.playerController = new PlayerController(app);
        this.asrHander = new ASRHandler(app);
    }

    /**
     * 初始化应用
     */
    async init(): Promise<void> {
        if (this.config.debug) console.log('AIVR App 初始化中...');

        await this.assetManager.loadInitAsset();
        this.fontManager.init();
        this.scene.init();

        const world = new pc.Entity('world');
        this.app.root.addChild(world);
        world.setLocalPosition(0, 0, 0);

        this.toolsWheel = new ToolsWheel(this.app);
        this.voicePanel = new VoicePanel(this.app);
        this.objectPanel = new ObjectPanel(this.app);

        this.playerController.init();
        this.setupVrEvents();

        // 测试注释
        // await this.asrHander.init();

        initstartPage(this.vrManager, this.playerController.getCamera() as pc.Entity);

        if (this.config.debug) console.log('AIVR App 初始化完成');
    }

    private setupVrEvents(): void {
        this.app.on('sessionstart', () => this.onVrStart());
        this.app.on('sessionend', () => this.onVrEnd());
    }

    private onVrStart(): void {
        if (this.config.debug) {
            console.log('VR会话已开始');
        }

        this.xrInputDetector = new XrInputDetector(this.app);
        this.objectProxy = new ObjectIpulationProxy(this.app);

        this.interaction = new InteractionManager(this.app, this.playerController,
            this.objectProxy,
            this.toolsWheel as ToolsWheel,
            this.voicePanel as VoicePanel,
            this.objectPanel as ObjectPanel);
        this.interaction.init();

        // 测试
        this.app.fire('voice:sendResult', 'test');

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

        const vrBtn = document.getElementById('vr-button');
        if (vrBtn) vrBtn.style.display = 'block';
    }

    // 每帧更新
    update(dt: number): void {
        this.xrInputDetector?.update(dt);
        this.objectProxy?.update(dt);
        this.playerController.update(dt);
    }
}
