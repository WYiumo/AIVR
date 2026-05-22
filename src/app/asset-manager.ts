import * as pc from 'playcanvas';

export class AssetManager {
    private app: pc.Application;
    private assets: pc.Asset[] = [];

    constructor(app: pc.Application) {
        this.app = app;
        this.createAsset();
    }

    private createAsset(): void {
        this.assets = [
            new pc.Asset('leftController', 'container', {url: 'assets/meta_quest_touch/left.glb'}),
            new pc.Asset('rightController', 'container', {url: 'assets/meta_quest_touch/right.glb'}),
            new pc.Asset('skybox', 'cubemap', {url: 'assets/cubemap/helipad-env-atlas.png'}),
            new pc.Asset('metal', 'material', {url: 'assets/materials/metal.json'}),
        ];
    }

    async loadAsset(): Promise<void> {
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