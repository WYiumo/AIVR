import * as pc from 'playcanvas';

/**
 * 字体管理器（单例模式）
 * 统一管理应用中所有字体的加载和缓存
 */
class FontManager {
    private static instance: FontManager;
    private fonts: Map<string, pc.CanvasFont> = new Map();
    private app: pc.Application;
    private defaultSampleText: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .:,/?!@#$%^&*()_+-=';

    private constructor(app: pc.Application) {
        this.app = app;
    }

    /**
     * 获取 FontManager 实例
     */
    static getInstance(app?: pc.Application): FontManager {
        if (!FontManager.instance && app) {
            FontManager.instance = new FontManager(app);
        }
        if (!FontManager.instance) {
            throw new Error('FontManager 尚未初始化，需先传入 app 实例');
        }
        return FontManager.instance;
    }

    /**
     * 检查是否已初始化
     */
    static isInitialized(): boolean {
        return FontManager.instance !== null;
    }
    
    init(): void {
        let sampleText = this.app.assets.find('text:fontSample')?.resource as string | undefined;

        const font = new pc.CanvasFont(this.app, {
            fontName: 'SimHei',  // CSS 字体名称
            fontSize: 32     // 必须指定字体大小
        });

        font.createTextures(sampleText || this.defaultSampleText);
        this.fonts.set('SimHei', font);
    }

    /**
     * 加载字体
     */
    loadFont(): void {}

    /**
     * 获取已加载的字体
     */
    getFont(name: string): pc.CanvasFont | undefined {
        return this.fonts.get(name);
    }

    /**
     * 更新字体纹理图集，添加新的字符
     * 用于动态文本（如中文语音识别结果）
     */
    updateFontTextures(name: string, text: string): void {
        const font = this.fonts.get(name);
        if (font) {
            font.updateTextures(text);
        }
    }

}

export { FontManager };