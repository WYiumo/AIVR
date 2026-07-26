# 14 - Asset、Script 与 EventHandler

> 涵盖：`Asset`、`AssetRegistry`、`AssetListLoader`、`Script`、`EventHandler`

## Asset（资源）

### 构造函数

```typescript
new Asset(name: string, type: string, file?: {
    filename?: string;
    url?: string;
    hash?: string;
    size?: number;
}, data?: object, options?: object)
```

参数说明：
- `name`：资源名，可以通过 `app.assets.find(name)` 查找
- `type`：资源类型，决定了引擎如何解析加载的文件
- `file`：描述文件来源，`url` 是最重要的字段
- `data`：可选元数据

### Asset 类型

| 类型 | 说明 | resource 类型 |
|------|------|---------------|
| `container` | GLB/GLTF 模型 | `ContainerResource`（.model / .materials / .animations） |
| `texture` | 2D 纹理 | `pc.Texture` |
| `cubemap` | 立方体贴图 | `resources[0..5]` / `resources[1]` |
| `material` | 材质定义（JSON） | `pc.StandardMaterial` |
| `model` | 网格模型 | `pc.Model` |
| `gsplat` | Gaussian Splatting | `pc.GSplatResource` |
| `audio` | 音频 | `pc.Sound` |
| `font` | 位图字体 | `pc.Font` |
| `json` | JSON 数据 | JS 对象 |
| `text` | 文本 | `string` |
| `animation` | 动画剪辑 | `pc.Animation` |
| `shader` | 着色器 | `pc.Shader` |

### Asset 生命周期

```
创建 Asset → 注册到 AssetRegistry → 加载文件 → resource 可用 → 使用 resource → 卸载
```

```typescript
// 1. 创建
const asset = new pc.Asset('myModel', 'container', { url: 'model.glb' });

// 2. 注册（可选，gSplat 可以不入 registry）
app.assets.add(asset);

// 3. 加载
const loader = new pc.AssetListLoader([asset], app.assets);
loader.load((err) => {
    if (err) { /* 失败 */ return; }
    // 4. asset.resource 可用
    const model = asset.resource.model;
});

// 5. 卸载
asset.unload();
// 或
app.assets.remove(asset);
```

### Asset 属性

```typescript
asset.id: number              // 全局唯一 ID（自动分配）
asset.name: string            // 名称
asset.type: string            // 类型
asset.file: object            // 文件信息（url, filename, etc.）
asset.data: object            // 自定义数据
asset.resource: any           // ⚠️ 加载后的资源对象（加载完成前为 null）
asset.resources: any[]        // 资源数组（cubemap 等特殊类型）
asset.loaded: boolean         // 是否加载完成
asset.loading: boolean        // 是否加载中
asset.tags: Tags              // 标签
asset.preload: boolean        // 是否预加载（默认 true）
```

### `resource` vs `resources`

不同类型加载后 `resource` 内容不同：

```typescript
// container → ContainerResource
const glb = asset.resource;        // ContainerResource
glb.model                         // pc.Model
glb.materials                     // StandardMaterial[]
glb.animations                    // Animation[]
glb.renders                       // Entity 配置数组

// texture → Texture
const texture = asset.resource;   // pc.Texture

// cubemap → resources[0..5] (DDS) 或 resources[1] (PNG atlas)
const skyTexture = asset.resources[1];  // pc.Texture ⚠️ 不在 .resource

// material → StandardMaterial
const mat = asset.resource;       // pc.StandardMaterial

// gsplat → GSplatResource
const splatResource = asset.resource;  // pc.GSplatResource
```

### Asset 事件

```typescript
asset.on('load', (a: Asset) => {          // 加载完成
    console.log(`${a.name} 加载完成`);
});
asset.on('error', (err: Error, a: Asset) => {  // 加载失败
    console.error(`${a.name} 加载失败:`, err);
});
asset.on('change', (a, property, newValue, oldValue) => { }); // 属性变更
asset.on('remove', (a: Asset) => { });    // 被移除
asset.on('unload', (a: Asset) => { });    // 被卸载
```

---

## AssetRegistry（资源注册表）

`app.assets` 是这个类的实例。

### 查找资源

```typescript
// 按名称（一次查找）
const asset = app.assets.find('metal');                   // 返回第一个匹配
const asset = app.assets.find('metal', 'material');       // 按名称+类型（推荐）

// 按 ID
const asset = app.assets.get(assetId);

// 按 URL
const asset = app.assets.getByUrl('assets/cubemap/sky.png');

// 按标签
const assets = app.assets.findByTag('environment');

// 查找所有
const allAssets = app.assets.list();                       // Asset[]
const textures = app.assets.filter(a => a.type === 'texture');  // Asset[]

// 按名称查找所有（名称可能重复）
const allMetals = app.assets.findAll('metal');
```

### 管理资源

```typescript
app.assets.add(asset);           // 注册
app.assets.remove(asset);        // 移除（不卸载）
app.assets.unload(asset);        // 卸载资源数据
app.assets.load(asset);          // 加载单个资源
```

### 事件

```typescript
app.assets.on('add', (asset) => { });      // 资源注册
app.assets.on('remove', (asset) => { });   // 资源移除
app.assets.on('load', (asset) => { });     // 任何资源加载完成
app.assets.on('error', (err, asset) => { }); // 加载错误
```

---

## AssetListLoader（批量加载器）

```typescript
// 基本用法
const assets = [
    new pc.Asset('model', 'container', { url: 'model.glb' }),
    new pc.Asset('sky', 'cubemap', { url: 'sky.png' }),
    new pc.Asset('metal', 'material', { url: 'metal.json' })
];

const loader = new pc.AssetListLoader(assets, app.assets);
loader.load((err: Error | null | undefined) => {
    if (err) {
        console.error('批量加载失败:', err);
        return;
    }
    // 所有资源加载完成，可以安全使用
});

// Promise 封装
async function loadAssets(assets: pc.Asset[], registry: pc.AssetRegistry): Promise<void> {
    return new Promise((resolve, reject) => {
        new pc.AssetListLoader(assets, registry)
            .load((err) => err ? reject(err) : resolve());
    });
}
```

---

## Script（脚本系统）

PlayCanvas 2.x 推荐使用 ES class 风格的 `Script`：

### 定义脚本

```typescript
import { Script } from 'playcanvas';

export class PlayerController extends Script {
    // ⚠️ 必须定义静态属性，作为脚本的注册名
    static scriptName = 'playerController';

    // 脚本属性（在编辑器中可配置）
    static attributes = {
        speed: { type: 'number', default: 5 },
        jumpForce: { type: 'number', default: 10 }
    };

    // 构造函数——接收 app 和 entity
    constructor(args: { app: pc.AppBase; entity: pc.Entity }) {
        super(args);
        // this.app  = args.app
        // this.entity = args.entity
    }

    // 生命周期
    initialize() { }          // 首次启用时调用一次
    postInitialize() { }      // initialize 之后，所有脚本的 initialize 都完成后

    update(dt: number) { }    // 每帧（enabled 时）
    postUpdate(dt: number) { } // 所有脚本 update 之后

    swap() { }                // 热重载时调用
}
```

### 脚本生命周期事件

```typescript
// 在 initialize 中注册
this.on('enable', () =>  { /* 脚本被启用 */ });
this.on('disable', () => { /* 脚本被禁用 */ });
this.on('state', (enabled: boolean) => {
    // enable + disable 的统一事件，带状态参数
});
this.on('destroy', () => {  /* 脚本被销毁 */ });
this.on('attr', (name, newValue, oldValue) => {
    // 属性变更时触发
});
this.on('attr:speed', (newValue, oldValue) => {
    // 特定属性 speed 变更时触发
});
```

### 使用脚本

```typescript
// 方式 1：在 Entity 上创建
const entity = new pc.Entity('Player');
entity.addComponent('script');
entity.script.create('playerController', {
    properties: { speed: 10 }
});

// 方式 2：访问已创建的脚本实例
const controller = entity.script.get('playerController');
// 或
const controller = entity.script.playerController;
```

### ScriptComponent

```typescript
entity.script.create(nameOrType: string, args?: { properties?: object }): ScriptType
entity.script.destroy(nameOrType: string)       // 销毁某个脚本实例
entity.script.get(nameOrType: string): ScriptType | undefined  // 按名称获取
entity.script.has(nameOrType: string): boolean  // 是否存在
entity.script.scripts: (Script | ScriptType)[]  // 所有脚本实例
entity.script.enabled: boolean                  // 启用/禁用所有脚本
```

### 脚本注册（全局）

```typescript
// 注册后可以在任何 entity 上使用
app.scripts.add(PlayerController);

// 或
pc.registerScript(PlayerController);
```

---

## EventHandler（事件基类）

`EventHandler` 是 PlayCanvas 中几乎所有类的基类（Scene、Asset、Entity、XrManager 等都继承自它），提供统一的 pub/sub 事件系统。

### 基本用法

```typescript
// 监听
const handle = obj.on('eventName', (arg1, arg2) => {
    console.log(arg1, arg2);
});

// 一次性监听（触发后自动移除）
obj.once('eventName', (arg1) => { });

// 触发
obj.fire('eventName', arg1, arg2);

// 移除
handle.off();                             // 推荐：用返回的 EventHandle 移除
obj.off('eventName');                     // 移除该事件的所有回调
obj.off('eventName', myCallback);         // 移除特定回调

// 检查是否有监听
obj.hasEvent('eventName');                // boolean
```

### 关键细节

1. **`on()` 返回 `EventHandle`**：应保留这个 handle 用于精确移除，比 `obj.off(name, callback)` 更快（不需要遍历回调列表）。

2. **回调参数限制为 8 个**：
```typescript
obj.on('event', (a, b, c, d, e, f, g, h) => { });
// 不能超过 8 个参数
```

3. **scope 参数**：
```typescript
obj.on('event', this.handleEvent, this);
// 第三个参数指定回调中的 this
```

4. **继承 EventHandler**：
```typescript
import { EventHandler } from 'playcanvas';

class MyManager extends EventHandler {
    doSomething() {
        // 通知所有监听者
        this.fire('done', result);
    }
}

// 使用
const manager = new MyManager();
manager.on('done', (result) => console.log(result));
```

### 事件命名约定

PlayCanvas 内部使用的事件命名：
- 属性变更：`set:propertyName`（如 `set:layers`、`set:skybox`）
- 生命周期：`start`、`end`、`destroy`
- 输入：`select`、`squeeze`、`keydown`、`mousemove`
- 自定义：按功能命名，用冒号或斜杠分组（如 `sessionstart`、`prerender:layer`）

## 关键 API 速查

```typescript
// Asset
new Asset(name, type, { url })
asset.id / .name / .type / .file / .data
asset.resource / .resources / .loaded / .loading
asset.tags
asset.on('load'|'error'|'change'|'remove'|'unload')
asset.unload()

// AssetRegistry
app.assets.find(name, type?)      // 按名称查找
app.assets.get(id)                 // 按 ID
app.assets.getByUrl(url)          // 按 URL
app.assets.list()                 // 所有资源
app.assets.filter(fn)             // 筛选
app.assets.add/remove/unload(asset)
app.assets.on('add'|'remove'|'load'|'error')

// AssetListLoader
new AssetListLoader(assets, registry)
loader.load((err) => {})

// Script
static scriptName = 'myScript'
constructor({ app, entity })
initialize() / postInitialize() / update(dt) / postUpdate(dt)
this.on('enable'|'disable'|'state'|'destroy'|'attr')
entity.script.create(name, { properties })
entity.script.get(name) / .destroy(name)

// EventHandler
obj.on(name, callback, scope?): EventHandle
obj.once(name, callback, scope?): EventHandle
obj.fire(name, ...args)
obj.off(name, callback?) / handle.off()
obj.hasEvent(name): boolean
```
