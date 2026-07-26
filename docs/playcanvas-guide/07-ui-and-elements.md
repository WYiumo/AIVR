# 07 - UI 系统

## 概述

PlayCanvas 的 UI 系统支持两种模式：
- **Screen-space UI**：2D 覆盖层，固定在屏幕上
- **World-space UI**：3D 空间中的 UI，存在于游戏世界内

VR 开发中**必须使用 World-space UI**，因为 WebXR DOM Overlay 不支持纯 VR 模式。

## UI 核心组件

UI 系统由以下组件构成：

| 组件 | 用途 |
|------|------|
| `ScreenComponent` | UI 根容器，定义坐标空间 |
| `ElementComponent` | UI 元素（text / image / group） |
| `ButtonComponent` | 交互按钮 |
| `LayoutGroupComponent` | 自动布局容器 |
| `LayoutChildComponent` | 布局子项约束 |

## ScreenComponent（屏幕组件）

### World-space UI（VR 中使用）

```typescript
const screenEntity = new pc.Entity('MyScreen');

screenEntity.addComponent('screen', {
    referenceResolution: new pc.Vec2(1280, 720),  // 参考分辨率
    screenSpace: false,         // ⚠️ 关键：false = world-space
    scaleBlend: 1,              // 缩放混合
    scaleMode: pc.SCALEMODE_BLEND,
    resolutionMode: pc.RESOLUTION_FIXED
});

// 设置面板在世界中的大小（单位：米）
screenEntity.setLocalScale(0.005, 0.005, 1);
// 解释：400 UI像素 × 0.005 = 2 米宽

app.root.addChild(screenEntity);
```

### Screen-space UI

```typescript
screenEntity.addComponent('screen', {
    referenceResolution: new pc.Vec2(1280, 720),
    screenSpace: true,          // 固定屏幕空间
    scaleMode: pc.SCALEMODE_BLEND,
    resolutionMode: pc.RESOLUTION_FIXED
});
```

### ScreenComponent 属性

| 属性 | 说明 |
|------|------|
| `referenceResolution` | 参考分辨率（设计时的分辨率） |
| `screenSpace` | `true`=屏幕空间, `false`=世界空间 |
| `scaleBlend` | 缩放混合系数（0=固定, 1=完全匹配） |
| `scaleMode` | `SCALEMODE_NONE` / `SCALEMODE_BLEND` |
| `resolutionMode` | `RESOLUTION_AUTO` / `RESOLUTION_FIXED` |

## ElementComponent（元素组件）

### 类型

```typescript
// 文本元素
elementEntity.addComponent('element', {
    type: 'text',              // 'text' | 'image' | 'group'
    text: 'Hello World',
    font: canvasFont,          // pc.CanvasFont
    fontSize: 16,
    color: new pc.Color(1, 1, 1, 1),
    alignment: new pc.Vec2(0.5, 0.5),  // 文本对齐
    wrapLines: false,
    outlineThickness: 0,
    outlineColor: new pc.Color(0, 0, 0, 1),
    lineHeight: 16
});

// 图片元素
elementEntity.addComponent('element', {
    type: 'image',
    color: new pc.Color(1, 1, 1, 0.9),  // 可做背景色
    sprite: spriteAsset,       // 可选精灵
    spriteFrame: 0,
    opacity: 0.9,
    rect: new pc.Vec4(0, 0, 1, 1)  // sprite 的子区域
});

// 组元素（容器）
elementEntity.addComponent('element', {
    type: 'group',
    useInput: false
});
```

### ElementComponent 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `string` | `'text'` / `'image'` / `'group'` |
| `text` | `string` | 文本内容 |
| `font` | `Font` / `CanvasFont` | 字体资源 |
| `fontSize` | `number` | 字号 |
| `color` | `Color` | 颜色/背景色 |
| `opacity` | `number` | 透明度 (0-1) |
| `alignment` | `Vec2` | 文本对齐 (0=左/上, 0.5=中, 1=右/下) |
| `wrapLines` | `boolean` | 自动换行 |
| `outlineThickness` | `number` | 描边厚度 |
| `outlineColor` | `Color` | 描边颜色 |
| `anchor` | `Vec4` | 锚点 (left, bottom, right, top) |
| `pivot` | `Vec2` | 轴心点 |
| `margin` | `Vec4` | 外边距 |
| `width` / `height` | `number` | 尺寸（像素） |
| `useInput` | `boolean` | 是否接收输入事件 |
| `layers` | `number[]` | 渲染图层 ID 列表 |
| `batchGroupId` | `number` | 批处理组 |
| `enableMarkup` | `boolean` | 启用富文本标记 |

### 锚点和轴心

```typescript
// anchor: Vec4(left, bottom, right, top)
// 0 = 父元素的左/下/右/上边缘
// 1 = 父元素的右/上/左/下边缘
// 0.5 = 父元素的中心

// 填满父容器
element.anchor = new pc.Vec4(0, 0, 1, 1);

// 居中固定大小
element.anchor = new pc.Vec4(0.5, 0.5, 0.5, 0.5);

// pivot: Vec2(x, y)
// 0 = 左/下, 0.5 = 中, 1 = 右/上
element.pivot = new pc.Vec2(0.5, 0.5);  // 中心轴
element.pivot = new pc.Vec2(0, 1);      // 左上角轴
```

## ButtonComponent（按钮组件）

```typescript
buttonEntity.addComponent('button', {
    active: true,                              // 是否可交互
    imageEntity: iconEntity,                   // 关联的图片实体
    hitPadding: new pc.Vec4(0, 0, 0, 0),      // 点击区域扩展
    transitionMode: pc.BUTTON_TRANSITION_MODE_TINT,
    hoverTint: new pc.Color(0.4, 0.6, 1.0),
    pressedTint: new pc.Color(0.1, 0.3, 0.7),
    inactiveTint: new pc.Color(0.5, 0.5, 0.5),
    fadeDuration: 0.1
});

// 事件监听
buttonEntity.button.on('click', () => {
    console.log('按钮被点击（鼠标/触摸）');
});

buttonEntity.button.on('selectstart', () => {
    console.log('按钮被 XR 射线选中');
});
```

### ButtonComponent 属性

| 属性 | 说明 |
|------|------|
| `active` | 是否可交互 |
| `transitionMode` | `BUTTON_TRANSITION_MODE_TINT` / `_SPRITE_CHANGE` |
| `hoverTint` | 悬停时的颜色 |
| `pressedTint` | 按下时的颜色 |
| `inactiveTint` | 禁用时的颜色 |
| `fadeDuration` | 过渡时间（秒） |
| `hitPadding` | 点击区域扩展 |

## LayoutGroupComponent（自动布局）

### 垂直布局

```typescript
container.addComponent('layoutgroup', {
    orientation: pc.ORIENTATION_VERTICAL,
    alignment: new pc.Vec2(0.5, 1),       // 水平居中，顶部对齐
    padding: new pc.Vec4(8, 8, 8, 8),    // 内边距
    spacing: new pc.Vec2(0, 10),          // 子元素间距 (x, y)
    widthFitting: pc.FITTING_STRETCH,     // 宽度适配
    heightFitting: pc.FITTING_NONE,       // 高度适配
    wrap: false
});
```

### 水平布局

```typescript
container.addComponent('layoutgroup', {
    orientation: pc.ORIENTATION_HORIZONTAL,
    alignment: new pc.Vec2(0.5, 0.5),
    padding: new pc.Vec4(20, 0, 20, 0),
    spacing: new pc.Vec2(10, 0),
    widthFitting: pc.FITTING_STRETCH,
    heightFitting: pc.FITTING_STRETCH,
    wrap: false
});
```

### LayoutGroup 属性

| 属性 | 说明 |
|------|------|
| `orientation` | `ORIENTATION_HORIZONTAL` / `ORIENTATION_VERTICAL` |
| `alignment` | 子元素排列对齐 |
| `padding` | 内边距 `Vec4(left, bottom, right, top)` |
| `spacing` | 子元素间距 `Vec2(x, y)` |
| `widthFitting` | 宽度适配模式 |
| `heightFitting` | 高度适配模式 |
| `wrap` | 是否换行 |

### Fitting 模式

```typescript
pc.FITTING_NONE     // 不自动调整
pc.FITTING_STRETCH  // 拉伸填满
pc.FITTING_SHRINK   // 收缩到内容大小
pc.FITTING_BOTH     // 拉伸+收缩
```

## LayoutChildComponent（子项约束）

```typescript
childEntity.addComponent('layoutchild', {
    minWidth: 45,
    minHeight: 20,
    maxWidth: 70,
    maxHeight: 40,
    fitWidthProportion: 1,    // 宽度分配比例权重
    fitHeightProportion: 1,
    excludeFromLayout: false
});
```

## CanvasFont（动态字体）

PlayCanvas 支持通过 FontFace API 加载 TTF 字体并在运行时创建 `CanvasFont`：

### Font Manager 实现

```typescript
export class FontManager {
    private static instance: FontManager;
    private app!: pc.Application;
    private fonts: Map<string, pc.CanvasFont> = new Map();

    static getInstance(app?: pc.Application): FontManager {
        if (!FontManager.instance) {
            FontManager.instance = new FontManager();
            if (app) FontManager.instance.app = app;
        }
        return FontManager.instance;
    }

    async loadFont(name: string, url: string): Promise<void> {
        const fontFace = new FontFace(name, `url(${url})`);
        const loadedFace = await fontFace.load();
        document.fonts.add(loadedFace);

        const canvasFont = new pc.CanvasFont(this.app, {
            fontName: name,
            fontSize: 32
        });
        this.fonts.set(name, canvasFont);
    }

    getFont(name: string): pc.CanvasFont | undefined {
        return this.fonts.get(name);
    }

    updateFontTextures(name: string, text: string): void {
        const font = this.fonts.get(name);
        if (font) {
            font.createTextures(text);
        }
    }
}
```

### 使用 CanvasFont

```typescript
// 初始化
const fontManager = FontManager.getInstance(app);
await fontManager.loadFont('SimHei', 'assets/font/SimHei.ttf');

// 在 ElementComponent 中使用
element.addComponent('element', {
    type: 'text',
    font: fontManager.getFont('SimHei'),
    text: '你好，世界',
    fontSize: 16
});

// ⚠️ 显示新字符前，更新字体纹理图集
fontManager.updateFontTextures('SimHei', '新的中文字符');
```

## 完整 VR 语音面板示例

以下是完整的 World-space UI 面板创建示例（参考 `VrVoicePanel`）：

```typescript
export class MyVrPanel {
    private screenEntity: pc.Entity;
    private app: pc.Application;
    private buttons: Map<string, pc.Entity> = new Map();

    constructor(app: pc.Application) {
        this.app = app;
        this.screenEntity = new pc.Entity('VrPanel');

        // 1. 创建 Screen 组件
        this.screenEntity.addComponent('screen', {
            referenceResolution: new pc.Vec2(400, 300),
            screenSpace: false,            // World-space
            scaleBlend: 1,
            scaleMode: pc.SCALEMODE_BLEND,
            resolutionMode: pc.RESOLUTION_FIXED
        });

        // 2. 设置世界空间大小
        this.screenEntity.setLocalScale(0.005, 0.005, 1);
        // 面板实际大小 = 400 × 0.005 = 2m × 300 × 0.005 = 1.5m

        // 3. 创建主容器（垂直布局）
        const container = new pc.Entity('Container');
        container.addComponent('element', { type: 'group' });
        container.addComponent('layoutgroup', {
            orientation: pc.ORIENTATION_VERTICAL,
            alignment: new pc.Vec2(0.5, 1),
            padding: new pc.Vec4(2, 2, 2, 2),
            spacing: new pc.Vec2(0, 1)
        });

        // 4. 添加子元素...
        this.screenEntity.addChild(container);
        app.root.addChild(this.screenEntity);
    }

    // 面板跟随相机
    followCamera(camera: pc.Entity): void {
        const camPos = camera.getPosition();
        const forward = camera.forward;

        const panelPos = new pc.Vec3()
            .copy(camPos)
            .add(forward.mulScalar(1.2));  // 1.2 米前方

        this.screenEntity.setPosition(panelPos);
        this.screenEntity.lookAt(camPos);
        this.screenEntity.rotateLocal(-7.5, 180, 0);
    }
}
```

## UI Layer

UI 元素必须放在正确的渲染层：

```typescript
// 获取 UI Layer
function getUILayer(app: pc.Application): pc.Layer {
    // 方法 1: 按名称查找
    const layer = app.scene.layers.getLayerByName('UI');
    if (layer) return layer;

    // 方法 2: 按 ID 查找
    const uiLayer = app.scene.layers.getLayerById(pc.LAYERID_UI);
    if (uiLayer) return uiLayer;

    // 方法 3: 回退到 World Layer
    return app.scene.layers.getLayerById(pc.LAYERID_WORLD)!;
}

// 在 Element 中指定 Layer
element.addComponent('element', {
    type: 'text',
    text: 'Hello',
    layers: [getUILayer(app).id]
});
```

## UI 可见性控制

```typescript
// 整个面板
screenEntity.enabled = true;   // 显示
screenEntity.enabled = false;  // 隐藏

// 单个元素
element.enabled = false;

// 按钮激活/禁用
button.button.active = true;
button.button.active = false;
```

## 按钮文本颜色

注意：按钮的 `hoverTint` 等色调会影响整个按钮 Entity（包括其子文本元素）：

```typescript
// 创建按钮背景 + 文本
const button = new pc.Entity('Button');
button.addComponent('element', {
    type: 'image',
    color: new pc.Color(0.5, 0.4, 0.8, 1),
    useInput: true,          // ⚠️ 必须在按钮实体本身上设置
    layers: [uiLayerId]
});
button.addComponent('button', {
    active: false,           // 初始禁用
    transitionMode: pc.BUTTON_TRANSITION_MODE_TINT,
    hoverTint: new pc.Color(0.4, 0.6, 1.0)
});

// 文本作为按钮子节点
const text = new pc.Entity('Text');
text.addComponent('element', {
    type: 'text',
    text: 'Click',
    fontSize: 12,
    color: new pc.Color(1, 1, 1, 1),
    useInput: false,          // 文本不需要输入事件
    layers: [uiLayerId]
});
button.addChild(text);
```

## ElementInput 系统

`ElementInput` 必须在 Application 构造函数中传入，否则 World-space UI 交互无法工作：

```typescript
// ✅ 正确
const app = new Application(canvas, {
    elementInput: new ElementInput(canvas)
});

// ❌ 错误 - UI 射线检测不工作
const app = new Application(canvas, {
    // 缺少 elementInput
});
```

## 常见问题

### Q: VR 中 UI 不交互？

检查清单：
1. ✅ `screenSpace: false`
2. ✅ `elementInput` 在构造时传入
3. ✅ UI 元素 `useInput: true`
4. ✅ 按钮组件 `active: true`
5. ✅ 面板未被其他东西遮挡
6. ✅ UI 在正确的 Layer

### Q: 中文显示为方块？

CanvasFont 的纹理图集不包含中文字符。需要：
1. 加载中文字符集（如 3500 常用汉字）
2. 在显示新文本前调用 `canvasFont.createTextures(text)` 更新图集
3. 确保 TTF 字体支持中文

### Q: CanvasFont fontSize: NaN？

`CanvasFont` 构造函数需要 `fontSize` 参数：

```typescript
// ✅ 正确
new pc.CanvasFont(app, { fontName: 'SimHei', fontSize: 32 });

// ❌ 错误 - 缺少 fontSize
new pc.CanvasFont(app, { fontName: 'SimHei' });
```

### Q: 面板缩放怎么计算？

```
世界空间大小（米） = UI 像素尺寸 × setLocalScale
例如: 400px × 0.005 = 2m 宽
```

需要通过实验找到合适的 scale 值。通常 0.002-0.01 范围。

## 关键 API 汇总

```typescript
// Screen
entity.addComponent('screen', { screenSpace, referenceResolution, scaleBlend, scaleMode })

// Element
entity.addComponent('element', { type, text, font, fontSize, color, anchor, pivot, useInput, layers })

// Button
entity.addComponent('button', { active, transitionMode, hoverTint, pressedTint })
element.button.on('click'|'selectstart', cb)

// LayoutGroup
entity.addComponent('layoutgroup', { orientation, alignment, padding, spacing, widthFitting })

// LayoutChild
entity.addComponent('layoutchild', { minWidth, minHeight, maxWidth, maxHeight, fitWidthProportion })

// CanvasFont
new pc.CanvasFont(app, { fontName, fontSize })
canvasFont.createTextures(text)
```
