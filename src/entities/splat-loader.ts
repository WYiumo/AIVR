import * as pc from 'playcanvas';

/**
 * Splat加载配置
 */
export interface SplatLoaderConfig {
    /** PLY文件URL */
    url: string;
    /** 位置 */
    position?: pc.Vec3;
    /** 缩放 */
    scale?: pc.Vec3;
}

/**
 * Splat加载器
 * 负责加载和渲染Gaussian Splatting (.ply) 文件
 */
export class SplatLoader {
    private app: pc.Application;
    private asset: pc.Asset | null = null;
    private entity: pc.Entity | null = null;

    constructor(app: pc.Application) {
        this.app = app;
    }

    /**
     * 加载splat文件
     * 使用PlayCanvas推荐的AssetListLoader模式
     */
    async load(config: SplatLoaderConfig): Promise<pc.Entity> {
        const { url, position, scale } = config;

        return new Promise((resolve, reject) => {
            // 1. 创建gsplat asset
            this.asset = new pc.Asset(
                'splat-' + Date.now(),
                'gsplat',
                { url: url }
            );
            // this.app.assets.add(this.asset);

            // 2. 使用AssetListLoader加载资源
            const assetListLoader = new pc.AssetListLoader([this.asset], this.app.assets);
            assetListLoader.load((err: Error) => {
                if (err) {
                    console.error('Splat加载失败:', err);
                    reject(err);
                    return;
                }

                // 3. 创建entity并添加gsplat组件
                this.entity = new pc.Entity('splat');
                this.entity.addComponent('gsplat', {
                    asset: this.asset,
                    unified: true  // 启用统一渲染
                });

                // 4. 设置位置和缩放
                if (position) {
                    this.entity.setPosition(position);
                }
                if (scale) {
                    this.entity.setLocalScale(scale);
                }

                this.app.root.addChild(this.entity);
                console.log('Splat加载成功:', url);
                resolve(this.entity);
            });
        });
    }

    /**
     * 获取已加载的实体
     */
    getEntity(): pc.Entity | null {
        return this.entity;
    }

    /**
     * 销毁splat
     */
    destroy(): void {
        if (this.entity) {
            this.entity.destroy();
            this.entity = null;
        }
        if (this.asset) {
            this.app.assets.remove(this.asset);
            this.asset = null;
        }
    }
}
