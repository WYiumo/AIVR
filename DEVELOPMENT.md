# 项目开发文档

### 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| PlayCanvas Engine | 2.17.2 | WebGL/WebXR 3D 引擎 |
| TypeScript | ~6.0.2 | 类型安全 |
| Vite | ^8.0.8 | 构建工具 |

### 目标

- [x] 在 VR 中显示 3D 场景
- [x] 支持 VR 6DoF 相机
- [x] 手柄控制器追踪
- [x] 重新设置场景背景，添加地面和天空
- [ ] VR 中与物体交互（抓取、移动）
- [x] 接入 SuperSplat Gaussian Splatting 渲染
- [ ] 语音控制

---

## 项目架构

### 目录结构

```
AIVR/src/
├── main.ts              # 应用入口，初始化 PlayCanvas Application
├── style.css            # 全局样式
├── app/
│   ├── index.ts         # App 类 - 主应用逻辑，协调各模块
│   ├── scene.ts         # Scene 类 - 场景管理，实体生命周期
│   └── vr-manager.ts    # VrManager 类 - VR 会话管理
├── entities/
│   ├── cube.ts          # Cube 类 - 蓝色立方体示例
│   └── controller.ts    # VrController 类 - VR 手柄控制器
└── ui/
    └── vr-button.ts     # VR 入口按钮
```

### 模块依赖关系

```
┌─────────────────────────────────────────────────────┐
│                      main.ts                         │
│  - 创建 Application                                 │
│  - 初始化 App                                       │
│  - 启动渲染循环                                     │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                       App                            │
│  (app/index.ts)                                      │
│  - 协调 Scene、VrManager、Entity                     │
│  - 处理 VR 会话生命周期                              │
└───────────┬─────────────────────┬───────────────────┘
            │                     │
            ▼                     ▼
┌───────────────────┐   ┌───────────────────┐
│      Scene        │   │    VrManager     │
│  (scene.ts)       │   │  (vr-manager.ts) │
│  - 场景配置       │   │  - 会话管理       │
│  - 实体列表       │   │  - 事件发射       │
└───────────────────┘   └───────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────┐
│                     Entities                         │
│  ┌─────────────┐  ┌─────────────┐                    │
│  │    Cube     │  │VrController │                    │
│  │ (cube.ts)   │  │(controller) │                    │
│  └─────────────┘  └─────────────┘                    │
└─────────────────────────────────────────────────────┘
```

---

## 核心模块详解

### 1. main.ts - 应用入口

**职责**：
- 创建 PlayCanvas `Application` 实例
- 配置输入设备（Mouse、Touch）
- 初始化 `App` 类
- 启动渲染循环

**关键代码**：

```typescript
// 创建应用（使用 Application 而非 AppBase，确保 XR 正确初始化）
const app = new Application(canvas, {
    mouse: new Mouse(canvas),
    touch: new TouchDevice(canvas)
});

// 启动应用
app.start();

// 每帧更新
app.on('update', (dt: number) => {
    aivrApp.update(dt);
});
```

**注意事项**：
- **必须使用 `Application` 类**，不能使用 `AppBase`
- `AppBase` 不会自动初始化 XR 系统
- `Application` 会自动注册所有必需的组件系统

---

### 2. App (app/index.ts)

**职责**：

- 协调各模块的工作
- 管理 VR 会话生命周期
- 提供统一的更新循环

**构造函数参数**：

```typescript
interface AppConfig {
    xrCompatible: boolean;  // 是否启用 XR 兼容性
    debug: boolean;         // 是否输出调试信息
}
```

**关键方法**：

| 方法 | 说明 |
|------|------|
| `init()` | 初始化场景、相机、立方体 |
| `update(dt)` | 每帧更新，调用 VrController.update |
| `getApp()` | 获取 PlayCanvas Application |
| `getScene()` | 获取 Scene 实例 |
| `getVrManager()` | 获取 VrManager 实例 |

---

### 3. Scene (app/scene.ts)

**职责**：
- 管理场景配置
- 管理场景中的实体
- 处理 VR 会话事件

**场景配置**：

```typescript
interface SceneConfig {
    backgroundColor: pc.Color;  // 背景颜色，默认 (0.05, 0.05, 0.1)
    showGrid: boolean;           // 是否显示网格，默认 true
    gridScale: number;           // 网格大小，默认 10
}
```

**关键方法**：

| 方法 | 说明 |
|------|------|
| `addEntity(entity)` | 添加实体到场景 |
| `removeEntity(entity)` | 从场景移除实体 |
| `setCamera(entity)` | 设置主相机 |
| `getCamera()` | 获取主相机 |

---

### 4. VrManager (app/vr-manager.ts)

**职责**：
- VR 会话的启动和停止
- XR 状态检查
- 事件管理

**关键方法**：

| 方法 | 说明 |
|------|------|
| `isSupported()` | 检查浏览器是否支持 WebXR |
| `isAvailable()` | 检查 VR 设备是否可用 |
| `startVr(cameraEntity)` | 启动 VR 会话 |
| `endVr()` | 结束 VR 会话 |
| `on(event, callback)` | 监听 VR 事件 |
| `off(event, callback)` | 取消监听 |

**VR 事件**：

| 事件 | 说明 |
|------|------|
| `sessionstart` | VR 会话开始时触发 |
| `sessionend` | VR 会话结束时触发 |

**使用示例**：

```typescript
// 检查支持
if (!vrManager.isSupported()) {
    console.log('WebXR 不支持此浏览器');
    return;
}

if (!vrManager.isAvailable()) {
    console.log('VR 设备不可用');
    return;
}

// 监听事件
vrManager.on('sessionstart', () => {
    console.log('VR 会话已开始');
    // 创建 VR 控制器
    vrController = new VrController(app);
});

// 启动 VR
await vrManager.startVr(cameraEntity);
```

---

### 5. Cube (entities/cube.ts)

**职责**：
- 创建和管理蓝色立方体
- 提供变换接口

**构造函数参数**：

```typescript
interface CubeConfig {
    position?: pc.Vec3;   // 位置，默认 (0, 0.5, 0)
    scale?: pc.Vec3;      // 缩放，默认 (1, 1, 1)
    color?: pc.Color;     // 颜色，默认蓝色 (0, 0.3, 1)
}
```

**关键方法**：

| 方法 | 说明 |
|------|------|
| `setColor(color)` | 设置颜色 |
| `setPosition(pos)` | 设置位置 |
| `setScale(scale)` | 设置缩放 |
| `destroy()` | 销毁立方体 |

---

### 6. VrController (entities/controller.ts)

**职责**：
- 追踪 VR 手柄控制器
- 处理手柄输入
- 实现抓取逻辑

**关键属性**：

| 属性 | 类型 | 说明 |
|------|------|------|
| `rightController` | ControllerInfo | 右手控制器 |
| `leftController` | ControllerInfo | 左手控制器 |
| `grabbedEntity` | pc.Entity | 当前抓取的实体 |

**关键方法**：

| 方法 | 说明 |
|------|------|
| `update(dt)` | 每帧更新手柄位置 |
| `startGrab(inputSource, target)` | 开始抓取实体 |
| `endGrab(inputSource)` | 释放抓取 |
| `getRightRay()` | 获取右手射线 |
| `destroy()` | 销毁所有控制器实体 |

**ControllerInfo 结构**：

```typescript
interface ControllerInfo {
    inputSource: pc.XrInputSource;  // XR 输入源
    entity: pc.Entity;               // 控制器实体（可视化）
    isGrabbing: boolean;             // 是否正在抓取
}
```

---

### 7. vr-button.ts (ui/)

**职责**：
- 创建 VR 入口按钮
- 处理用户交互

**createVrButton 函数**：

```typescript
function createVrButton(vrManager: VrManager, cameraEntity: pc.Entity): HTMLButtonElement
```

**检查流程**：

```typescript
btn.onclick = async () => {
    // 1. 检查 WebXR 是否支持
    if (!vrManager.isSupported()) {
        alert('WebXR不支持此浏览器...');
        return;
    }

    // 2. 检查 VR 是否可用
    if (!vrManager.isAvailable()) {
        alert('VR不可用，请确保已连接VR设备');
        return;
    }

    // 3. 启动 VR
    await vrManager.startVr(cameraEntity);
};
```

---

## PlayCanvas 关键 API

### Application vs AppBase

| 类 | 说明 |
|---|------|
| `Application` | 完整的应用类，自动初始化所有系统（包括XR） |
| `AppBase` | 底层应用类，不自动初始化某些系统 |

**重要**：启动 WebXR 必须使用 `Application` 类。

### XR 相关 API

```typescript
// 检查支持
app.xr.supported  // boolean

// 检查可用性
app.xr.isAvailable(pc.XRTYPE_VR)  // boolean

// 启动 VR
camera.startXr(type, space, options)

// 结束 VR
app.xr.end()
```

### XR 类型常量

```typescript
pc.XRTYPE_VR      // 沉浸式 VR
pc.XRTYPE_AR      // 沉浸式 AR
pc.XRTYPE_INLINE  // 内联会话

pc.XRSPACE_LOCAL      // 本地空间（坐姿）
pc.XRSPACE_LOCALFLOOR // 本地楼层空间（站姿）
pc.XRSPACE_BOUNDEDFLOOR // 有界楼层空间
pc.XRSPACE_UNBOUNDED   // 无界空间
```

### XR 事件

```typescript
app.xr.on('start', () => {})      // 会话开始
app.xr.on('end', () => {})         // 会话结束
app.xr.on('available:XRTYPE_VR', (available) => {})  // 可用性变化
```

### XR 输入

```typescript
app.xr.input.on('add', (inputSource) => {})
app.xr.input.on('remove', (inputSource) => {})

// 获取手柄位置/旋转
inputSource.getPosition()   // Vec3 | null
inputSource.getRotation()   // Quat | null
inputSource.getDirection()  // Vec3 | null
inputSource.selecting       // boolean - 扳机键状态
```

---

## 开发需求清单

### 优先级 P0 - 核心功能

- [ ] **修复 VR 控制器可视化**：当前手柄使用简单 box 模型，应改为更符合实际手柄的模型
- [ ] **实现射线检测**：使用 `getRightRay()` 实现射线与场景物体的交互
- [ ] **实现抓取功能**：`VrController.startGrab()` 和 `endGrab()` 需要与场景物体联动

### 优先级 P1 - 交互功能

- [ ] **物体变换**：实现立方体的移动、旋转、缩放
- [ ] **VR 悬浮面板**：在 VR 中显示 2D UI 面板
- [ ] **手柄震动反馈**：抓取物体时触发震动

### 优先级 P2 - 扩展功能

- [ ] **语音控制**：集成 Web Speech API 实现语音命令
- [ ] **场景切换**：支持多个场景的加载和切换
- [ ] **物体导入**：支持加载外部 3D 模型

### 优先级 P3 - Splatting 集成

- [ ] **SuperSplat 渲染器接入**：将 Gaussian Splatting 渲染集成到 VR 场景
- [ ] **Splat 控制器**：在 VR 中控制 splat 模型的位置和旋转
- [ ] **LOD 支持**：根据距离调整 splat 渲染质量

---

## 问题

### Q: 使用 AppBase 无法启动 XR

**原因**：AppBase 不会自动初始化 XR 系统

**解决**：使用 `Application` 类代替 `AppBase`

```typescript
// 错误
const app = new AppBase(canvas);
app.init(createOptions);

// 正确
const app = new Application(canvas, options);
```

---

## 代码规范

### 类型定义

- 使用 `pc.` 前缀访问 PlayCanvas 类型
- 自定义类使用 PascalCase 命名
- 接口使用 Interface 后缀（如 `CubeConfig`）

### 文件组织

- 每个模块一个文件
- 相关模块放在同一目录
- 入口文件放在 src 根目录

### 事件命名

- VR 事件使用小写：`sessionstart`, `sessionend`
- 避免与 PlayCanvas 原生事件冲突

---

## 参考资源

- [PlayCanvas XR 文档](https://developer.playcanvas.com/user-manual/xr/)
- [PlayCanvas Engine API](https://playcanvas.github.io/engine/)
- [WebXR 规范](https://immersive-web.github.io/webxr/)
- [SuperSplat 源码](../supersplat/src/)

---

## 更新日志

### 2026-04-17

- 初始项目架构设计
- 实现蓝色立方体显示
- 实现 VR 会话管理
- 实现 VR 控制器追踪
- 修复 Application vs AppBase 问题
