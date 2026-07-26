# 16 - UI 与 GSplat

> 涵盖：`ElementComponent`、`GSplatComponent`、`GSplatInstance`

## ElementComponent（UI 元素组件）

Element 是 PlayCanvas UI 系统的核心。所有 UI 都挂载在 Screen 组件下。

### 元素类型

```typescript
// 文本
element.addComponent('element', { type: 'text', text: 'Hello' });

// 图片
element.addComponent('element', { type: 'image', color: pc.Color.RED });

// 组（纯容器）
element.addComponent('element', { type: 'group' });
```

### ElementComponent 属性

```typescript
elem = entity.element;

// 类型
elem.type: string                          // 'text' | 'image' | 'group'

// 尺寸和位置
elem.width: number                         // 像素宽度
elem.height: number                        // 像素高度
elem.anchor: Vec4                          // 锚点 (left, bottom, right, top)
elem.pivot: Vec2                           // 轴心点 (0=左/下, 0.5=中, 1=右/上)
elem.margin: Vec4                          // 外边距

// 外观
elem.color: Color                          // 颜色/背景色
elem.opacity: number                       // 透明度 (0~1)
elem.sprite: Sprite | null                 // 精灵（图片元素）
elem.spriteFrame: number                   // 精灵帧
elem.rect: Vec4                            // 精灵纹理子区域 (u0, v0, u1, v1)

// 文本专属
elem.text: string                          // 文本内容
elem.font: Font | CanvasFont               // 字体
elem.fontSize: number                      // 字号
elem.fontAsset: number                     // 字体 Asset ID
elem.color: Color                          // 文本颜色
elem.alignment: Vec2                       // 对齐 (0=左, 0.5=中, 1=右)
elem.wrapLines: boolean                    // 自动换行
elem.lineHeight: number                    // 行高
elem.spacing: number                       // 字符间距
elem.outlineThickness: number             // 描边厚度
elem.outlineColor: Color                   // 描边颜色
elem.enableMarkup: boolean                // 启用富文本标记

// 输入
elem.useInput: boolean                     // ⚠️ 设为 true 才能接收事件

// 渲染
elem.layers: number[]                      // 渲染层 ID 列表
elem.batchGroupId: number                  // 批处理组
elem.mask: boolean                         // 作为遮罩
elem.maskedBy: Entity[]                    // 被哪些遮罩影响
```

### Element 事件

```typescript
// ⚠️ 仅在 useInput = true 时触发
elem.on('mousedown', (event: ElementMouseEvent) => {
    // event.button / event.x / event.y / event.element
});
elem.on('mouseup', (event) => { });
elem.on('mouseenter', (event) => { });     // 鼠标进入元素区域
elem.on('mouseleave', (event) => { });     // 鼠标离开元素区域
elem.on('mousemove', (event) => { });
elem.on('mousewheel', (event) => { });
elem.on('click', (event) => { });          // 完整点击（down + up）
elem.on('touchstart', (event) => { });     // 触摸事件
elem.on('touchend', (event) => { });
elem.on('selectstart', (event) => { });    // XR 射线选择开始 ⚠️
elem.on('selectend', (event) => { });      // XR 射线选择结束
```

`selectstart` / `selectend` 是 VR 中 UI 交互的关键——手柄的 XR 射线指向元素时自动触发。

### 锚点详解

```typescript
// anchor: Vec4(left, bottom, right, top)
// 值含义：到父元素对应边的距离比例

elem.anchor = new pc.Vec4(0, 0, 1, 1);       // 填满父容器
elem.anchor = new pc.Vec4(0.5, 0.5, 0.5, 0.5); // 居中
elem.anchor = new pc.Vec4(0, 0, 0, 0);       // 左下方固定大小

// pivot: Vec2(x, y)
elem.pivot = new pc.Vec2(0.5, 0.5);          // 中心（默认）
elem.pivot = new pc.Vec2(0, 1);              // 左上角
elem.pivot = new pc.Vec2(1, 0);              // 右下角
```

### 创建按钮的组合方式

```typescript
// 背景（按钮本体）
const btn = new pc.Entity('Button');
btn.addComponent('element', {
    type: 'image',
    color: new pc.Color(0.3, 0.5, 0.8),
    anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
    pivot: new pc.Vec2(0.5, 0.5),
    width: 120,
    height: 40,
    useInput: true         // ⚠️ 接收输入
});
btn.addComponent('button', {
    active: true,
    transitionMode: pc.BUTTON_TRANSITION_MODE_TINT,
    hoverTint: new pc.Color(0.4, 0.6, 1.0),
    pressedTint: new pc.Color(0.1, 0.3, 0.7)
});
btn.button.on('selectstart', () => {
    console.log('按钮被 XR 射线点击');
});

// 文本（按钮子元素）
const label = new pc.Entity('Label');
label.addComponent('element', {
    type: 'text',
    text: 'Click Me',
    fontSize: 14,
    font: canvasFont,
    color: new pc.Color(1, 1, 1),
    anchor: new pc.Vec4(0, 0, 1, 1),
    useInput: false        // 不接收输入（让父按钮接收）
});
btn.addChild(label);
```

---

## GSplatComponent（Gaussian Splatting）

GSplat 是 PlayCanvas 2.x 的内置 Gaussian Splatting 渲染组件，用于加载和渲染 `.ply` 格式的 3D 点云。

### 创建

```typescript
// 通过 Asset 创建
const asset = new pc.Asset('splat-' + Date.now(), 'gsplat', {
    url: '/avocado_chair.ply'
});

const loader = new pc.AssetListLoader([asset], app.assets);
loader.load((err) => {
    if (err) { /* 错误处理 */ return; }

    const entity = new pc.Entity('splat');
    entity.addComponent('gsplat', {
        asset: asset         // pc.Asset（类型为 'gsplat'）
    });
    app.root.addChild(entity);
});
```

### GSplatComponent 属性

```typescript
gsplat = entity.gsplat;

// 核心
gsplat.asset: number                    // GSplat Asset 的 ID

// 渲染层
gsplat.layers: number[]                 // 渲染层 ID 列表（默认 [LAYERID_WORLD]）

// LOD（细节层次）
gsplat.lodBaseDistance: number         // LOD 0→1 的基础距离
gsplat.lodMultiplier: number           // 后续 LOD 级别的几何倍率
gsplat.lodRangeMin: number             // 最小 LOD 索引
gsplat.lodRangeMax: number             // 最大 LOD 索引

// 渲染模式
gsplat.renderMode: number              // GSPLAT_FORWARD | GSPLAT_SHADOW

// 点大小
gsplat.pointSize: number               // 着色点的基础像素大小

// 实例
gsplat.instance: GSplatInstance | null // ⚠️ 核心——渲染实例

// 访问底层的 resource（包含 AABB）
const resource = (gsplat as any).resource; // GSplatResource
resource.aabb: BoundingBox               // 局部空间 AABB
```

### GSplatInstance

```typescript
const instance = gsplat.instance;

// AABB（世界空间）
instance.aabb: BoundingBox

// 排序
instance.sortSplats(cameraPosition, cameraForward)

// 材质
instance.material: Material

// 是否可见
instance.visible: boolean
```

### 获取 GSplat 世界空间 AABB

```typescript
function getSplatWorldAabb(entity: pc.Entity): pc.BoundingBox | null {
    const gsplat = entity.gsplat;
    if (!gsplat) return null;

    const resource = (gsplat as any).resource;
    const localAabb = resource?.aabb as pc.BoundingBox | undefined;
    if (!localAabb) return null;

    const worldAabb = new pc.BoundingBox();
    worldAabb.setFromTransformedAabb(localAabb, entity.getWorldTransform());
    return worldAabb;
}
```

### 完整 SplatLoader 实现

```typescript
export class SplatLoader {
    private app: pc.Application;
    private asset: pc.Asset | null = null;
    private entity: pc.Entity | null = null;

    constructor(app: pc.Application) {
        this.app = app;
    }

    async load(config: { url: string; position?: pc.Vec3; scale?: pc.Vec3 })
        : Promise<pc.Entity> {
        const { url, position, scale } = config;

        return new Promise((resolve, reject) => {
            this.asset = new pc.Asset('splat-' + Date.now(), 'gsplat', { url });

            const loader = new pc.AssetListLoader([this.asset], this.app.assets);
            loader.load((err: Error) => {
                if (err) { reject(err); return; }

                this.entity = new pc.Entity('splat');
                this.entity.addComponent('gsplat', { asset: this.asset });

                if (position) this.entity.setPosition(position);
                if (scale) this.entity.setLocalScale(scale);

                this.app.root.addChild(this.entity);
                resolve(this.entity);
            });
        });
    }

    getEntity(): pc.Entity | null { return this.entity; }

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
```

### GSplat 相关常量

```typescript
// 渲染模式
pc.GSPLAT_FORWARD   // 前向渲染
pc.GSPLAT_SHADOW    // 阴影贴图渲染

// 数据格式
pc.GSPLATDATA_COMPACT  // 紧凑格式（默认）
pc.GSPLATDATA_LARGE    // 大格式（更多精度）

// GPU 流模式
pc.GSPLAT_STREAM_INSTANCE  // 实例化流
pc.GSPLAT_STREAM_RESOURCE  // 资源流
```

### 关键注意事项

1. **Asset 可以不注册到 app.assets**：GSplat asset 不需要调用 `app.assets.add()`，`AssetListLoader` 会直接加载。
2. **销毁时要同时清理 entity 和 asset**：`entity.destroy()` 不会自动移除 asset。
3. **AABB 是局部空间的**：GSplat 的 AABB 需要用 `setFromTransformedAabb` 转换到世界空间。
4. **SplatLoader 按需加载**：不需要在应用启动时预加载 GSplat 资源，运行时按需加载即可。

## 关键 API 速查

```typescript
// ElementComponent
entity.element.type / .width / .height
entity.element.anchor / .pivot / .margin
entity.element.color / .opacity
entity.element.text / .font / .fontSize
entity.element.alignment / .wrapLines
entity.element.useInput           // ⚠️
entity.element.layers
entity.element.on('mousedown'|'mouseup'|'click')
entity.element.on('selectstart'|'selectend')  // XR 射线事件

// ButtonComponent
entity.addComponent('button', { active, transitionMode, hoverTint, pressedTint })
entity.button.on('click'|'selectstart')

// ScreenComponent
entity.addComponent('screen', { screenSpace, referenceResolution })
entity.setLocalScale(x, y, z)      // 世界空间尺寸

// GSplatComponent
entity.addComponent('gsplat', { asset })
entity.gsplat.layers
entity.gsplat.instance: GSplatInstance
entity.gsplat.pointSize / .renderMode
(resource).aabb: BoundingBox

// GSplatInstance
instance.aabb: BoundingBox
instance.visible: boolean
instance.sortSplats(cameraPos, cameraDir)
```
