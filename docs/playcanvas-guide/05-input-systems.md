# 05 - 输入系统

## 概述

PlayCanvas 支持多种输入设备：鼠标、触摸、键盘、游戏手柄和 XR 输入源。输入系统通过事件驱动和轮询两种方式工作。

## 输入设备初始化

输入设备在创建 `Application` 时传入：

```typescript
import { Application, Mouse, TouchDevice, Keyboard, ElementInput } from 'playcanvas';

const app = new Application(canvas, {
    mouse: new Mouse(canvas),
    touch: new TouchDevice(canvas),
    keyboard: new Keyboard(window),     // 可选
    elementInput: new ElementInput(canvas)  // UI 交互必需
});
```

### 检查设备支持

```typescript
// 检查触摸支持
if (app.touch) {
    console.log('触摸设备已启用');
}

// 检查键盘支持
if (app.keyboard) {
    console.log('键盘设备已启用');
}
```

## Mouse（鼠标）

### 事件监听

```typescript
// 鼠标按下
app.mouse.on('mousedown', (event: pc.MouseEvent) => {
    console.log('按下:', event.button);  // MOUSEBUTTON_LEFT / _MIDDLE / _RIGHT
    console.log('位置:', event.x, event.y);
});

// 鼠标释放
app.mouse.on('mouseup', (event: pc.MouseEvent) => {
    console.log('释放:', event.button);
});

// 鼠标移动
app.mouse.on('mousemove', (event: pc.MouseEvent) => {
    // event.dx, event.dy = 相对上一帧的移动量
    console.log('移动:', event.dx, event.dy);
});

// 滚轮
app.mouse.on('mousewheel', (event: pc.MouseEvent) => {
    console.log('滚轮:', event.wheelDelta);
});
```

### 事件对象属性

```typescript
interface MouseEvent {
    x: number;           // 屏幕 X 坐标
    y: number;           // 屏幕 Y 坐标
    dx: number;          // X 移动量
    dy: number;          // Y 移动量
    button: number;      // MOUSEBUTTON_LEFT (0) | _MIDDLE (1) | _RIGHT (2)
    wheelDelta: number;  // 滚轮变化量
    element: Element;    // 被点击的 UI 元素（如有）
}
```

### 按键常量

```typescript
pc.MOUSEBUTTON_NONE   // 0
pc.MOUSEBUTTON_LEFT   // 0
pc.MOUSEBUTTON_MIDDLE // 1
pc.MOUSEBUTTON_RIGHT  // 2
```

### 轮询状态

```typescript
// 在 update 循环中检查
if (app.mouse.isPressed(pc.MOUSEBUTTON_LEFT)) {
    // 左键正在被按下
}

// 检查单次点击（从上一帧到当前帧之间按下）
if (app.mouse.wasPressed(pc.MOUSEBUTTON_LEFT)) {
    // 左键刚被按下
}

// 检查释放
if (app.mouse.wasReleased(pc.MOUSEBUTTON_LEFT)) {
    // 左键刚被释放
}
```

## Touch（触摸）

### 事件监听

```typescript
// 触摸开始
app.touch.on('touchstart', (event: pc.TouchEvent) => {
    for (const touch of event.touches) {
        console.log('触摸开始:', touch.id, touch.x, touch.y);
    }
});

// 触摸移动
app.touch.on('touchmove', (event: pc.TouchEvent) => {
    for (const touch of event.touches) {
        console.log('触摸移动:', touch.id, touch.x, touch.y);
    }
});

// 触摸结束
app.touch.on('touchend', (event: pc.TouchEvent) => {
    for (const touch of event.touches) {
        console.log('触摸结束:', touch.id);
    }
});
```

### Touch 对象

```typescript
interface Touch {
    id: number;       // 触摸点 ID
    x: number;        // 屏幕 X
    y: number;        // 屏幕 Y
    element: Element; // 被触摸的 UI 元素
}
```

## Keyboard（键盘）

### 事件监听

```typescript
// 键盘按下
app.keyboard.on('keydown', (event: pc.KeyboardEvent) => {
    console.log('按下:', event.key);  // pc.KEY_A, pc.KEY_SPACE 等
});

// 键盘释放
app.keyboard.on('keyup', (event: pc.KeyboardEvent) => {
    console.log('释放:', event.key);
});
```

### 按键常量

```typescript
// 字母键
pc.KEY_A, pc.KEY_B, ..., pc.KEY_Z

// 数字键
pc.KEY_0, pc.KEY_1, ..., pc.KEY_9

// 功能键
pc.KEY_F1, ..., pc.KEY_F12

// 特殊键
pc.KEY_SPACE      // 空格
pc.KEY_ENTER      // 回车
pc.KEY_ESCAPE     // ESC
pc.KEY_TAB        // Tab
pc.KEY_SHIFT      // Shift
pc.KEY_CONTROL    // Ctrl
pc.KEY_ALT        // Alt
pc.KEY_META       // Win/Cmd

// 方向键
pc.KEY_LEFT, pc.KEY_RIGHT, pc.KEY_UP, pc.KEY_DOWN

// 导航键
pc.KEY_HOME, pc.KEY_END, pc.KEY_PAGE_UP, pc.KEY_PAGE_DOWN
pc.KEY_INSERT, pc.KEY_DELETE, pc.KEY_BACKSPACE
```

### 轮询

```typescript
// 在 update 循环中
if (app.keyboard.isPressed(pc.KEY_W)) {
    // W 键被按住
}
if (app.keyboard.wasPressed(pc.KEY_SPACE)) {
    // 空格键刚被按下（单次）
}
```

## ElementInput（UI 元素输入）

`ElementInput` 处理鼠标/触摸/XR 射线对 UI 元素的交互。它是 world-space UI 在 VR 中交互的**必需组件**。

### 配置

```typescript
// 必须在 Application 创建时传入
const app = new Application(canvas, {
    elementInput: new ElementInput(canvas)
});
```

### 工作原理

- 自动处理鼠标/触摸/XR 射线与 `useInput: true` 的 Element 组件的交集检测
- 射线进入/离开元素时触发 `mouseenter`/`mouseleave` 事件
- 按钮按下时触发 `click`/`selectstart` 事件

### 事件

```typescript
// 点击事件
element.button.on('click', () => { /* 鼠标/触摸点击 */ });

// XR 射线选择事件
element.button.on('selectstart', () => { /* XR 射线选中 */ });
```

## Gamepad（游戏手柄）

### 基本用法

```typescript
// 在 update 循环中轮询
const gamepads = app.gamepads?.gamepads ?? [];

for (const gamepad of gamepads) {
    // 按钮
    gamepad.buttons[0].pressed;  // A 按钮
    gamepad.buttons[1].pressed;  // B 按钮

    // 摇杆轴
    gamepad.axes[0];  // 左摇杆 X (-1 to 1)
    gamepad.axes[1];  // 左摇杆 Y (-1 to 1)
    gamepad.axes[2];  // 右摇杆 X (-1 to 1)
    gamepad.axes[3];  // 右摇杆 Y (-1 to 1)
}
```

## XR 输入系统

XR 输入源是 VR 中最常用的输入方式。以下为概要，详细请参考 [06 - WebXR 与 VR](06-webxr-and-vr.md)。

### 输入源事件

```typescript
// 控制器连接
app.xr.input.on('add', (inputSource: pc.XrInputSource) => {
    // 新控制器连接
});

// 控制器断开
app.xr.input.on('remove', (inputSource: pc.XrInputSource) => {
    // 控制器断开
});

// 选择事件（扳机按下）
app.xr.input.on('select', (inputSource: pc.XrInputSource) => {
    // 扳机按下事件（推荐用于拾取交互）
});

app.xr.input.on('selectstart', (inputSource: pc.XrInputSource) => {
    // 扳机开始按下
});

app.xr.input.on('selectend', (inputSource: pc.XrInputSource) => {
    // 扳机释放
});

// 挤压事件（Grip）
app.xr.input.on('squeeze', (inputSource: pc.XrInputSource) => { });
app.xr.input.on('squeezestart', (inputSource: pc.XrInputSource) => { });
app.xr.input.on('squeezeend', (inputSource: pc.XrInputSource) => { });
```

### XrInputSource 属性和方法

```typescript
// 基本信息
inputSource.handedness     // 'left' | 'right' | undefined
inputSource.targetRayMode  // pc.XRTARGETRAY_POINTER | _GAZE | _SCREEN

// 状态
inputSource.selecting      // 是否正在按扳机
inputSource.squeezing      // 是否正在按 Grip

// 获取姿态
const position = inputSource.getPosition();       // Vec3 | null
const rotation = inputSource.getRotation();       // Quat | null
const origin = inputSource.getOrigin();           // Vec3 | null（射线起点）
const direction = inputSource.getDirection();     // Vec3 | null（射线方向）
const localPos = inputSource.getLocalPosition();  // Vec3 | null
const localRot = inputSource.getLocalRotation();  // Quat | null

// 获取手柄按钮（Gamepad API）
const gamepad = inputSource.gamepad;  // Gamepad 对象
```

### Meta Quest 按钮映射

| 索引 | 左手 | 右手 |
|------|------|------|
| 0 | Trigger | Trigger |
| 1 | Grip | Grip |
| 4 | X | A |
| 5 | Y | B |

### VR 控制器输入轮询模式

```typescript
// 在 update() 循环中轮询按钮状态
update(dt: number): void {
    const inputSources = this.app.xr?.input?.inputSources ?? [];

    for (const inputSource of inputSources) {
        // 更新控制器位置
        const pos = inputSource.getLocalPosition();
        const rot = inputSource.getLocalRotation();
        if (pos) controllerEntity.setLocalPosition(pos);
        if (rot) controllerEntity.setLocalRotation(rot);

        // 轮询按钮
        const gamepad = (inputSource as any).gamepad;
        if (gamepad) {
            const triggerPressed = gamepad.buttons[0]?.pressed ?? false;
            const gripPressed = gamepad.buttons[1]?.pressed ?? false;
            const yPressed = gamepad.buttons[5]?.pressed ?? false;
            const xPressed = gamepad.buttons[4]?.pressed ?? false;

            // 摇杆
            const stickX = gamepad.axes[2] ?? 0;
            const stickY = gamepad.axes[3] ?? 0;
        }
    }
}
```

### 单次触发（Rising Edge）模式

```typescript
// 避免重复触发，只在上升沿触发一次
private prevYButtonState = false;

update(): void {
    const yPressed = gamepad?.buttons[5]?.pressed ?? false;
    if (yPressed && !this.prevYButtonState) {
        this.onYButtonPressed?.();  // 只触发一次
    }
    this.prevYButtonState = yPressed;
}
```

## 输入系统选择指南

| 场景 | 推荐方案 |
|------|----------|
| 桌面 3D 操作 | `app.mouse` 事件 + 轮询 |
| 桌面 UI 点击 | `app.elementInput`（自动处理）|
| 移动触摸 | `app.touch` 事件 |
| 桌面快捷键 | `app.keyboard` 事件 + 轮询 |
| VR 手柄交互 | `app.xr.input.on('select', cb)` 事件 |
| VR 按钮长按 | `update()` 中轮询 `gamepad.buttons[i].pressed` |
| VR 摇杆输入 | `update()` 中轮询 `gamepad.axes[i]` |
| VR UI 交互 | `element.button.on('selectstart', cb)` 事件 |
| 游戏手柄 | `app.gamepads` 轮询 |

## 常见问题

### Q: handedness 在 XR input 'add' 事件中为 undefined？

PlayCanvas 的 XrInputSource 在 `'add'` 事件触发时尚未同步底层 WebXR 数据。

**解决方案**：在 `update()` 循环中使用标志位模式检测：

```typescript
// 'add' 事件中
controller.needsAssignment = true;

// update() 中
if (controller.needsAssignment && inputSource.handedness) {
    if (inputSource.handedness === 'right') {
        this.rightController = controller;
    }
    controller.needsAssignment = false;
}
```

### Q: XR select 事件 vs 按钮轮询？

- **`app.xr.input.on('select', cb)`**：事件驱动，每次扳机按下触发一次，推荐用于拾取交互
- **按钮轮询**：每帧检查 `gamepad.buttons[0].pressed`，适合需要持续检测的场景

两者可以共存。AIVR 项目使用 `select` 事件驱动 XRPicker 拾取，同时用按钮轮询处理 Y/X 按钮和 Grip。

### Q: ElementInput 为什么必须在构造函数中传入？

`ElementInput` 必须在 `Application` 构造函数中传入，因为 Engine 初始化时会检查并注册它。如果后续添加，world-space UI 的射线检测将失效。

## 关键 API 汇总

```typescript
// 初始化
new Application(canvas, {
    mouse: new Mouse(canvas),
    touch: new TouchDevice(canvas),
    keyboard: new Keyboard(window),
    elementInput: new ElementInput(canvas)
})

// Mouse
app.mouse.on('mousedown'|'mouseup'|'mousemove'|'mousewheel', cb)
app.mouse.isPressed(button) / wasPressed(button) / wasReleased(button)

// Touch
app.touch.on('touchstart'|'touchmove'|'touchend', cb)

// Keyboard
app.keyboard.on('keydown'|'keyup', cb)
app.keyboard.isPressed(key) / wasPressed(key)

// XR Input
app.xr.input.on('add'|'remove'|'select'|'selectstart'|'selectend', cb)
app.xr.input.on('squeeze'|'squeezestart'|'squeezeend', cb)
inputSource.handedness / .selecting / .squeezing
inputSource.getPosition() / .getRotation()
inputSource.getOrigin() / .getDirection()
inputSource.getLocalPosition() / .getLocalRotation()
```
