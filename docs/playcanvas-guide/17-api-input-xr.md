# 17 - 输入与 XR

> 涵盖：`GamePads`、`XrManager`、`XrInput`、`XrInputSource`、`Picker`

## GamePads（游戏手柄）

### 访问

```typescript
const gamepads = app.gamepads;  // GamePads 实例（继承自 EventHandler）
```

⚠️ **在 VR 中**：VR 控制器的按钮也通过 XR 输入源的 `gamepad` 属性访问（不是 `app.gamepads`）。

### GamePads 属性

```typescript
gamepads.gamepadsSupported: boolean   // 设备是否支持手柄
gamepads.current: GamePad[]           // 当前连接的所有手柄
```

### GamePads 事件

```typescript
gamepads.on('gamepadconnected', (pad: GamePad) => {
    console.log('手柄连接:', pad.id);
    // pad.mapping: string  - 映射名称（'standard' 表示标准映射）
    // pad.buttons: GamepadButton[]  - 按钮数组
    // pad.axes: number[]           - 轴数组
});

gamepads.on('gamepaddisconnected', (pad: GamePad) => {
    console.log('手柄断开:', pad.id);
});
```

### GamePad 对象

```typescript
interface GamePad {
    id: string;                         // 设备标识符
    index: number;                      // 手柄索引
    mapping: string;                    // 'standard' | ''
    connected: boolean;
    buttons: GamepadButton[];           // 按钮数组
    axes: number[];                     // 轴数组 [-1, 1]
    timestamp: number;
    previousButtons: GamepadButton[];   // 上一帧按钮状态
}

interface GamepadButton {
    pressed: boolean;                   // 是否按下
    touched: boolean;                   // 是否触摸
    value: number;                      // 压力值 0~1
}
```

### 轮询 vs 事件

桌面手柄可以通过 `gamepads.current` 轮询：

```typescript
update(dt: number): void {
    const pads = app.gamepads?.current ?? [];
    for (const pad of pads) {
        if (pad.buttons[0].pressed) { /* A 按钮 */ }
        const stickX = pad.axes[0];    // 左摇杆
        const stickY = pad.axes[1];
    }
}
```

---

## XrManager（XR 会话管理器）

`app.xr` 是 `XrManager` 实例，继承自 `EventHandler`。控制整个 VR/AR 会话。

### 属性

```typescript
app.xr.supported: boolean          // 浏览器是否支持 WebXR
app.xr.active: boolean             // 当前是否有活跃的 XR 会话
app.xr.type: string | null         // 会话类型：'vr' | 'ar' | null
app.xr.spaceType: string           // 参考空间类型
app.xr.camera: Entity | null       // XR 相机实体
app.xr.views: XrViews              // 左右眼视图
app.xr.input: XrInput              // XR 输入管理器
app.xr.hand: XrHand | null         // 手部追踪（如有）
app.xr.domOverlay: XrDomOverlay | null  // DOM Overlay（仅 AR）
app.xr.imageTracking: XrImageTracking | null
app.xr.planeDetection: XrPlaneDetection | null
app.xr.meshDetection: XrMeshDetection | null
app.xr.hitTest: XrHitTest | null
app.xr.lightEstimation: XrLightEstimation | null
app.xr.anchors: XrAnchors | null
```

### 启动/停止会话

```typescript
// 检查可用性
if (app.xr.isAvailable(pc.XRTYPE_VR)) {
    // 启动 VR 会话
    app.xr.start(
        cameraEntity,                    // Camera Entity
        pc.XRTYPE_VR,                    // 会话类型
        pc.XRSPACE_LOCALFLOOR            // 参考空间
    );
}

// 停止
app.xr.end();
```

**参考空间类型**：
- `XRSPACE_LOCAL` — 本地空间（原点可随时间漂移）
- `XRSPACE_LOCALFLOOR` — 本地地面（原点有正确的地面高度）← **最常用**
- `XRSPACE_BOUNDEDFLOOR` — 带边界的地面空间（房间尺度）
- `XRSPACE_UNBOUNDED` — 无边界空间（大空间）

### 静态检查方法

```typescript
// 在创建 Application 之前检查（用于选择 WebGPU vs WebGL2）
XrManager.isSupportedDevice(deviceType, sessionType): Promise<boolean>
```

### XrManager 事件

```typescript
// 可用性变化
app.xr.on('available', (type: string, available: boolean) => {
    console.log(`XR ${type}: ${available}`);
});
app.xr.on('available:vr', (available) => { });  // 按类型监听

// 会话生命周期
app.xr.on('start', () => {
    // 会话开始 → 初始化 VR 控制器、交互系统
});
app.xr.on('end', () => {
    // 会话结束 → 清理 VR 资源
});

// 每帧更新（接收 WebXR 原始 XRFrame）
app.xr.on('update', (frame: XRFrame) => {
    // 可直接访问底层 WebXR API
});

// 错误
app.xr.on('error', (error: Error) => {
    console.error('XR 错误:', error.message);
});
```

---

## XrInput（XR 输入管理器）

`app.xr.input` 是 `XrInput` 实例，管理所有 XR 输入源。

### 属性

```typescript
app.xr.input.inputSources: XrInputSource[]   // 所有输入源
```

### XrInput 事件

```typescript
// 输入源连接/断开
app.xr.input.on('add', (inputSource: XrInputSource) => {
    // 新的控制器/手连接
});
app.xr.input.on('remove', (inputSource: XrInputSource) => {
    // 控制器断开
});

// 选择（扳机）
app.xr.input.on('select', (inputSource: XrInputSource, evt: XRInputSourceEvent) => {
    // 每次扳机按下触发一次
    // ⚠️ 推荐用于射线拾取交互
});
app.xr.input.on('selectstart', (inputSource, evt) => {
    // 扳机开始按下
});
app.xr.input.on('selectend', (inputSource, evt) => {
    // 扳机释放
});

// 挤压（Grip）
app.xr.input.on('squeeze', (inputSource, evt) => { });
app.xr.input.on('squeezestart', (inputSource, evt) => { });
app.xr.input.on('squeezeend', (inputSource, evt) => { });
```

### `add` vs `remove` 事件的本质区别

- `add`：新控制器进入 XR 会话时触发。**此时 `handedness` 可能为 `undefined`**
- `remove`：控制器离开时触发。此时 handedness 已确定

---

## XrInputSource（XR 输入源）

每个控制器/手部为一个 `XrInputSource`，继承自 `EventHandler`。

### 属性

```typescript
inputSource.handedness: string | undefined    // 'left' | 'right' | undefined
inputSource.targetRayMode: string             // 'gaze' | 'tracked-pointer' | 'screen'
inputSource.profiles: string[]               // 控制器型号描述
inputSource.grip: boolean                     // 是否有 grip 空间
inputSource.hand: XrHand | null              // 手部追踪（如有）
inputSource.selecting: boolean                // 扳机是否按下中
inputSource.squeezing: boolean               // Grip 是否按下中
inputSource.gamepad: Gamepad | null          // ⚠️ 访问按钮/摇杆
inputSource.hitTestSources: XrHitTestSource[] // 命中测试源
```

### 姿态方法

```typescript
// 世界空间姿态（相对于 XR 参考空间）
inputSource.getPosition(): Vec3 | null       // Grip 按钮的世界位置
inputSource.getRotation(): Quat | null       // Grip 按钮的世界旋转
inputSource.getOrigin(): Vec3 | null         // 射线起点（世界）
inputSource.getDirection(): Vec3 | null      // 射线方向（世界，归一化）

// 局部空间姿态（相对于 app.root / 相机）
inputSource.getLocalPosition(): Vec3 | null  // Grip 按钮的局部位置
inputSource.getLocalRotation(): Quat | null  // Grip 按钮的局部旋转
```

⚠️ 这些方法**每帧都可能不同**，必须在 `update()` 循环中每帧读取。

### XrInputSource 事件

```typescript
inputSource.on('remove', () => {
    // 该输入源被移除
});
inputSource.on('select', (evt: XRInputSourceEvent) => { });
inputSource.on('selectstart', (evt) => { });
inputSource.on('selectend', (evt) => { });
inputSource.on('squeeze', (evt) => { });
inputSource.on('squeezestart', (evt) => { });
inputSource.on('squeezeend', (evt) => { });
```

---

## VR 控制器输入完整模式

### 模式 1：更新姿态 + 按钮轮询（推荐）

```typescript
update(dt: number): void {
    for (const inputSource of this.app.xr.input.inputSources) {
        // 每帧同步控制器实体位置
        const pos = inputSource.getLocalPosition();
        const rot = inputSource.getLocalRotation();
        if (pos) controllerEntity.setLocalPosition(pos);
        if (rot) controllerEntity.setLocalRotation(rot);

        // 按钮轮询
        const gamepad = (inputSource as any).gamepad;
        if (gamepad) {
            // 按钮（pressed = 持续按住）
            const trigger = gamepad.buttons[0]?.pressed ?? false;
            const grip = gamepad.buttons[1]?.pressed ?? false;

            // 摇杆
            const stickX = gamepad.axes[2] ?? 0;
            const stickY = gamepad.axes[3] ?? 0;
        }
    }
}
```

### 模式 2：事件驱动拾取

```typescript
app.xr.input.on('select', (inputSource) => {
    if (inputSource.handedness !== 'right') return;

    const origin = inputSource.getOrigin();
    const direction = inputSource.getDirection();
    if (!origin || !direction) return;

    ray.set(origin, direction);
    const hit = registry.pick(ray);
    if (hit) {
        // 处理拾取
    }
});
```

### 模式 3：上升沿检测（单次触发）

```typescript
// 在 update 中
private prevYState = false;

update() {
    const yPressed = gamepad?.buttons[5]?.pressed ?? false;
    if (yPressed && !this.prevYState) {
        // Y 按钮刚被按下——只触发一次
        this.onYButtonPressed?.();
    }
    this.prevYState = yPressed;
}
```

### Meta Quest 按钮/摇杆映射

```
索引  0: Trigger     (XRPAD_TRIGGER)
索引  1: Grip        (XRPAD_SQUEEZE)
索引  4: X(左) / A(右)
索引  5: Y(左) / B(右)
axes[2]: 右摇杆 X
axes[3]: 右摇杆 Y
```

### ⚠️ handedness 时序问题

```typescript
// ❌ 'add' 事件中 handedness 为 undefined
app.xr.input.on('add', (inputSource) => {
    console.log(inputSource.handedness);  // undefined!
});

// ✅ 在 update 中检测
update() {
    for (const inputSource of inputSources) {
        if (controller.needsAssignment && inputSource.handedness) {
            if (inputSource.handedness === 'right') {
                this.rightController = controller;
            }
            controller.needsAssignment = false;
        }
    }
}
```

---

## Picker（拾取器）

Picker 是 PlayCanvas 2.x 内置的基于 GPU 的拾取系统，可以实现像素级精确拾取。

### 创建

```typescript
const picker = new pc.Picker(
    app,           // AppBase 实例
    width,         // 拾取缓冲区宽度（像素）
    height,        // 拾取缓冲区高度（像素）
    depth          // 是否启用深度拾取（默认 false）
);
```

### 属性和方法

```typescript
picker.width: number                    // 拾取缓冲区宽度
picker.height: number                   // 拾取缓冲区高度

// 准备（每帧渲染前调用）
picker.prepare(camera: CameraComponent, scene: Scene, layers: Layer[])

// 获取拾取结果
picker.getSelection(x: number, y: number): {
    meshInstance?: MeshInstance;         // 命中的 MeshInstance
    gsplat?: GSplatComponent;           // 命中的 GSplat 组件
    depth?: number;                     // 深度值（如果启用 depth）
} | null

// 销毁
picker.destroy()
```

### 使用流程

```typescript
// 1. 创建
const picker = new pc.Picker(app, canvas.width, canvas.height);

// 2. 在渲染前准备（如在 prerender 事件中）
app.scene.on('prerender', (camera) => {
    picker.prepare(camera, app.scene, camera.layers);
});

// 3. 拾取（渲染完成后）
app.scene.on('postrender', () => {
    const result = picker.getSelection(mouseX, mouseY);
    if (result?.meshInstance) {
        const entity = result.meshInstance.node;  // 命中的实体
    }
});
```

### Picker vs AABB 拾取

| | Picker (GPU) | AABB (CPU) |
|---|---|---|
| 精度 | 像素级精确 | 包围盒近似 |
| 性能 | 需要额外渲染 pass | 快速数学运算 |
| GSplat 支持 | ✅ | ✅ (需手动转换 AABB) |
| 使用场景 | 精确点击小物体 | 快速粗选 |

---

## 关键 API 速查

```typescript
// GamePads
app.gamepads.current: GamePad[]
app.gamepads.gamepadsSupported: boolean
app.gamepads.on('gamepadconnected'|'gamepaddisconnected')
pad.buttons[i].pressed
pad.axes[i]

// XrManager
app.xr.supported / .active / .type
app.xr.isAvailable(type): boolean
app.xr.start(camera, type, spaceType)
app.xr.end()
XrManager.isSupportedDevice(deviceType, sessionType): Promise<boolean>
app.xr.on('start'|'end'|'update'|'error'|'available')
app.xr.input / .hand / .hitTest / .planeDetection / .anchors

// XrInput
app.xr.input.inputSources: XrInputSource[]
app.xr.input.on('add'|'remove')
app.xr.input.on('select'|'selectstart'|'selectend')
app.xr.input.on('squeeze'|'squeezestart'|'squeezeend')

// XrInputSource
src.handedness: 'left' | 'right' | undefined
src.selecting: boolean
src.squeezing: boolean
src.targetRayMode: string
src.gamepad: Gamepad | null
src.getOrigin(): Vec3 | null
src.getDirection(): Vec3 | null
src.getPosition(): Vec3 | null
src.getRotation(): Quat | null
src.getLocalPosition(): Vec3 | null
src.getLocalRotation(): Quat | null
src.on('select'|'selectstart'|'squeeze'...)

// Picker
new Picker(app, width, height, depth?)
picker.prepare(camera, scene, layers)
picker.getSelection(x, y): { meshInstance?, gsplat?, depth? } | null
picker.destroy()
```
