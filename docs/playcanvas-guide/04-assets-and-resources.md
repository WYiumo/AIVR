# 04 - 资源管理

## 概述

PlayCanvas 的资源管理系统负责加载、缓存和管理所有外部资源（纹理、模型、材质、音频、字体等）。核心类是 `Asset`、`AssetRegistry` 和 `AssetListLoader`。

## Asset（资源）

### 创建 Asset

```typescript
// 创建 Container 型 Asset（GLB/GLTF 模型）
const controllerAsset = new pc.Asset(
    'leftController',       // 资源名（唯一标识）
    'container',            // 资源类型
    { url: 'assets/meta_quest_touch/left.glb' }  // 文件 URL
);

// 创建 Cubemap 型 Asset
const skyboxAsset = new pc.Asset(
    'skybox',
    'cubemap',
    { url: 'assets/cubemap/helipad-env-atlas.png' }
);

// 创建 Material 型 Asset
const materialAsset = new pc.Asset(
    'metal',
    'material',
    { url: 'assets/materials/metal.json' }
);

// 创建 Texture 型 Asset
const textureAsset = new pc.Asset(
    'diffuse',
    'texture',
    { url: 'assets/textures/diffuse.png' }
);

// 创建 GSplat 型 Asset
const splatAsset = new pc.Asset(
    'splat-model',
    'gsplat',
    { url: '/avocado_chair.ply' }
);

// 创建 Audio 型 Asset
const audioAsset = new pc.Asset(
    'bgm',
    'audio',
    { url: 'assets/audio/bgm.mp3' }
);

// 创建 Font 型 Asset
const fontAsset = new pc.Asset(
    'font',
    'font',
    { url: 'assets/fonts/roboto.json' }
);

// 创建 JSON 型 Asset
const jsonAsset = new pc.Asset(
    'config',
    'json',
    { url: 'assets/data/config.json' }
);

// 创建 Text 型 Asset
const textAsset = new pc.Asset(
    'script',
    'text',
    { url: 'assets/scripts/main.js' }
);
```

### Asset 资源类型

| 类型 | 说明 | 加载后的 resource 类型 |
|------|------|----------------------|
| `container` | GLB/GLTF 3D 模型容器 | `ContainerResource`（含 model, materials, animations 等）|
| `texture` | 2D 纹理 | `pc.Texture` |
| `cubemap` | 立方体贴图 | `resources[1]` 为 `pc.Texture` |
| `material` | 材质定义 | `pc.StandardMaterial` |
| `model` | 3D 网格模型 | `pc.Model`（由 Mesh/MeshInstances 组成）|
| `audio` | 音频文件 | `pc.Sound` |
| `font` | 位图字体 | `pc.Font` |
| `gsplat` | Gaussian Splatting | `pc.GSplatResource` |
| `json` | JSON 数据 | 解析后的 JS 对象 |
| `text` | 文本数据 | `string` |
| `animation` | 动画剪辑 | `pc.Animation` |

### 注册和移除 Asset

```typescript
// 注册到全局注册表（可选，SplatLoader 不需要）
app.assets.add(asset);

// 从注册表移除
app.assets.remove(asset);

// 删除资源（卸载）
app.assets.unload(asset);
```

## AssetListLoader（批量加载）

`AssetListLoader` 是推荐的批量资源加载方式：

### 基本用法

```typescript
const assets = [
    new pc.Asset('leftController', 'container', { url: 'assets/meta_quest_touch/left.glb' }),
    new pc.Asset('rightController', 'container', { url: 'assets/meta_quest_touch/right.glb' }),
    new pc.Asset('skybox', 'cubemap', { url: 'assets/cubemap/helipad-env-atlas.png' }),
    new pc.Asset('metal', 'material', { url: 'assets/materials/metal.json' })
];

const loader = new pc.AssetListLoader(assets, app.assets);

loader.load((err: Error | null | undefined) => {
    if (err) {
        console.error('资源加载失败:', err);
        return;
    }
    console.log('所有资源加载完成');
});
```

### Promise 封装

```typescript
function loadAssets(assets: pc.Asset[], registry: pc.AssetRegistry): Promise<void> {
    return new Promise((resolve, reject) => {
        const loader = new pc.AssetListLoader(assets, registry);
        loader.load((err: Error | null | undefined) => {
            if (err) reject(err);
            else resolve();
        });
    });
}
```

## AssetRegistry（资源注册表）

全局资源管理器 `app.assets` (类型 `pc.AssetRegistry`)：

### 查找资源

```typescript
// 按名称查找（返回第一个匹配）
const asset = app.assets.find('metal');

// 按名称 + 类型查找（推荐，更精确）
const metalAsset = app.assets.find('metal', 'material');

// 按 ID 查找
const assetById = app.assets.get(assetId);

// 按 URL 查找
const assetByUrl = app.assets.findByUrl('assets/cubemap/sky.png');

// 按标签查找
const taggedAssets = app.assets.findByTag('environment');

// 列出所有资源
const allAssets = app.assets.list();
```

### 访问资源内容

```typescript
// Container (GLB) 资源
const containerAsset = app.assets.find('leftController');
const resource = containerAsset.resource as pc.ContainerResource;
// resource 包含:
//   resource.model        - pc.Model
//   resource.materials     - pc.StandardMaterial[]
//   resource.animations    - pc.Animation[]
//   resource.renders       - Entity 配置信息

// 材质资源
const materialAsset = app.assets.find('metal', 'material');
const material = materialAsset.resource as pc.StandardMaterial;

// 纹理资源
const textureAsset = app.assets.find('texture', 'texture');
const texture = textureAsset.resource as pc.Texture;

// Cubemap 资源（重要！）
const skyboxAsset = app.assets.find('skybox');
// skyboxAsset.resource 可能为 null (PNG cubemap atlas)
// 实际纹在 skyboxAsset.resources[1]
const skyboxTexture = skyboxAsset.resources[1] as pc.Texture;

// GSplat 资源
const splatAsset = app.assets.find('splat-model', 'gsplat');
const splatResource = splatAsset.resource; // pc.GSplatResource

// 音频资源
const audioAsset = app.assets.find('bgm', 'audio');
const sound = audioAsset.resource as pc.Sound;

// JSON 资源
const jsonAsset = app.assets.find('config', 'json');
const data = jsonAsset.resource as Record<string, any>;
```

### 事件监听

```typescript
// 资源加载完成
app.assets.on('load', (asset: pc.Asset) => {
    console.log(`资源加载完成: ${asset.name}`);
});

// 资源添加
app.assets.on('add', (asset: pc.Asset) => {
    console.log(`资源已添加: ${asset.name}`);
});

// 资源移除
app.assets.on('remove', (asset: pc.Asset) => {
    console.log(`资源已移除: ${asset.name}`);
});

// 资源加载错误
app.assets.on('error', (err: Error, asset: pc.Asset) => {
    console.error(`资源加载错误: ${asset.name}`, err);
});
```

## 完整资源管理器示例

以下是 AIVR 项目中 `AssetManager` 的实现：

```typescript
export class AssetManager {
    private app: pc.Application;
    private assets: pc.Asset[] = [];

    constructor(app: pc.Application) {
        this.app = app;
    }

    private createDefaultAssets(): void {
        this.assets = [
            new pc.Asset('leftController', 'container',
                { url: 'assets/meta_quest_touch/left.glb' }),
            new pc.Asset('rightController', 'container',
                { url: 'assets/meta_quest_touch/right.glb' }),
            new pc.Asset('skybox', 'cubemap',
                { url: 'assets/cubemap/helipad-env-atlas.png' }),
            new pc.Asset('metal', 'material',
                { url: 'assets/materials/metal.json' })
        ];
    }

    async loadInitAsset(): Promise<void> {
        this.createDefaultAssets();
        return new Promise((resolve, reject) => {
            const loader = new pc.AssetListLoader(this.assets, this.app.assets);
            loader.load((err: Error) => {
                if (err) { reject(err); return; }
                resolve();
            });
        });
    }
}
```

## 资源加载模式总结

### 模式 1：预加载（启动时）

适用于：手柄模型、天空盒、地面材质等启动必需的资源。

```typescript
await assetManager.loadInitAsset();
```

### 模式 2：按需加载（运行时）

适用于：用户触发的资源加载（如语音触发加载模型）。

```typescript
const asset = new pc.Asset('dynamic-' + Date.now(), 'gsplat', { url });
const loader = new pc.AssetListLoader([asset], app.assets);
loader.load((err) => { /* ... */ });
```

### 模式 3：不注册到全局注册表

GSplat 等资源可以不添加到 `app.assets`：

```typescript
const asset = new pc.Asset('splat-' + Date.now(), 'gsplat', { url });
// 不调用 app.assets.add(asset)
const loader = new pc.AssetListLoader([asset], app.assets);
loader.load((err) => {
    // 使用 asset.resource
    entity.addComponent('gsplat', { asset: asset });
});
```

## 资源销毁

```typescript
// 方法 1：通过 AssetRegistry
app.assets.remove(asset);    // 从注册表移除
app.assets.unload(asset);    // 卸载资源数据

// 方法 2：销毁使用该资源的实体
entity.destroy();            // 自动解引用

// 方法 3：自定义清理
class SplatLoader {
    destroy(): void {
        if (this.entity) {
            this.entity.destroy();  // 先销毁实体
            this.entity = null;
        }
        if (this.asset) {
            this.app.assets.remove(this.asset);  // 再移除 Asset
            this.asset = null;
        }
    }
}
```

## 动态 URL 资源

在 Vite 项目中，静态资源可以使用 import：

```typescript
// 直接 URL 引用（public 目录中的文件）
const url = '/avocado_chair.ply';

// Vite import（assets 目录中的文件）
import modelUrl from './assets/model.glb';
```

## 常见问题

### Q: cubemap resources 结构是什么？

```typescript
const asset = app.assets.find('skybox');
console.log(asset.resources);
// 输出: (7) [null, Texture, null, null, null, null, null]
// 6个面 + 全景图，对于 PNG atlas，纹理在 resources[1]
// 对于 DDS cubemap，6个面分别在 resources[0]~resources[5]
```

### Q: 为什么 cubemap 资源不能用于环境反射？

PNG cubemap atlas 加载为 2D 纹理，其 `_cubemap` 属性为 `false`。PlayCanvas 的 PBR 系统需要 `_cubemap === true` 的纹理才能用于 `envMap`。

解决方案：使用 `.dds` 格式或使用 `useSkybox` + skybox 作为环境反射源。

### Q: AssetListLoader vs 单独加载有什么区别？

`AssetListLoader` 可以并行加载多个资源，在全部完成后回调。单独加载每个资源需要手动管理加载状态。

## 关键 API 汇总

```typescript
// 创建 Asset
new pc.Asset(name, type, { url })

// 加载
new pc.AssetListLoader(assets, registry)
loader.load((err) => {})

// 查找
app.assets.find(name)
app.assets.find(name, type)
app.assets.get(id)
app.assets.list()

// 管理
app.assets.add(asset)
app.assets.remove(asset)
app.assets.unload(asset)

// 访问资源
asset.resource       // 加载后的资源对象
asset.resources      // 资源数组（cubemap 等）
asset.name           // 资源名称
asset.type           // 资源类型
asset.id             // 资源 ID

// 事件
app.assets.on('load', cb)
app.assets.on('add', cb)
app.assets.on('remove', cb)
app.assets.on('error', cb)
```
