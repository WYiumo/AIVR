/**
 * ASR 处理器模块
 * 负责与 ASR iframe 通信，管理语音识别状态
 */

export interface ASRResult {
    text: string;
    metadata?: {
        mode: string;
        is_final: boolean;
        engine: string;
        timestamp?: number;
    };
}

export interface ASRHandlerCallbacks {
    onResult?: (result: ASRResult) => void;
    onError?: (error: Error) => void;
    onStatusChange?: (status: string) => void;
    onEngineChange?: (engine: string) => void;
    onReady?: () => void;
}

export class ASRHandler {
    private iframe: HTMLIFrameElement | null = null;
    private callbacks: ASRHandlerCallbacks;
    private isReady: boolean = false;
    private pendingCommands: string[] = [];

    constructor(callbacks: ASRHandlerCallbacks = {}) {
        this.callbacks = callbacks;
        this.setupMessageListener();
    }

    /**
     * 初始化 ASR iframe
     */
    init(iframeSrc: string = '/asr/index02.html'): void {
        // 创建 iframe
        this.iframe = document.createElement('iframe');
        this.iframe.src = iframeSrc;
        this.iframe.style.display = 'none';
        this.iframe.style.width = '0';
        this.iframe.style.height = '0';
        this.iframe.style.border = 'none';
        this.iframe.id = 'asr-iframe';

        document.body.appendChild(this.iframe);

        // 监听 iframe 加载完成
        this.iframe.onload = () => {
            console.log('[ASRHandler] ASR iframe loaded');
            this.isReady = true;
            this.callbacks.onReady?.();
            this.flushPendingCommands();
        };
    }

    /**
     * 设置消息监听
     */
    private setupMessageListener(): void {
        window.addEventListener('message', (event) => {
            // 只处理来自 ASR iframe 的消息
            if (event.source !== this.iframe?.contentWindow) {
                return;
            }

            const data = event.data;
            if (!data || !data.type) return;

            switch (data.type) {
                case 'asr_result':
                    this.callbacks.onResult?.({
                        text: data.text,
                        metadata: data.metadata
                    });
                    break;

                case 'asr_session_request':
                    // 响应 session 请求
                    this.iframe?.contentWindow?.postMessage({
                        type: 'session_update',
                        sessionId: Date.now().toString()
                    }, '*');
                    break;

                case 'asr_status':
                    this.callbacks.onStatusChange?.(data.status);
                    break;

                case 'asr_engine_change':
                    this.callbacks.onEngineChange?.(data.engine);
                    break;

                case 'asr_error':
                    this.callbacks.onError?.(new Error(data.message));
                    break;
            }
        });
    }

    /**
     * 发送命令到 ASR iframe
     */
    private sendCommand(command: string, data?: any): void {
        const message = {
            type: 'vr_command',
            command: command,
            ...data
        };

        if (this.isReady && this.iframe?.contentWindow) {
            this.iframe.contentWindow.postMessage(message, '*');
        } else {
            console.log('[ASRHandler] Not ready, queuing command:', command);
            this.pendingCommands.push(command);
        }
    }

    /**
     * 清空待处理的命令
     */
    private flushPendingCommands(): void {
        while (this.pendingCommands.length > 0) {
            const cmd = this.pendingCommands.shift();
            if (cmd) {
                this.sendCommand(cmd);
            }
        }
    }

    /**
     * 开始录音
     */
    startRecording(): void {
        this.sendCommand('start');
    }

    /**
     * 停止录音
     */
    stopRecording(): void {
        this.sendCommand('stop');
    }

    /**
     * 清空结果
     */
    clearResults(): void {
        this.sendCommand('clear');
    }

    /**
     * 切换 ASR 引擎
     */
    switchEngine(engine: 'sherpa' | 'funasr' | 'webspeech'): void {
        this.sendCommand('switch_engine', { engine });
    }

    /**
     * 设置语言
     */
    setLanguage(lang: string): void {
        this.sendCommand('set_language', { lang });
    }

    /**
     * 获取是否就绪
     */
    getIsReady(): boolean {
        return this.isReady;
    }

    /**
     * 销毁
     */
    destroy(): void {
        if (this.iframe) {
            document.body.removeChild(this.iframe);
            this.iframe = null;
        }
        this.isReady = false;
    }
}
