import * as pc from 'playcanvas';

/**
 * 字体管理器（单例模式）
 * 统一管理应用中所有字体的加载和缓存
 */
class FontManager {
    private static instance: FontManager;
    private fonts: Map<string, pc.CanvasFont> = new Map();
    private app: pc.Application | null = null;
    private loadingFonts: Map<string, Promise<pc.CanvasFont>> = new Map();
    private defaultSampleText: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .:,/?!@#$%^&*()_+-=';
    private sampleTextUrl: string = 'assets/font/3500_symbols.txt';

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
            throw new Error('FontManager 未初始化，请先传入 app 实例');
        }
        return FontManager.instance;
    }

    /**
     * 检查是否已初始化
     */
    static isInitialized(): boolean {
        return FontManager.instance !== null;
    }

    /**
     * 加载字体
     */
    async loadFont(name: string, fontUrl: string): Promise<pc.CanvasFont> {
        if (!this.app) {
            throw new Error('FontManager 未初始化');
        }

        // 返回已加载的字体
        if (this.fonts.has(name)) {
            return this.fonts.get(name)!;
        }

        // 防止重复加载
        if (this.loadingFonts.has(name)) {
            return this.loadingFonts.get(name)!;
        }

        // 加载字体
        const loadPromise = this.doLoadFont(name, fontUrl);
        this.loadingFonts.set(name, loadPromise);
        return loadPromise;
    }

    /**
     * 执行字体加载
     */
    private async doLoadFont(name: string, fontUrl: string): Promise<pc.CanvasFont> {
        if (!this.app) {
            throw new Error('FontManager 未初始化');
        }

        // 加载字体文件到浏览器
        await this.loadFontFace(name, fontUrl);

        // 尝试加载常用字符集
        let sampleText = this.defaultSampleText;
        try {
            const response = await fetch(this.sampleTextUrl);
            if (response.ok) {
                sampleText = await response.text();
            }
        } catch (e) {
            console.warn('无法加载字符集文件，使用默认字符集');
        }

        // 创建 CanvasFont，使用已加载的字体名称
        const font = new pc.CanvasFont(this.app, {
            fontName: name,  // CSS 字体名称
            fontSize: 32     // 必须指定字体大小
        });

        // 生成纹理图集
        font.createTextures(sampleText);

        this.fonts.set(name, font);
        this.loadingFonts.delete(name);
        return font;
    }

    /**
     * 加载字体到浏览器
     */
    private loadFontFace(name: string, fontUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const fontFace = new FontFace(name, `url(${fontUrl})`);
            fontFace.load().then(() => {
                document.fonts.add(fontFace);
                resolve();
            }).catch(reject);
        });
    }

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

    /**
     * 获取所有已加载的字体
     */
    getAllFonts(): Map<string, pc.CanvasFont> {
        return this.fonts;
    }
}

export { FontManager };