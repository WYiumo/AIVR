# 12 - Application 详解

> 涵盖：`Application`、`AppBase`

## Application vs AppBase

| | Application | AppBase |
|---|---|---|
| 组件系统 | 自动注册 20 个 | 需手动注册 |
| XR 系统 | ✅ 自动初始化 | ❌ `app.xr` 为 undefined |
| 资源处理器 | ✅ 自动注册 | ❌ 需手动 |
| 推荐场景 | **VR/XR 应用** | 树摇优化、最小构建 |

**结论**：VR 项目必须用 `Application`。

## Application 构造函数

```typescript
new Application(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    options?: {
        mouse?: Mouse;              // 鼠标设备，传入 new Mouse(canvas)
        touch?: TouchDevice;        // 触摸设备，传入 new TouchDevice(canvas)
        keyboard?: Keyboard;        // 键盘设备，传入 new Keyboard(window)
        gamepads?: GamePads;       // 手柄设备
        elementInput?: ElementInput; // ⚠️ VR UI 必须的 UI 元素输入处理器
        scriptPrefix?: string;      // 脚本 URL 前缀
        assetPrefix?: string;       // 资源 URL 前缀
        graphicsDevice?: GraphicsDevice;  // 自定义图形设备（默认创建 WebGL2）
        graphicsDeviceOptions?: {};       // 传递给 GraphicsDevice 构造函数的选项
        scriptsOrder?: string[];    // 脚本加载顺序
    }
)
```

### 每个选项的作用

**`mouse`** — 如果设置，`app.mouse` 可用，能响应桌面鼠标事件。VR 中可以省略但通常保留用于开发调试。

**`touch`** — 移动端触摸。不影响 VR 功能。

**`keyboard`** — 如果设置，`app.keyboard` 可用。常用于桌面快捷键（如空格抓取）。

**`elementInput`** — **VR 中最关键的非必须选项**。如果不传，world-space UI（屏幕组件 `screenSpace: false`）的射线交互完全失效，按钮不响应。它处理鼠标/触摸/XR 射线对 Element 组件的交集检测。

**`scriptPrefix`** — 当用 `app.scripts.create('myScript')` 创建脚本时，引擎会去加载 `${scriptPrefix}/myScript.js`。通常不需要设置。

**`graphicsDeviceOptions`** — 传递底层 WebGL/WebGPU 创建设置，如 `{ preferWebGL2: true, stencil: true }`。

## Application 自动注册的组件系统

构造函数自动注册以下 20 个组件系统（无需手动添加）：

```
anim, animation, audiolistener, button, camera, collision,
element, layoutchild, layoutgroup, light, model,
particlesystem, rigidbody, render, screen, script,
scrollbar, scrollview, sound, sprite
```

这意味着创建 Entity 后可以直接 `addComponent('camera', ...)` 而不需要先注册 CameraComponentSystem。

## Canvas 配置

### setCanvasFillMode

控制 canvas 如何适应容器大小：

```typescript
app.setCanvasFillMode(FILLMODE_FILL_WINDOW);   // 填满窗口（推荐）
app.setCanvasFillMode(FILLMODE_KEEP_ASPECT);   // 保持宽高比，留黑边
app.setCanvasFillMode(FILLMODE_NONE);           // 不缩放，固定分辨率
```

效果：`FILLMODE_FILL_WINDOW` 让 canvas 始终填满整个浏览器窗口，窗口大小变化时自动调整。`FILLMODE_KEEP_ASPECT` 保持设计时的宽高比——如果窗口比例不同会出现黑边。

### setCanvasResolution

控制 canvas 内部分辨率：

```typescript
app.setCanvasResolution(RESOLUTION_AUTO);   // 自动匹配窗口像素（推荐）
app.setCanvasResolution(RESOLUTION_FIXED);  // 固定设计分辨率
```

效果：`RESOLUTION_AUTO` 在高 DPI 屏幕上会以原生分辨率渲染（更清晰但性能开销更大）。`RESOLUTION_FIXED` 固定为设计分辨率，低端设备可用它降低 GPU 负载。

### resizeCanvas

```typescript
app.resizeCanvas();  // 手动触发 canvas 尺寸重新计算
```

窗口 resize 事件的典型绑定：

```typescript
const resize = () => app.resizeCanvas();
window.addEventListener('resize', resize);
app.once('destroy', () => window.removeEventListener('resize', resize));
```

## 关键属性（AppBase 继承）

### root — Entity
场景的根节点。所有场景中的 Entity 都应该是 root 的子孙：

```typescript
app.root.addChild(myEntity);
const camera = app.root.findByName('Camera');
const grabbables = app.root.findByTag('grabbable');
```

### scene — Scene
场景全局属性配置对象。详见 [13-api-scene-entity.md](13-api-scene-entity.md)：

```typescript
app.scene.ambientLight = new pc.Color(0.8, 0.8, 0.8);
app.scene.exposure = 1.5;
app.scene.skybox = cubemapTexture;
```

### assets — AssetRegistry
全局资源管理器。详见 [14-api-assets-scripts.md](14-api-assets-scripts.md)：

```typescript
const metal = app.assets.find('metal', 'material');
const loader = new pc.AssetListLoader(assets, app.assets);
```

### xr — XrManager
XR 会话管理器。详见 [17-api-input-xr.md](17-api-input-xr.md)：

```typescript
app.xr.start(camera, pc.XRTYPE_VR, pc.XRSPACE_LOCALFLOOR);
app.xr.on('start', () => { /* VR 开始 */ });
```

### graphicsDevice — GraphicsDevice
底层图形设备（WebGL2 / WebGPU）：

```typescript
console.log(app.graphicsDevice.deviceType);  // 'webgl2' | 'webgpu'
console.log(app.graphicsDevice.isWebGPU);
```

### autoRender — boolean (默认 true)

```typescript
app.autoRender = false;  // 关闭自动渲染
app.autoRender = true;   // 每帧自动渲染（默认）
```

设为 `false` 后，需要手动设置 `app.renderNextFrame = true` 来触发渲染。用于只在有变化时渲染（如静态展示页）。

### renderNextFrame — boolean (默认 false)

```typescript
app.keyboard.on('keydown', () => {
    app.renderNextFrame = true;  // 下一帧渲染一次
});
```

只在 `autoRender = false` 时有意义。设置后会渲染一帧然后自动重置为 false。

### timeScale — number (默认 1)

```typescript
app.timeScale = 0.5;   // 半速（慢动作）
app.timeScale = 2.0;   // 双倍速（快进）
app.timeScale = 0;     // 暂停更新（dt 为 0）
```

缩放全局时间增量 `dt`。只影响 `app.on('update', dt => {})` 中的 `dt` 值，不影响渲染。

### maxDeltaTime — number (默认 0.1)

```typescript
app.maxDeltaTime = 0.05;  // 限制 dt 最大 50ms
```

限制 dt 上限。用途：当用户切标签页再切回来时，`dt` 可能非常大（几秒），导致游戏状态跳变。`maxDeltaTime` 将其钳制到合理范围。

### frame — number
自 `start()` 以来的总帧数。只读。

### keyboard / mouse / touch / gamepads
对应的输入设备实例。如果构造函数中未传入，对应属性为 undefined。

### systems — ComponentSystemRegistry
所有组件系统注册表：

```typescript
const system = app.systems.camera; // CameraComponentSystem
```

### scripts — ScriptRegistry
脚本注册表（仅当使用 Script 系统时）。

## 生命周期方法

### start()
```typescript
app.start();  // 启动应用主循环
```
调用后引擎开始：渲染循环 → 组件更新 → 脚本生命周期 → 每帧 `update` 事件。

### update(dt)
```typescript
app.on('update', (dt: number) => {
    // dt = 上一帧距今的秒数 × timeScale
    // 如 60fps 下 dt ≈ 0.0167
});
```
每帧触发。`dt` 已经乘以 `timeScale`。

### destroy()
```typescript
app.destroy();  // 完全销毁应用
```
清理所有资源、停止渲染循环。触发 `destroy` 事件。

## 事件

| 事件 | 触发时机 | 参数 |
|------|----------|------|
| `update` | 每帧 | `(dt: number)` |
| `start` | `app.start()` 之后 | 无 |
| `destroy` | `app.destroy()` 时 | 无 |
| `prerender` | 渲染之前 | 无 |
| `postrender` | 渲染之后 | 无 |

## 调试方法

```typescript
// 绘制线段
app.drawLine(
    new pc.Vec3(0, 0, 0),   // 起点
    new pc.Vec3(1, 0, 0),   // 终点
    pc.Color.RED              // 颜色
);

// 绘制线框球
app.drawWireSphere(
    new pc.Vec3(0, 2, 0),   // 球心
    0.5,                      // 半径
    pc.Color.GREEN
);

// 绘制线框盒
app.drawWireAlignedBox(
    new pc.Vec3(0, 0, -2),  // 中心
    new pc.Vec3(1, 1, 1),   // 半尺寸
    pc.Color.BLUE
);
```

## 应用初始化完整流程

```typescript
// 1. 创建
const app = new Application(canvas, {
    mouse: new Mouse(canvas),
    touch: new TouchDevice(canvas),
    elementInput: new ElementInput(canvas)  // VR UI 必需
});

// 2. Canvas 配置
app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
app.setCanvasResolution(RESOLUTION_AUTO);

// 3. 窗口响应
window.addEventListener('resize', () => app.resizeCanvas());
app.once('destroy', () => { /* 清理 */ });

// 4. 异步初始化（加载资源）
await loadAssets();

// 5. 启动
app.start();

// 6. 每帧更新
app.on('update', (dt) => { myApp.update(dt); });
```

## 关键 API 速查

```typescript
// 构造函数
new Application(canvas, { mouse, touch, keyboard, gamepads, elementInput })

// Canvas
app.setCanvasFillMode(FILLMODE_FILL_WINDOW | KEEP_ASPECT | NONE)
app.setCanvasResolution(RESOLUTION_AUTO | FIXED)
app.resizeCanvas()

// 核心属性
app.root          // Entity 根节点
app.scene         // Scene 场景配置
app.assets        // AssetRegistry 资源管理
app.xr            // XrManager XR会话
app.graphicsDevice // GraphicsDevice
app.keyboard / app.mouse / app.touch / app.gamepads
app.systems       // 组件系统注册表
app.scripts       // 脚本注册表

// 渲染控制
app.autoRender: boolean        // 是否每帧自动渲染
app.renderNextFrame: boolean   // 下一帧渲染（autoRender=false 时）
app.timeScale: number          // 时间缩放（默认 1）
app.maxDeltaTime: number       // dt 上限（默认 0.1）

// 生命周期
app.start()                    // 启动
app.destroy()                  // 销毁
app.on('update', (dt) => {})   // 每帧
app.once('destroy', () => {})  // 销毁时

// 调试
app.drawLine(origin, end, color?)
app.drawWireSphere(center, radius, color?)
app.drawWireAlignedBox(center, halfExtents, color?)
```
