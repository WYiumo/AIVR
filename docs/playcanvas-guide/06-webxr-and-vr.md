# 06 - WebXR 与 VR

## 概述

PlayCanvas 通过 `Application` 类内置完整的 WebXR 支持，包括 VR 会话管理、控制器追踪、输入源事件等。VR 开发中最重要的两个组件是 `app.xr`（XrManager）和 `app.xr.input`（XrInput）。

## 前置条件

### 1. 必须使用 Application（不是 AppBase）

```typescript
// ✅ 正确 - Application 自动初始化 XR 系统
const app = new Application(canvas, options);

// ❌ 错误 - AppBase 不会初始化 XR，app.xr 为 undefined
const app = new AppBase(canvas, options);
```

### 2. HTTPS 环境

WebXR 要求 HTTPS 或 localhost。开发时使用 Vite + mkcert 插件：

```typescript
// vite.config.js
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
    plugins: [mkcert()],
    server: { host: '0.0.0.0', https: true }
});
```

## XrManager（VR 会话管理）

### 访问

```typescript
const xrManager = app.xr;  // pc.XrManager
```

### 基本属性

```typescript
app.xr.supported    // boolean - 浏览器是否支持 WebXR
app.xr.active       // boolean - 当前是否有活跃的 VR 会话
app.xr.type         // string - 当前会话类型 ('vr' | 'ar' | null)
app.xr.spaceType    // 参考空间类型
```

### 启动/停止 VR 会话

```typescript
// 检查是否支持 VR
if (app.xr.isAvailable(pc.XRTYPE_VR)) {
    // 进入 VR
    const camera = cameraEntity; // 需要传递一个 camera entity
    app.xr.start(camera, pc.XRTYPE_VR, pc.XRSPACE_LOCALFLOOR);
}

// 退出 VR
app.xr.end();
```

### 事件监听

```typescript
// VR 会话开始
app.xr.on('start', () => {
    console.log('VR 会话已开始');
    // 初始化控制器、交互系统等
});

// VR 会话结束
app.xr.on('end', () => {
    console.log('VR 会话已结束');
    // 清理 VR 相关资源
});

// 会话错误
app.xr.on('error', (error: Error) => {
    console.error('VR 错误:', error);
});

// 可用性变化
app.xr.on('available', (type: string, available: boolean) => {
    console.log(`XR 类型 ${type} 可用:`, available);
});
```

## VrManager 封装类（推荐模式）

将 VR 会话管理封装成独立类：

```typescript
import * as pc from 'playcanvas';

export class VrManager {
    private app: pc.Application;
    private events: Map<string, Array<(...args: any[]) => void>> = new Map();

    constructor(app: pc.Application) {
        this.app = app;
    }

    /**
     * 进入 VR
     */
    enterVR(camera: pc.Entity): void {
        if (!this.app.xr.isAvailable(pc.XRTYPE_VR)) {
            console.error('VR 不可用');
            return;
        }
        this.app.xr.start(camera, pc.XRTYPE_VR, pc.XRSPACE_LOCALFLOOR);
    }

    /**
     * 退出 VR
     */
    exitVR(): void {
        if (this.app.xr.active) {
            this.app.xr.end();
        }
    }

    // 事件系统
    on(event: string, callback: (...args: any[]) => void): void {
        if (!this.events.has(event)) this.events.set(event, []);
        this.events.get(event)!.push(callback);
    }

    private emit(event: string, ...args: any[]): void {
        const callbacks = this.events.get(event);
        if (callbacks) {
            for (const cb of callbacks) cb(...args);
        }
    }

    // 初始化（监听 XR 生命周期）
    init(): void {
        this.app.xr.on('start', () => this.emit('sessionstart'));
        this.app.xr.on('end', () => this.emit('sessionend'));
    }
}
```

## XR Input（VR 控制器输入）

### 输入源结构

```typescript
app.xr.input              // pc.XrInput
app.xr.input.inputSources // pc.XrInputSource[]
```

### XrInputSource（控制器）

```typescript
interface XrInputSource {
    handedness: string | undefined;  // 'left' | 'right' | undefined
    targetRayMode: string;           // 'poke' | 'gaze' | 'screen' 等
    selecting: boolean;              // 是否正在按扳机
    squeezing: boolean;              // 是否正在按 Grip
    profiles: string[];              // 控制器类型
    grip: boolean;                   // 是否有 grip 空间
    gamepad: Gamepad | null;         // Gamepad 对象
    hitTestSources: any[];

    // 世界空间姿态
    getPosition(): pc.Vec3 | null;
    getRotation(): pc.Quat | null;
    getOrigin(): pc.Vec3 | null;          // 射线起点
    getDirection(): pc.Vec3 | null;       // 射线方向

    // 局部空间姿态
    getLocalPosition(): pc.Vec3 | null;
    getLocalRotation(): pc.Quat | null;
}
```

### 控制器事件

```typescript
// 控制器添加
app.xr.input.on('add', (inputSource: pc.XrInputSource) => {
    // 创建一个 controller entity
    const entity = new pc.Entity('Controller_' + (inputSource.handedness ?? '?'));
    app.root.addChild(entity);
    // 注：此时 inputSource.handedness 可能为 undefined！
});

// 控制器移除
app.xr.input.on('remove', (inputSource: pc.XrInputSource) => {
    // 清理该控制器
    entity.destroy();
});

// 选择（扳机）
app.xr.input.on('select', (inputSource: pc.XrInputSource) => {
    // 每次扳机按下触发一次
    // 推荐用于拾取交互
});

app.xr.input.on('selectstart', (inputSource: pc.XrInputSource) => {
    // 扳机开始按下
});

app.xr.input.on('selectend', (inputSource: pc.XrInputSource) => {
    // 扳机释放
});

// 挤压（Grip）
app.xr.input.on('squeezestart', (inputSource: pc.XrInputSource) => {
    // Grip 开始按下
});

app.xr.input.on('squeezeend', (inputSource: pc.XrInputSource) => {
    // Grip 释放
});
```

## VR 控制器管理完整实现

以下是 AIVR 项目 `VrController` 的核心模式：

### 1. 控制器状态管理

```typescript
interface ControllerInfo {
    inputSource: pc.XrInputSource;
    entity: pc.Entity;
    isGrabbing: boolean;
    needsAssignment: boolean;  // 等待 handedness 可用
    modelAsset: pc.Asset | null;
}
```

### 2. 控制器连接/断开

```typescript
class VrController {
    private controllers: ControllerInfo[] = [];
    private leftController: ControllerInfo | null = null;
    private rightController: ControllerInfo | null = null;

    constructor(app: pc.Application) {
        this.app = app;
        this.setupControllers();
    }

    private setupControllers(): void {
        if (!this.app.xr?.input) return;

        this.app.xr.input.on('add', (inputSource: pc.XrInputSource) => {
            const entity = new pc.Entity('Controller_unknown');
            entity.addComponent('light', {
                type: 'point',
                color: new pc.Color(0.2, 0.5, 1.0),
                range: 0.5,
                intensity: 0.5
            });
            this.app.root.addChild(entity);

            this.controllers.push({
                inputSource,
                entity,
                isGrabbing: false,
                needsAssignment: true,
                modelAsset: null
            });
        });

        this.app.xr.input.on('remove', (inputSource: pc.XrInputSource) => {
            const idx = this.controllers.findIndex(c => c.inputSource === inputSource);
            if (idx >= 0) {
                this.controllers[idx].entity.destroy();
                this.controllers.splice(idx, 1);
            }
        });
    }
}
```

### 3. 每帧更新（关键！）

```typescript
update(dt: number): void {
    const inputSources = this.app.xr?.input?.inputSources ?? [];

    for (const inputSource of inputSources) {
        const controller = this.controllers.find(c => c.inputSource === inputSource);
        if (!controller) continue;

        // ✅ 先在 update 中同步位置（每帧都做）
        const position = inputSource.getLocalPosition();
        const rotation = inputSource.getLocalRotation();
        if (position) controller.entity.setLocalPosition(position);
        if (rotation) controller.entity.setLocalRotation(rotation);

        // ✅ 在 update 中检测 handedness（而非 'add' 事件中）
        if (controller.needsAssignment && inputSource.handedness) {
            if (inputSource.handedness === 'right') {
                this.rightController = controller;
            } else if (inputSource.handedness === 'left') {
                this.leftController = controller;
            }
            controller.needsAssignment = false;
        }

        // ⚠️ 关键：替换 GLB 模型必须在 handedness 确定之后
        this.setupControllerModel(controller);
    }

    // 按钮轮询（在 update 中）
    this.pollButtons();
}
```

### 4. GLB 模型替换

```typescript
private setupControllerModel(controller: ControllerInfo): void {
    if (controller.modelAsset) return;

    const handedness = controller.inputSource.handedness;
    if (!handedness) return;  // handedness 尚不可用

    const modelAsset = handedness === 'left'
        ? this.leftModelAsset
        : this.rightModelAsset;
    if (!modelAsset) return;

    const containerResource = modelAsset.resource as any;
    controller.entity.addComponent('model', {
        type: 'asset',
        asset: containerResource?.model,
        castShadows: true
    });

    controller.modelAsset = modelAsset;
}
```

### 5. 按钮轮询（Toggle 模式 + Hold 模式）

```typescript
private pollButtons(): void {
    // Y 按钮（Toggle 模式 - 按下触发一次）
    if (this.leftController) {
        const g = (this.leftController.inputSource as any).gamepad;
        const yPressed = g?.buttons?.[5]?.pressed ?? false;
        if (yPressed && !this.prevYButtonState) {
            this.onYButtonPressed?.();
        }
        this.prevYButtonState = yPressed;
    }

    // Trigger（Toggle 模式）
    if (this.rightController) {
        const g = (this.rightController.inputSource as any).gamepad;
        const tPressed = g?.buttons?.[0]?.pressed ?? false;
        if (tPressed && !this.prevRightTriggerState) {
            this.onRightTriggerToggle?.();
        }
        this.prevRightTriggerState = tPressed;
    }

    // Grip（Hold 模式 - 每帧查询状态）
    if (this.leftController) {
        const g = (this.leftController.inputSource as any).gamepad;
        this.leftGripHeld = g?.buttons?.[1]?.pressed ?? false;
    }
    if (this.rightController) {
        const g = (this.rightController.inputSource as any).gamepad;
        this.rightGripHeld = g?.buttons?.[1]?.pressed ?? false;
    }
}
```

### 6. 按钮回调注册

```typescript
// 设置回调（外部注册）
vrController.setYButtonCallback(() => {
    voicePanel.toggleVisibility();
});

vrController.setXButtonCallback(() => {
    rotationDirection *= -1;
});

// Grip 状态查询（外部每帧调用）
if (vrController.isLeftGripHeld() || vrController.isRightGripHeld()) {
    // 旋转模式
}
```

## 射线可视化

```typescript
drawInputSourceRays(): void {
    if (!this.app.xr?.active) return;

    for (const inputSource of this.app.xr.input.inputSources) {
        if (inputSource.targetRayMode === pc.XRTARGETRAY_POINTER) {
            const origin = inputSource.getOrigin();
            const direction = inputSource.getDirection();
            if (origin && direction) {
                const endPoint = direction.clone().mulScalar(10).add(origin);
                const color = inputSource.selecting
                    ? pc.Color.GREEN
                    : pc.Color.WHITE;
                this.app.drawLine(origin, endPoint, color);
            }
        }
    }
}
```

## VR 交互常用代码

### 获取相机前方位置

```typescript
const camera = scene.getCamera();
const camPos = camera.getPosition();
const forward = camera.forward;

// 相机前方 1.5 米的位置
const targetPos = new pc.Vec3()
    .copy(camPos)
    .add(forward.mulScalar(1.5));
```

### 让物体面向相机

```typescript
panelEntity.lookAt(camera.getPosition());
panelEntity.rotateLocal(-7.5, 180, 0);  // 微调
```

### 检测 VR 活动状态

```typescript
if (app.xr?.active) {
    // 当前在 VR 中
}

if (app.xr?.type === 'vr') {
    // 具体是 VR 模式
}
```

## VR 会话生命周期完整流程

```
1. 用户点击 "Enter VR" 按钮
   └→ vrManager.enterVR(camera)
       └→ app.xr.start(camera, pc.XRTYPE_VR, pc.XRSPACE_LOCALFLOOR)

2. VR 会话开始 → app.xr 触发 'start' 事件
   └→ onVrStart():
       ├→ new VrController(app)      // 开始追踪控制器
       ├→ new InteractionManager()   // 初始化交互系统
       ├→ new VrVoicePanel()         // 创建 VR UI 面板
       └→ 隐藏 DOM 按钮

3. VR 运行时（每帧循环）
   └→ update(dt):
       ├→ vrController.update(dt)     // 更新控制器位置 + 按钮轮询
       └→ interaction.update(dt)      // 处理抓取 + 旋转

4. VR 会话结束 → app.xr 触发 'end' 事件
   └→ onVrEnd():
       ├→ interaction.destroy()
       ├→ voicePanel.destroy()
       ├→ vrController.destroy()
       ├→ splatLoader.destroy()
       └→ 显示 DOM 按钮
```

## Meta Quest 按钮映射参考

| 按钮 | 左手索引 | 右手索引 | 编码常量 |
|------|----------|----------|----------|
| Trigger | 0 | 0 | `XRPAD_TRIGGER` |
| Grip (Squeeze) | 1 | 1 | `XRPAD_SQUEEZE` |
| 摇杆 X | 2 | 2 | `XRPAD_STICK_X` |
| 摇杆 Y | 3 | 3 | `XRPAD_STICK_Y` |
| X / A | 4 | 4 | `XRPAD_A` |
| Y / B | 5 | 5 | `XRPAD_B` |
| 摇杆按钮 | - | - | `XRPAD_STICK_BUTTON` |

## 常见问题

### Q: 为什么 VR 不工作？

检查清单：
1. ✅ 是否使用 `Application` 而非 `AppBase`
2. ✅ 是否启用 HTTPS（WebXR 要求）
3. ✅ 浏览器是否支持 WebXR（Chrome/Edge/Oculus Browser）
4. ✅ `app.xr` 是否为 `undefined`（说明未使用 Application）
5. ✅ `app.xr.isAvailable(pc.XRTYPE_VR)` 是否返回 true

### Q: 控制器位置不更新？

必须在每帧 `update()` 中调用 `getLocalPosition()` 和 `setLocalPosition()`。这些值每帧都可能变化。

### Q: `elementInput` 未初始化导致 VR UI 不响应？

确保 `ElementInput` 在 `Application` 构造函数中传入。如果遗漏，world-space UI 的射线交互不会工作。

### Q: VR DOM Overlay 能用吗？

WebXR DOM Overlay 仅支持 AR 模式，不支持纯 VR。VR 中必须使用 world-space 3D UI。

## 关键 API 汇总

```typescript
// XR 管理器
app.xr.supported / .active / .type
app.xr.isAvailable(type)
app.xr.start(camera, type, spaceType)
app.xr.end()
app.xr.on('start'|'end'|'error'|'available', cb)

// XR 输入
app.xr.input.inputSources
app.xr.input.on('add'|'remove', cb)
app.xr.input.on('select'|'selectstart'|'selectend', cb)
app.xr.input.on('squeeze'|'squeezestart'|'squeezeend', cb)

// XrInputSource
inputSource.handedness        // 'left' | 'right' | undefined
inputSource.selecting         // boolean - 扳机状态
inputSource.squeezing         // boolean - Grip 状态
inputSource.targetRayMode    // string
inputSource.getOrigin()       // Vec3 | null - 射线起点
inputSource.getDirection()    // Vec3 | null - 射线方向
inputSource.getPosition()     // Vec3 | null - grip 位置（世界）
inputSource.getRotation()     // Quat | null - grip 旋转（世界）
inputSource.getLocalPosition() // Vec3 | null - grip 位置（局部）
inputSource.getLocalRotation() // Quat | null - grip 旋转（局部）
inputSource.gamepad           // Gamepad 对象（.buttons[].pressed, .axes[]）
```
