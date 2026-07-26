# 10 - 项目架构设计

## 概述

本章基于 AIVR 项目的实际开发经验，探讨如何为 3D 多交互项目设计模块架构。核心主题包括：分层设计、模块职责划分、依赖管理、状态管理和可扩展性。

## 架构设计原则

### 1. 分层架构

将应用分为四个清晰的层次：

```
┌──────────────────────────────────────┐
│            入口层 (Entry)             │
│  main.ts - Application 创建 + 渲染循环 │
└────────────────┬─────────────────────┘
                 │
┌────────────────▼─────────────────────┐
│           核心层 (Core)               │
│  App 协调器、Scene 管理、资源管理       │
│  VR 会话管理、事件路由                 │
└────────────────┬─────────────────────┘
                 │
┌────────────────▼─────────────────────┐
│           实体层 (Entities)            │
│  3D 实体类：Ground、Sky、VrController │
│  加载器：SplatLoader                  │
└────────────────┬─────────────────────┘
                 │
┌────────────────▼─────────────────────┐
│          交互/UI 层 (Interaction/UI)   │
│  拾取、操纵、面板、按钮                │
└──────────────────────────────────────┘
```

**依赖规则**：上层依赖下层，下层不依赖上层。同层之间通过接口解耦。

### 2. 薄协调层 (Thin Coordinator)

`App` 类应该是一个**薄协调层**，不做具体实现：

```typescript
// ✅ 好的 App 类 - 只做协调
export class App {
    update(dt: number): void {
        this.vrController?.update(dt);
        this.interaction?.update(dt);
        this.scene.update(dt);
    }

    private onVrStart(): void {
        this.vrController = new VrController(this.app);
        this.interaction = new InteractionManager(this.app, this.vrController);
        this.voicePanel = new VrVoicePanel(this.app, this.scene, callbacks);
    }
}

// ❌ 不好的 App 类 - 包含具体逻辑
export class App {
    update(dt: number): void {
        // 直接操作 inputSource、计算旋转、管理状态...
        // 这些应该放在专门的类里
    }
}
```

### 3. 单一职责

每个模块只负责一件事：

| 模块 | 职责 | 不负责 |
|------|------|--------|
| `AssetManager` | 加载和管理资源 | 场景创建、渲染 |
| `Scene` | 场景实体生命周期 | VR 交互、输入处理 |
| `VrManager` | VR 会话开始/结束 | 控制器追踪 |
| `VrController` | 控制器追踪+输入 | 抓取逻辑、UI |
| `InteractionManager` | 组合交互子系统 | 具体拾取/操纵 |
| `XRPicker` | 监听 select + 射线拾取 | 抓取/释放 |
| `Manipulator` | 抓取/释放/旋转 | 拾取、输入事件 |
| `GrabbableRegistry` | 可抓取列表管理 | 拾取判断、交互 |
| `VrVoicePanel` | 3D UI 面板创建 | ASR 通信 |
| `ASRHandler` | iframe 通信代理 | 语音引擎 |

### 4. 组合优于继承

交互系统通过组合构建，而非继承层级：

```typescript
// ✅ 组合模式
class InteractionManager {
    readonly registry: GrabbableRegistry;   // 持有 registry
    readonly manipulator: Manipulator;       // 持有 manipulator
    private picker: XRPicker;               // 持有 picker

    constructor(app, controller) {
        this.registry = new GrabbableRegistry();
        this.manipulator = new Manipulator(app, controller, this.registry);
        this.picker = new XRPicker(app, this.registry, this.onPicked);
    }
}

// ❌ 继承模式
class InteractionManager extends XRPicker {
    // 不够灵活，难以替换组件
}
```

## 模块设计模式

### 模式 A：Manager 模式

适用于需要管理生命周期的子系统：

```typescript
// VrManager - 管理 VR 会话生命周期
export class VrManager {
    private app: pc.Application;
    private events = new Map();

    constructor(app: pc.Application) {
        this.app = app;
        this.init();
    }

    private init(): void {
        this.app.xr.on('start', () => this.emit('sessionstart'));
        this.app.xr.on('end', () => this.emit('sessionend'));
    }

    enterVR(camera: pc.Entity): void {
        this.app.xr.start(camera, pc.XRTYPE_VR, pc.XRSPACE_LOCALFLOOR);
    }

    // 事件系统
    on(event: string, cb: Function): void { /* ... */ }
    private emit(event: string, ...args: any[]): void { /* ... */ }
}
```

### 模式 B：Entity Wrapper 模式

适用于 3D 实体封装：

```typescript
// Ground - 封装地面实体
export class Ground {
    private app: pc.Application;
    private entity: pc.Entity;
    private material: pc.StandardMaterial;

    constructor(app: pc.Application, config: GroundConfig = {}) {
        this.app = app;
        const materialAsset = app.assets.find('metal', 'material');
        this.material = materialAsset.resource as pc.StandardMaterial;

        this.entity = new pc.Entity('ground');
        this.entity.addComponent('render', {
            type: 'plane',
            material: this.material
        });

        app.root.addChild(this.entity);
    }

    getEntity(): pc.Entity { return this.entity; }
}
```

### 模式 C：Registry 模式

适用于管理可查找/可拾取对象的集合：

```typescript
export class GrabbableRegistry {
    private items: Set<Grabbable> = new Set();

    register(g: Grabbable): void {
        this.items.add(g);
    }

    unregister(g: Grabbable): void {
        this.items.delete(g);
    }

    pick(ray: pc.Ray): Grabbable | null {
        // 遍历 items，做射线-AABB 测试，返回最近的命中
    }

    get size(): number {
        return this.items.size;
    }

    clear(): void {
        this.items.clear();
    }
}
```

### 模式 D：Loader 模式

适用于异步资源加载：

```typescript
export class SplatLoader {
    private app: pc.Application;
    private asset: pc.Asset | null = null;
    private entity: pc.Entity | null = null;

    async load(config: SplatLoaderConfig): Promise<pc.Entity> {
        return new Promise((resolve, reject) => {
            this.asset = new pc.Asset('splat-' + Date.now(), 'gsplat', {
                url: config.url
            });

            const loader = new pc.AssetListLoader([this.asset], this.app.assets);
            loader.load((err) => {
                if (err) { reject(err); return; }

                this.entity = new pc.Entity('splat');
                this.entity.addComponent('gsplat', {
                    asset: this.asset,
                    unified: true
                });

                this.app.root.addChild(this.entity);
                resolve(this.entity);
            });
        });
    }

    getEntity(): pc.Entity | null { return this.entity; }

    destroy(): void {
        if (this.entity) { this.entity.destroy(); this.entity = null; }
        if (this.asset) { this.app.assets.remove(this.asset); this.asset = null; }
    }
}
```

### 模式 E：Singleton 模式（谨慎使用）

适用于全局唯一的服务：

```typescript
export class FontManager {
    private static instance: FontManager;
    private fonts: Map<string, pc.CanvasFont> = new Map();

    static getInstance(app?: pc.Application): FontManager {
        if (!FontManager.instance) {
            FontManager.instance = new FontManager();
        }
        if (app && !FontManager.instance.app) {
            FontManager.instance.app = app;
        }
        return FontManager.instance;
    }

    // 单例方法...
}
```

> **注意**：单例模式增加耦合，仅在确实需要全局唯一实例时使用（如字体管理器）。

## 依赖注入与管理

### 构造函数注入

所有依赖通过构造函数传入，不依赖全局变量：

```typescript
// ✅ 好的依赖管理
class Manipulator {
    constructor(
        private app: pc.Application,
        private controller: VrController,
        private registry: GrabbableRegistry
    ) { }
}

// App 中组装依赖
const manipulator = new Manipulator(app, vrController, registry);
```

### 避免循环依赖

```
✅ 正确的依赖方向
App → InteractionManager → XRPicker → GrabbableRegistry
App → InteractionManager → Manipulator → GrabbableRegistry
App → VrController

❌ 循环依赖
Manipulator ↔ App  (不好)
XRPicker ↔ InteractionManager (不好)
```

### 通过接口解耦

```typescript
// 定义回调接口
interface VrVoicePanelCallbacks {
    onStartRecording?: () => void;
    onStopRecording?: () => void;
    onClear?: () => void;
    onResult?: (result: ASRResult) => void;
}

// 面板不依赖具体的 App 实现
class VrVoicePanel {
    constructor(app: pc.Application, scene: Scene, callbacks: VrVoicePanelCallbacks) {
        // 通过 callbacks 与外部交互
    }
}

// App 中组装
this.voicePanel = new VrVoicePanel(this.app, this.scene, {
    onStartRecording: () => handler?.startRecording(),
    onStopRecording: () => handler?.stopRecording(),
    onResult: (result) => this.loadModelInFrontOfCamera()
});
```

## 状态管理

### 原则：状态跟着功能模块

```typescript
// ✅ 状态在专门的类中
class Manipulator {
    private held: { grabbable: Grabbable; originalParent: pc.GraphNode } | null = null;
    // 抓取状态只属于 Manipulator
}

class VrController {
    private leftGripHeld = false;
    private rightGripHeld = false;
    // 按钮状态只属于 VrController
}

// ❌ 不要把所有状态放在 App 类中
class App {
    isGrabbing: boolean;
    currentRotationX: number;
    currentRotationY: number;
    rotationDirection: number;
    // 这些应该分散到对应的功能模块
}
```

### 状态查询 vs 状态推送

```typescript
// 查询模式（轮询）
if (vrController.isLeftGripHeld()) {
    applyRotation();
}

// 推送模式（回调）
vrController.setYButtonCallback(() => {
    voicePanel.toggleVisibility();
});

// 选择指南：
// - 持续状态（按住）→ 查询
// - 离散事件（按下一次）→ 回调（上升沿检测）
```

## VR 会话生命周期管理

### 创建与销毁配对

```typescript
class App {
    private onVrStart(): void {
        // 创建 VR 专属对象
        this.vrController = new VrController(this.app);
        this.interaction = new InteractionManager(this.app, this.vrController);
        this.voicePanel = new VrVoicePanel(this.app, this.scene, callbacks);
    }

    private onVrEnd(): void {
        // ⚠️ 销毁顺序：先销毁依赖层深的，再销毁上层
        this.interaction?.destroy();
        this.interaction = null;

        this.voicePanel?.destroy();
        this.voicePanel = null;

        this.vrController?.destroy();
        this.vrController = null;

        this.splatLoader?.destroy();
        this.splatLoader = null;
    }
}
```

### 销毁前清理抓取状态

```typescript
// 在销毁被抓取物体之前，先释放抓取
if (this.splatLoader.getEntity()) {
    this.interaction?.manipulator.endHold();  // 先释放
    this.splatLoader.destroy();               // 再销毁
}
```

## 项目目录结构建议

```
src/
├── main.ts                  # 入口：Application 创建 + 渲染循环
├── app.ts                   # App 类（薄协调器，放在 src/ 根下）
│
├── app/                     # 核心子模块
│   ├── scene.ts             # Scene 管理器
│   ├── api.ts               # HTTP 客户端 (axios)
│   ├── event.ts             # AppEventHandler（自定义事件基类）
│   ├── asr-handler.ts       # ASR iframe 通信代理
│   └── splat-loader.ts      # Gaussian Splatting 加载器
│
├── manager/                 # 管理器模块
│   ├── vr-manager.ts        # VR 会话管理
│   ├── asset-manager.ts     # 资源预加载
│   ├── font-manager.ts      # 字体管理（单例）
│   └── interaction-manager.ts # 交互协调器
│
├── entities/                # 3D 实体封装
│   ├── ground.ts            # 地面
│   ├── sky.ts               # 天空
│   ├── controller.ts        # VR 手柄控制器
│   └── cube.ts              # 测试方块
│
├── interaction/             # 交互系统
│   ├── grabbable.ts         # 可抓取标签
│   ├── grabbable-registry.ts # 可抓取注册表 + 拾取
│   ├── xr-picker.ts         # XR 射线拾取器
│   ├── manipulator.ts       # 抓取/旋转操纵器
│   └── highlight-box.ts     # 抓取反馈
│
└── ui/                      # UI 组件
    ├── vr-button.ts         # VR 入口按钮
    └── vr-voice-panel.ts    # VR 3D 语音面板
```

## 扩展新功能指南

### 添加新的交互类型（如缩放）

1. 在 `interaction/` 下新建 `scaler.ts`
2. 在 `Manipulator` 中添加缩放逻辑
3. 更新 `InteractionManager` 组合新组件

```typescript
// 1. interaction/scaler.ts
export class Scaler {
    scale(target: pc.Entity, delta: number): void { /* ... */ }
}

// 2. 集成到 Manipulator
class Manipulator {
    private scaler: Scaler = new Scaler();

    update(dt: number): void {
        // ... 现有旋转逻辑 ...
        if (this.shouldScale()) {
            this.scaler.scale(this.held.grabbable.entity, delta);
        }
    }
}
```

### 添加新的实体类型

1. 在 `entities/` 下新建文件
2. 实现 Entity Wrapper 模式
3. 在 `Scene` 或 `App` 中注册

### 添加新的 UI 面板

1. 在 `ui/` 下新建文件
2. 实现 World-space UI 模式
3. 通过回调接口与 App 交互

## 架构决策记录

| 决策 | 原因 | 替代方案 |
|------|------|----------|
| Reparent 抓取 | 自动同步，无抖动 | Offset 跟随（对延迟敏感） |
| 事件驱动拾取 | 精确、不会多触发 | 按钮轮询拾取（可能重复触发） |
| 单例字体管理器 | 全局唯一字体资源 | 每次都创建（内存浪费） |
| App 薄协调层 | 关注点分离，易测试 | App 大杂烩（难以维护） |
| iframe ASR | 隔离 WASM 内存 | 主线程 WASM（可能卡顿） |
| AssetListLoader | 批量加载 + 进度跟踪 | 单个 Asset 逐个加载 |
| Composition over Inheritance | 灵活替换组件 | 继承层级（僵化） |

## 常见反模式

### 1. "God App" 反模式

```typescript
// ❌ 所有状态和逻辑都在 App 中
class App {
    isGrabbing: boolean;
    currentRotationX: number;
    // ... 50+ 状态字段
    // ... 500+ 行方法
}

// ✅ 分散到专用类
class App { /* 薄协调器，< 100 行 */ }
class Manipulator { /* 抓取旋转逻辑 */ }
class VrController { /* 输入状态 */ }
```

### 2. 隐藏的全局依赖

```typescript
// ❌ 依赖隐藏的全局
class MyComponent {
    constructor() {
        this.app = (window as any).globalApp; // 不可靠
    }
}

// ✅ 通过构造函数注入
class MyComponent {
    constructor(private app: pc.Application) { }
}
```

### 3. 过早抽象

不要一开始就设计"完美"架构。先实现功能，再识别重复模式，最后重构。

```
1. 实现功能（make it work）
2. 识别模式（find the pattern）
3. 提取抽象（extract abstraction）
```

## 关键 API 汇总

```typescript
// 事件系统（自定义管理器中使用）
events.set(event, []);
events.get(event).push(callback);
callbacks.forEach(cb => cb(...args));

// 接口定义
interface MyCallbacks {
    onEvent?: (data: T) => void;
}

// 构造函数注入
constructor(private dep1: T1, private dep2: T2) { }

// 生命周期配对
create() → destroy()
init() → reset()
onVrStart() → onVrEnd()
```
