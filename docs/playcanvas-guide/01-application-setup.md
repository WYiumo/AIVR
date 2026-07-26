# 01 - 应用初始化

## 概述

PlayCanvas 应用的生命周期从创建 `Application` 实例开始。`Application` 是 `AppBase` 的子类，它会自动初始化所有组件系统（包括 XR、UI 等），是启动 WebXR 应用的**必需选择**。

> **⚠️ 重要**：必须使用 `Application` 而非 `AppBase`。`AppBase` 不会自动初始化 XR 系统，导致 VR 功能不可用。

## Application 创建

### 基本创建模式

```typescript
import {
    Application,
    FILLMODE_FILL_WINDOW,
    RESOLUTION_AUTO,
    Mouse,
    TouchDevice,
    ElementInput
} from 'playcanvas';

// 1. 获取 Canvas 元素
const canvas = document.getElementById('application-canvas') as HTMLCanvasElement;

// 2. 创建 Application
const app = new Application(canvas, {
    mouse: new Mouse(canvas),
    touch: new TouchDevice(canvas),
    elementInput: new ElementInput(canvas)  // 启用 UI 交互
});

// 3. 配置 Canvas 自适应
app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
app.setCanvasResolution(RESOLUTION_AUTO);

// 4. 启动应用
app.start();
```

### Application 构造函数参数

```typescript
new Application(canvas: HTMLCanvasElement, options?: {
    mouse?: Mouse;              // 鼠标输入设备
    touch?: TouchDevice;        // 触摸输入设备
    keyboard?: Keyboard;        // 键盘输入设备
    gamepads?: GamePads;       // 游戏手柄
    elementInput?: ElementInput; // UI 元素输入（world-space UI 必需）
    graphicsDeviceOptions?: {};  // 图形设备选项
    xr?: boolean;               // 是否启用 XR（默认 true）
})
```

### Application vs AppBase

| 特性 | Application | AppBase |
|------|-------------|---------|
| XR 初始化 | ✅ 自动 | ❌ 需手动 |
| Element 系统 | ✅ 自动注册 | ❌ 需手动 |
| 组件系统 | ✅ 完整 | ⚠️ 基础 |
| **推荐用途** | **VR/XR 应用** | 自定义应用 |

## Canvas 配置

### 填充模式

```typescript
// 填满窗口（推荐）
app.setCanvasFillMode(FILLMODE_FILL_WINDOW);

// 保持宽高比
app.setCanvasFillMode(FILLMODE_KEEP_ASPECT);

// 不缩放
app.setCanvasFillMode(FILLMODE_NONE);
```

### 分辨率模式

```typescript
// 自动匹配（推荐）
app.setCanvasResolution(RESOLUTION_AUTO);

// 固定分辨率
app.setCanvasResolution(RESOLUTION_FIXED);
```

### 窗口大小响应

```typescript
const resize = () => app.resizeCanvas();
window.addEventListener('resize', resize);
app.once('destroy', () => {
    window.removeEventListener('resize', resize);
});
```

## 渲染循环

PlayCanvas 使用事件驱动的更新循环：

```typescript
// 每帧更新（dt 为帧间隔，单位：秒）
app.on('update', (dt: number) => {
    // 在这里执行每帧逻辑
    myApp.update(dt);
});
```

### 其他生命周期事件

```typescript
// 应用启动后（第一帧渲染前）
app.on('start', () => { });

// 渲染前
app.on('prerender', () => { });

// 渲染后（用于后处理）
app.on('postrender', () => { });

// 应用销毁
app.on('destroy', () => { });
```

## 完整初始化示例

以下是 AIVR 项目的完整初始化流程：

```typescript
// main.ts
import './style.css';
import {
    Application, FILLMODE_FILL_WINDOW, RESOLUTION_AUTO,
    Mouse, TouchDevice, ElementInput
} from 'playcanvas';
import { App } from './app';

async function initApp() {
    const canvas = document.getElementById('application-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');

    // 1. 创建 Application
    const app = new Application(canvas, {
        mouse: new Mouse(canvas),
        touch: new TouchDevice(canvas),
        elementInput: new ElementInput(canvas)  // VR UI 必需
    });

    // 2. 配置 Canvas
    app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(RESOLUTION_AUTO);

    // 3. 窗口大小响应
    const resize = () => app.resizeCanvas();
    window.addEventListener('resize', resize);
    app.once('destroy', () => window.removeEventListener('resize', resize));

    // 4. 创建自定义应用实例
    const aivrApp = new App(app, { debug: true });

    // 5. 异步初始化（加载资源等）
    await aivrApp.init();

    // 6. 启动渲染
    app.start();

    // 7. 挂载更新循环
    app.on('update', (dt: number) => aivrApp.update(dt));
}

initApp().catch(console.error);
```

## App 类设计模式

推荐创建一个自定义的 `App` 类作为薄协调层，管理各子系统：

```typescript
export class App {
    private app: pc.Application;
    private scene: Scene;              // 场景管理 (src/app/scene.ts)
    private vrManager: VrManager;      // VR 会话 (src/manager/vr-manager.ts)
    private assetManager: AssetManager; // 资源管理 (src/manager/asset-manager.ts)

    constructor(app: pc.Application, config: AppConfig) { }

    async init(): Promise<void> {
        // 1. 加载预置资源
        await this.assetManager.loadInitAsset();
        // 2. 初始化场景
        await this.scene.init();
        // 3. 创建相机
        this.createCamera();
        // 4. 加载字体
        await this.initFonts();
        // 5. 设置 VR 事件
        this.setupVrEvents();
    }

    update(dt: number): void {
        this.vrController?.update(dt);
        this.interaction?.update(dt);
        this.scene.update(dt);
    }
}
```

## 常见问题

### Q: 为什么必须使用 Application 而不是 AppBase？

`AppBase` 是底层基类，不自动初始化 XR 系统。`Application` 在其基础上增加了：
- XR 管理器自动初始化（`app.xr`）
- Element 组件系统注册
- 完整的组件系统（model, camera, light, screen, button 等）

如果使用 `AppBase`，VR 功能将无法正常工作，`app.xr` 为 `undefined`。

### Q: ElementInput 为什么必须在构造函数中传入？

`ElementInput` 系统处理鼠标/触摸/XR 射线对 UI 元素的交互。如果在创建 `Application` 之后才添加，会导致 world-space UI 的射线检测失效。必须在构造函数中传入，这样 Engine 初始化时就会正确注册。

### Q: 如何获取 PlayCanvas Application 实例？

```typescript
// 1. 通过构造函数保存引用
const app = new Application(canvas, options);

// 2. 通过 Entity 向上查找
entity.app; // pc.Application

// 3. 通过全局注册表（不推荐）
// Application 实例没有全局单例
```

## 关键 API 汇总

```typescript
// 创建
new Application(canvas, options)

// Canvas 配置
app.setCanvasFillMode(mode)
app.setCanvasResolution(mode)
app.resizeCanvas()

// 生命周期
app.start()
app.on('update', (dt) => {})
app.on('start', () => {})
app.once('destroy', () => {})

// 访问
app.root          // pc.Entity - 场景根节点
app.scene         // pc.Scene - 场景对象
app.assets        // pc.AssetRegistry - 资源注册表
app.xr            // pc.XrManager - XR 管理器
app.graphicsDevice // pc.GraphicsDevice - 图形设备
app.systems       // 组件系统注册表

// 调试
app.drawLine(origin, endPoint, color)   // 绘制调试线段
app.renderNextFrame = true              // 强制渲染下一帧
```
