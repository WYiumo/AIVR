import * as pc from 'playcanvas';

export class AssetManager {
    private app: pc.Application;
    private assets: pc.Asset[] = [];

    constructor(app: pc.Application) {
        this.app = app;
    }

    private createDefaultAssets(): void {
        this.assets = [
            new pc.Asset('leftController', 'container', {url: 'assets/models/meta_quest_touch/left.glb'}),
            new pc.Asset('rightController', 'container', {url: 'assets/models/meta_quest_touch/right.glb'}),
            new pc.Asset('cubemap:skybox', 'cubemap', {url: 'assets/cubemap/helipad-env-atlas.png'}),
            new pc.Asset('texture:toolsWheel', 'texture', {url: 'assets/textures/tools_wheel.png'}),
            new pc.Asset('texture:wheel_Checkbox', 'texture', {url: 'assets/textures/wheel_Checkbox.png'}),
            new pc.Asset('texture:voice_panel', 'texture', {url: 'assets/textures/voice_panel.png'}),
            new pc.Asset('texture:voice_button', 'texture', {url: 'assets/textures/voice_button.png'}),
            new pc.Asset('texture:voice_status_bar', 'texture', {url: 'assets/textures/voice_status_bar.png'}),
            new pc.Asset('texture:voice_text_line', 'texture', {url: 'assets/textures/voice_text_line.png'}),
            new pc.Asset('texture:object_control_panel', 'texture', {url: 'assets/textures/object_control_panel.png'}),
            new pc.Asset('texture:object_control_checkbox', 'texture', {url: 'assets/textures/object_control_checkbox.png'}),
            new pc.Asset('material:metal', 'material', {url: 'assets/materials/metal.json'}),
            new pc.Asset('text:fontSample', 'text', {url: 'assets/font/3500_symbols.txt'})
        ];
    }

    async loadInitAsset(): Promise<void> {
        this.createDefaultAssets();
        return new Promise((resolve, reject) => {
            if (!this.app) {
                reject(new Error('AssetManager: app instance not provided'));
                return;
            }
            const loader = new pc.AssetListLoader(this.assets, this.app.assets);
            loader.load((err: Error) => {
                if (err) {
                    console.error('Asset加载失败:', err);
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
}