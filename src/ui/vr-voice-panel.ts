import * as pc from 'playcanvas';
import { Scene } from '../app/scene';
import { ASRHandler } from '../asr/asr-handler';
import type { ASRResult } from '../asr/asr-handler';
import { FontManager } from '../app/font-manager';

/**
 * VR 语音面板回调接口
 */
export interface VrVoicePanelCallbacks {
    onStartRecording?: () => void;
    onStopRecording?: () => void;
    onClear?: () => void;
    onResult?: (result: ASRResult) => void;
}

/**
 * VR 语音面板组件
 * 在 VR 空间内显示 3D UI 界面，用于语音输入控制
 *
 * 使用 LayoutGroup 实现自动布局
 */
export class VrVoicePanel {
    private app: pc.Application;
    private scene: Scene;
    private screenEntity: pc.Entity;
    private callbacks: VrVoicePanelCallbacks;
    private asrHandler: ASRHandler | null = null;

    // UI 元素
    private buttons: Map<string, pc.Entity> = new Map();
    private resultTextEntity: pc.Entity | null = null;
    private statusTextEntity: pc.Entity | null = null;

    // 状态
    private isRecording: boolean = false;
    private currentResult: string = '';

    // UI 缩放比例
    // private uiScale: number = 0.001; // 1 UI pixel = 0.001 meters

    // 面板尺寸 (UI pixels)
    private panelWidth = 400;
    private panelHeight = 300;

    private font: pc.CanvasFont | undefined = undefined;
    private fontManager: FontManager | undefined = undefined;

    constructor(app: pc.Application, scene: Scene, callbacks: VrVoicePanelCallbacks = {}) {
        this.app = app;
        this.scene = scene;
        this.callbacks = callbacks;
        this.screenEntity = new pc.Entity('VrVoicePanel');
        this.fontManager = FontManager.getInstance();
        this.font = this.fontManager.getFont('SimHei');
        this.createPanel();
    }

    /**
     * 创建语音面板
     */
    private createPanel(): void {
        // 添加 screen 组件 (world-space UI)
        this.screenEntity.addComponent('screen', {
            referenceResolution: new pc.Vec2(this.panelWidth, this.panelHeight),
            screenSpace: false, // 关键：world-space UI
            scaleBlend: 1,
            scaleMode: pc.SCALEMODE_BLEND,
            resolutionMode: pc.RESOLUTION_FIXED
        });

        // 设置面板尺寸 (meters)
        this.screenEntity.setLocalScale(0.005, 0.005, 1);

        // 创建主容器（垂直布局）
        this.createMainContainer();

        // 添加到场景
        this.scene.addEntity(this.screenEntity);
    }

    /**
     * 创建主容器
     */
    private createMainContainer(): void {
        const container = new pc.Entity('MainContainer');

        // 添加 LayoutGroupComponent - 垂直布局
        container.addComponent('layoutgroup', {
            orientation: pc.ORIENTATION_VERTICAL,
            alignment: new pc.Vec2(0.5, 1),  // 左上对齐
            padding: new pc.Vec4(2, 2, 2, 2),
            spacing: new pc.Vec2(0, 1),
            widthFitting: pc.FITTING_STRETCH,
            heightFitting: pc.FITTING_NONE,
            wrap: false
        });

        // 设置容器尺寸
        container.addComponent('element', {
            type: 'image',
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),  // 填满父容器
            pivot: new pc.Vec2(0.5, 0.5),
            width: this.panelWidth,
            height: this.panelHeight,
            color: new pc.Color(1, 1, 1, 0.9),
            opacity: 0.9,
            useInput: false,
            layers: [this.getUILayer().id]
        });
        // console.log(this.getUILayer().id);
        // 创建标题
        this.createTitle(container);

        // // 创建按钮行
        this.createButtonsRow(container);

        // // 创建结果区域
        this.createResultArea(container);

        // // 创建状态文本
        this.createStatusArea(container);

        this.screenEntity.addChild(container);
    }

    /**
     * 创建标题
     */
    private createTitle(parent: pc.Entity): void {
        const title = new pc.Entity('PanelTitle');

        // 添加 LayoutChildComponent
        title.addComponent('layoutchild', {
            minWidth: 300,
            minHeight: 50,
            maxWidth: 400,
            maxHeight: 70
        });

        title.addComponent('element', {
            type: 'text',
            text: '语音助手',
            font: this.font,
            anchor: new pc.Vec4(0, 0, 1, 1),  // 填满父容器
            pivot: new pc.Vec2(0.5, 0.5),
            fontSize: 16,
            color: new pc.Color(0.5, 0.4, 0.8, 1),
            alignment: new pc.Vec2(0.5, 0.5),
            wrapLines: false,
            useInput: false,
            layers: [this.getUILayer().id]
        });

        parent.addChild(title);
    }

    /**
     * 创建按钮行（水平布局）
     */
    private createButtonsRow(parent: pc.Entity): void {
        const buttonRow = new pc.Entity('ButtonRow');

        buttonRow.addComponent('element', {
            type: 'group'
        });

        // 添加 LayoutGroupComponent - 水平布局
        buttonRow.addComponent('layoutgroup', {
            orientation: pc.ORIENTATION_HORIZONTAL,
            alignment: new pc.Vec2(0.5, 0.5),
            padding: new pc.Vec4(20, 0, 20, 0),
            spacing: new pc.Vec2(10, 0),
            widthFitting: pc.FITTING_STRETCH,
            heightFitting: pc.FITTING_STRETCH,
            wrap: false
        });

        // 添加 LayoutChildComponent
        buttonRow.addComponent('layoutchild', {
            minWidth: 300,
            minHeight: 80,
            maxWidth: 400,
            maxHeight: 100
        });

        // 创建按钮
        this.createButton(buttonRow, 'start', 'start', () => this.onStartClick());
        this.createButton(buttonRow, 'stop', 'stop', () => this.onStopClick());
        this.createButton(buttonRow, 'clear', 'clear', () => this.onClearClick());
        this.createButton(buttonRow, 'send', 'send', () => this.onSendClick());

        parent.addChild(buttonRow);
    }

    /**
     * 创建单个按钮
     */
    private createButton(parent: pc.Entity, id: string, label: string, action: () => void): void {
        const button = new pc.Entity(`VoiceButton_${id}`);

        // 添加 LayoutChildComponent
        button.addComponent('layoutchild', {
            minWidth: 45,
            minHeight: 20,
            maxWidth: 70,
            maxHeight: 40,
            fitWidthProportion: 1
        });

        // 元素组件
        button.addComponent('element', {
            type: 'image',
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
            pivot: new pc.Vec2(0.5, 0.5),
            width: 45,
            height: 20,
            color: new pc.Color(0.5, 0.4, 0.8, 1),
            opacity: 0.9,
            useInput: true,
            layers: [this.getUILayer().id]
        });

        // 按钮组件
        button.addComponent('button', {
            active: false,
            transitionMode: pc.BUTTON_TRANSITION_MODE_TINT,
            hoverTint: new pc.Color(0.4, 0.6, 1.0, 0.9),
            pressedTint: new pc.Color(0.1, 0.3, 0.7, 0.9),
            inactiveTint: new pc.Color(0.2, 0.4, 0.8, 0.2)
        });

        // 按钮点击事件（鼠标/触摸）
        button.button?.on('click', action);

        // XR 射线选择事件
        button.button?.on('selectstart', () => {
            console.log(`Button ${id} selected by XR`);
            action();
        });

        // 文本标签
        const text = new pc.Entity('ButtonText');
        text.addComponent('element', {
            type: 'text',
            text: label,
            font: this.font,
            anchor: new pc.Vec4(0, 0, 1, 1),
            pivot: new pc.Vec2(0.5, 0.5),
            margin: new pc.Vec4(1, 1, -1, -1),
            fontSize: 12,
            color: new pc.Color(1, 1, 1, 1),
            alignment: new pc.Vec2(0.5, 0.5),
            wrapLines: false,
            useInput: false,
            layers: [this.getUILayer().id]
        });
        button.addChild(text);

        parent.addChild(button);
        this.buttons.set(id, button);
    }

    /**
     * 创建结果区域
     */
    private createResultArea(parent: pc.Entity): void {
        const resultArea = new pc.Entity('ResultArea');

        // 添加 LayoutChildComponent
        resultArea.addComponent('element', {
            type: 'group'
        });
        resultArea.addComponent('layoutchild', {
            minWidth: 300,
            minHeight: 80,
            maxWidth: 120,
            maxHeight: 140
        });

        // 结果背景
        const resultBg = new pc.Entity('ResultBackground');
        resultBg.addComponent('element', {
            type: 'image',
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
            pivot: new pc.Vec2(0.5, 0.5),
            width: 300,
            height: 80,
            color: new pc.Color(0.5, 0.4, 0.8, 1),
            opacity: 0.9,
            useInput: false,
            layers: [this.getUILayer().id]
        });
        resultArea.addChild(resultBg);

        // 结果文本
        this.resultTextEntity = new pc.Entity('ResultText');
        this.resultTextEntity.addComponent('element', {
            type: 'text',
            font: this.font,
            text: 'Results will appear here...',
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
            pivot: new pc.Vec2(0.5, 0.5),
            width: 280,
            height: 60,
            fontSize: 10,
            color: new pc.Color(0.8, 0.8, 0.8, 1),
            alignment: new pc.Vec2(0, 0),
            wrapLines: true,
            useInput: false,
            layers: [this.getUILayer().id]
        });
        resultArea.addChild(this.resultTextEntity);

        parent.addChild(resultArea);
    }

    /**
     * 创建状态文本
     */
    private createStatusArea(parent: pc.Entity): void {
        this.statusTextEntity = new pc.Entity('StatusText');

        // 添加 LayoutChildComponent
        this.statusTextEntity.addComponent('layoutchild', {
            minWidth: 300,
            minHeight: 40,
            maxWidth: 400,
            maxHeight: 100
        });

        this.statusTextEntity.addComponent('element', {
            type: 'text',
            font: this.font,
            text: 'State: Empty',
            anchor: new pc.Vec4(0.5, 0, 0.5, 0),
            pivot: new pc.Vec2(0.5, 0.5),
            width: 40,
            height: 20,
            fontSize: 10,
            color: new pc.Color(0.5, 0.4, 0.8, 1),
            alignment: new pc.Vec2(0.5, 0.5),
            wrapLines: false,
            useInput: false,
            layers: [this.getUILayer().id]
        });

        parent.addChild(this.statusTextEntity);
    }

    /**
     * 获取 UI layer
     */
    private getUILayer(): pc.Layer {
        // 尝试获取 UI 层
        const layer = this.app.scene.layers.getLayerByName('UI');
        // console.log(layer);
        if (layer) return layer;

        // 尝试 LAYERID_UI
        const uiLayer = this.app.scene.layers.getLayerById(pc.LAYERID_UI);
        // console.log(uiLayer);
        if (uiLayer) return uiLayer;

        // 回退到 World 层
        return this.app.scene.layers.getLayerById(pc.LAYERID_WORLD)!;
    }

    /**
     * 设置面板位置
     */
    setPosition(position: pc.Vec3): void {
        this.screenEntity.setPosition(position);
    }

    /**
     * 设置面板朝向 (朝向相机)
     */
    lookAt(target: pc.Vec3): void {
        this.screenEntity.lookAt(target);
    }

    /**
     * 跟随目标
     */
    followTarget(): void {
        if (this.app.xr?.active) {
            // 获取 XR 相机的实际追踪数据
            const camera = this.scene.getCamera();
            if (camera) {
                const camPos = camera.getPosition();
                const forward = camera.forward;
                console.log('相机位置:', camPos, '相机朝向:', forward);

                // 放置在相机前方
                const panelPos = new pc.Vec3();
                panelPos.copy(camPos);
                panelPos.add(forward.mulScalar(1.2));
                console.log('面板位置:', panelPos);

                this.screenEntity.setPosition(panelPos);
                this.screenEntity.lookAt(camPos);
                // 旋转180度，面板朝向相机
                this.screenEntity.rotateLocal(-7.5, 180, 0);
            }
        }
    }

    /**
     * 开始按钮点击
     */
    private onStartClick(): void {
        console.log('button start clicked');
        if (this.isRecording) return;

        this.isRecording = true;
        this.callbacks.onStartRecording?.();
        this.setStatus('State: Recording...');
        this.setResultText('');
        this.updateButtonStates();
    }

    /**
     * 停止按钮点击
     */
    private onStopClick(): void {
        console.log('button stop clicked');
        if (!this.isRecording) return;

        this.isRecording = false;
        this.callbacks.onStopRecording?.();
        this.setStatus('State: Ready...');
        this.updateButtonStates();
    }

    /**
     * 清空按钮点击
     */
    private onClearClick(): void {
        console.log('button clear clicked');
        this.currentResult = '';
        this.setResultText('');
        this.callbacks.onClear?.();
    }

    private onSendClick(): void {
        console.log('button send clicked');
        if (this.currentResult) {
            this.callbacks.onResult?.({ text: this.currentResult });
            this.currentResult = '';
            this.setResultText('');
        }
    }

    /**
     * 更新按钮状态
     */
    private updateButtonStates(): void {
        const startBtn = this.buttons.get('start');
        const stopBtn = this.buttons.get('stop');
        const clearBtn = this.buttons.get('clear');
        const sendBtn = this.buttons.get('send');

        if (startBtn && startBtn.button) {
            startBtn.button.active = !this.isRecording;
        }
        if (stopBtn && stopBtn.button) {
            stopBtn.button.active = this.isRecording;
        }
        if (clearBtn && clearBtn.button) {
            clearBtn.button.active = true;
        }
        if (sendBtn && sendBtn.button) {
            sendBtn.button.active = this.currentResult !== '';
        }
    }

    /**
     * 设置状态文本
     */
    setStatus(status: string): void {
        if (this.statusTextEntity && this.statusTextEntity.element) {
            this.statusTextEntity.element.text = status;
        }
    }

    /**
     * 设置结果文本
     */
    setResultText(text: string): void {
        if (this.resultTextEntity && this.resultTextEntity.element) {
            if (!text) {
                text = 'Results will appear here...';
            }
            // 更新字体纹理图集以包含新字符
            this.fontManager?.updateFontTextures('SimHei', text);
            this.resultTextEntity.element.text = text;
            this.currentResult = text;
        }
    }

    /**
     * 追加结果文本
     */
    appendResultText(text: string): void {
        if (this.resultTextEntity && this.resultTextEntity.element) {
            if (this.currentResult && this.currentResult !== 'Results will appear here...') {
                this.currentResult += '\n' + text;
            } else {
                this.currentResult = text;
            }
            // 更新字体纹理图集以包含新字符
            this.fontManager?.updateFontTextures('SimHei', this.currentResult);
            this.resultTextEntity.element.text = this.currentResult;
        }
    }

    /**
     * 初始化 ASR 处理器
     */
    initASR(): void {
        this.asrHandler = new ASRHandler({
            onResult: (result) => {
                this.appendResultText(result.text);
                this.callbacks.onResult?.(result);
            },
            onError: (error) => {
                console.error('[VrVoicePanel] ASR Error:', error);
                this.setStatus('Error: ' + error.message);
            },
            onStatusChange: (status) => {
                this.setStatus(status);
            },
            onReady: () => {
                this.setStatus('ASR Ready');
            }
        });
        this.updateButtonStates();
        this.asrHandler.init();
    }

    /**
     * 获取 ASR 处理器
     */
    getASRHandler(): ASRHandler | null {
        return this.asrHandler;
    }

    /**
     * 开始录音
     */
    startRecording(): void {
        this.onStartClick();
        this.asrHandler?.startRecording();
    }

    /**
     * 停止录音
     */
    stopRecording(): void {
        this.onStopClick();
        this.asrHandler?.stopRecording();
    }

    /**
     * 清空结果
     */
    clearResults(): void {
        this.onClearClick();
        this.asrHandler?.clearResults();
    }

    /**
     * 销毁
     */
    destroy(): void {
        this.asrHandler?.destroy();
        this.screenEntity.destroy();
    }
}