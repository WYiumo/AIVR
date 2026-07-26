import * as pc from 'playcanvas';
import { ASRHandler } from '../app/asr-handler';
import { FontManager } from '../manager/font';

/**
 * VR 语音面板组件
 * 在 VR 空间内显示 3D UI 界面，用于语音输入控制
 *
 * 使用 LayoutGroup 实现自动布局
 */
export class VoicePanel {
    private app: pc.Application;
    private screenEntity: pc.Entity;
    private asrHandler: ASRHandler | null = null;

    // UI 元素
    private buttons: Map<string, pc.Entity> = new Map();
    private resultTextEntity: pc.Entity | null = null;
    private statusTextEntity: pc.Entity | null = null;

    // 状态
    private isRecording: boolean = false;
    private currentResult: string = '';

    // 面板尺寸 (UI pixels)
    private Width = 300;
    private Height = 200;

    private font: pc.CanvasFont | undefined = undefined;
    private fontManager: FontManager | undefined = undefined;

    constructor(app: pc.Application) {
        this.app = app;
        this.screenEntity = new pc.Entity('VrVoicePanel');
        this.fontManager = FontManager.getInstance();
        this.font = this.fontManager.getFont('SimHei');
        this.createPanel();

        this.app.on('voice:upResult', (text: string) => {
            this.appendResultText(text);
        });
        this.app.on('voice:error', (error: Error) => {
            console.error('[VrVoicePanel] ASR Error:', error);
            this.setStatus('Error: ' + error.message);
        });
        this.app.on('voice:upStatus', (status: string) => {
            this.setStatus(status);
        });

        this.updateButtonStates();

        // 默认隐藏
        this.screenEntity.enabled = false;
    }

    /**
     * 创建语音面板
     */
    private createPanel(): void {
        // 添加 screen 组件 (world-space UI)
        this.screenEntity.addComponent('screen', {
            resolution: new pc.Vec2(this.Width, this.Height),
            screenSpace: false
        });

        // 设置面板尺寸
        this.screenEntity.setLocalScale(0.003, 0.003, 1);

        // 创建主容器（垂直布局）
        this.createMainContainer();

        // 添加到场景
        this.app.root.addChild(this.screenEntity);
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
            padding: new pc.Vec4(10, 10, 10, 20),
            spacing: new pc.Vec2(0, 0),
            widthFitting: pc.FITTING_NONE,
            heightFitting: pc.FITTING_NONE,
        });

        // 设置容器尺寸
        container.addComponent('element', {
            type: 'image',
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),  // 填满父容器
            pivot: new pc.Vec2(0.5, 0.5),
            width: this.Width,
            height: this.Height,
            texture: this.app.assets.find('texture:voice_panel')?.resource
        });


        // 创建状态栏
        this.createStatusArea(container);

        // 创建结果区域
        this.createResultArea(container);

        // 创建按钮行
        this.createButtonsRow(container);

        this.screenEntity.addChild(container);
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
        });

        // 添加 LayoutChildComponent
        buttonRow.addComponent('layoutchild', {
            minWidth: 300,
            minHeight: 80,
            maxWidth: this.Width / 1.2,
            maxHeight: this.Height / 3
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
        });

        // 元素组件
        button.addComponent('element', {
            type: 'image',
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
            pivot: new pc.Vec2(0.5, 0.5),
            width: (205 * this.Width) / 1024,
            height: (140 * this.Height) / 683,
            texture: this.app.assets.find('texture:voice_button')?.resource,
            useInput: true,
        });

        // 按钮组件
        button.addComponent('button', {
            active: false,
            transitionMode: pc.BUTTON_TRANSITION_MODE_TINT,
            hoverTint: new pc.Color(0.4, 0.6, 1.0, 0.9),
            pressedTint: new pc.Color(0.1, 0.3, 0.7, 0.9),
            inactiveTint: new pc.Color(0.2, 0.4, 0.8, 0.2)
        });

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
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
            pivot: new pc.Vec2(0.5, 0.5),
            fontSize: 12,
            color: new pc.Color(1, 1, 1, 1),
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
        const resultBg = new pc.Entity('TextLine');
        resultBg.addComponent('element', {
            type: 'image',
            anchor: new pc.Vec4(0.5, 0, 0.5, 0),
            pivot: new pc.Vec2(0.5, 0),
            width: (700 * this.Width) / 1024,
            height: (10 * this.Height) / 683,
            texture: this.app.assets.find('texture:voice_text_line')?.resource,
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
            color: new pc.Color(0.5, 0.4, 0.8, 1),
            wrapLines: true,
            maxLines: 2,
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
        const statusBar = new pc.Entity('StatusBar');
        statusBar.addComponent('layoutchild', {
            minWidth: (400 * this.Width) / 1024,
            minHeight: (100 * this.Height) / 683,
            maxWidth: 400,
            maxHeight: 100
        });

        statusBar.addComponent('element', {
            type: 'image',
            anchor: new pc.Vec4(0.5, 0, 0.5, 0),
            pivot: new pc.Vec2(0.5, 0.5),
            width: (400 * this.Width) / 1024,
            height: (100 * this.Height) / 683,
            texture: this.app.assets.find('texture:voice_status_bar')?.resource,
        })

        this.statusTextEntity.addComponent('element', {
            type: 'text',
            font: this.font,
            text: 'State: Ready',
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
            pivot: new pc.Vec2(0.5, 0.5),
            width: 40,
            height: 20,
            fontSize: 10,
            color: new pc.Color(0.5, 0.4, 0.8, 1),
        });

        statusBar.addChild(this.statusTextEntity);
        parent.addChild(statusBar);
    }

    getScreenEntity(): pc.Entity {
        return this.screenEntity;
    }

    changeScreenEnable(): void {
        this.screenEntity.enabled = !this.screenEntity.enabled;
    }

    isScreenEnable(): boolean {
        return this.screenEntity.enabled;
    }

    private onStartClick(): void {
        console.log('button start clicked');
        if (this.isRecording) return;

        this.isRecording = true;
        this.app.fire('voice:startRecording');
        this.setStatus('State: Recording...');
        this.setResultText('');
        this.updateButtonStates();
    }

    private onStopClick(): void {
        console.log('button stop clicked');
        if (!this.isRecording) return;

        this.isRecording = false;
        this.app.fire('voice:stopRecording');
        this.setStatus('State: Ready...');
        this.updateButtonStates();
    }

    private onClearClick(): void {
        console.log('button clear clicked');
        this.currentResult = '';
        this.setResultText('');
        this.app.fire('voice:clearResults');
    }

    private onSendClick(): void {
        console.log('button send clicked');
        if (this.currentResult) {
            this.app.fire('voice:sendResult', { text: this.currentResult });
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
        if (this.currentResult && this.currentResult !== 'Results will appear here...') {
            this.currentResult += '\n' + text;
        } else {
            this.currentResult = text;
        }
        this.setResultText(this.currentResult);
    }

    /**
     * 销毁
     */
    destroy(): void {
        this.asrHandler?.destroy();
        this.screenEntity.destroy();
    }
}