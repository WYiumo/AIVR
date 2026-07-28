# 项目开发文档

### 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| PlayCanvas Engine | 2.20.6 | WebGL/WebXR 3D 引擎 |
| TypeScript | ~6.0.2 | 类型安全 |
| Vite | ^8.0.8 | 构建工具 |
| Axios | ^1.16.1 | HTTP 客户端（后端 API 通信） |

### 目标

- [x] 在 VR 中显示 3D 场景
- [x] 支持 VR 6DoF 相机
- [x] 手柄控制器追踪
- [x] 重新设置场景背景，添加地面和天空
- [x] VR 中与物体交互（抓取、移动、旋转）
- [x] 接入 SuperSplat Gaussian Splatting 渲染
- [x] 语音控制（VR 3D UI + ASR iframe）
- [x] VR 手柄 Y 按钮呼出工具轮盘
- [x] 工具轮盘：语音面板 / 物体控制 / 定向移动
- [x] 语音触发加载 3D 点云模型
- [x] 物体操控面板（移动 / 旋转 / 缩放）
- [x] Trigger 射线拾取 + 抓取物体
- [x] 手柄摇杆控制物体 Transform

---

## 项目架构

### 目录结构

```
AIVR/src/
├── main.ts              # 应用入口，初始化 PlayCanvas Application
├── app.ts               # App 类 - 总协调器（薄层）
├── utils.ts             # 工具函数（按键常量、splat 加载、AABB 检测）
├── style.css            # 全局样式
├── app/
│   ├── scene.ts              # Scene 类 - 场景管理（环境光/天空/地面）
│   ├── xrInput-detector.ts   # XrInputDetector - XR 输入手势检测
│   ├── objectIpulation-proxy.ts # ObjectIpulationProxy - 物体操作代理
│   ├── asr-handler.ts        # ASRHandler - ASR iframe 通信处理器
│   └── api.ts                # Axios 基础配置（后端 API 地址）
├── entities/
│   ├── playerController.ts   # PlayerController - 玩家相机 + VR 手柄模型
│   ├── ground.ts             # Ground - 地面实体
│   ├── sky.ts                # Sky - 天空盒配置
│   ├── cube.ts               # Cube - 测试用立方体实体
│   └── elementContainer.ts   # ElementContainer - 可交互 3D 元素包装
├── manager/
│   ├── vr-manager.ts         # VrManager - VR 会话管理
│   ├── assetLoader.ts        # AssetManager - 资源预加载管理
│   ├── font.ts               # FontManager - 单例字体管理器
│   └── interaction.ts        # InteractionManager - VR 交互状态机
└── ui/
    ├── start-page.ts         # VR 入口按钮（DOM）
    ├── voice-panel.ts        # VoicePanel - VR 3D 语音面板
    ├── tools-wheel.ts        # ToolsWheel - 工具选择轮盘
    └── object-panel.ts       # ObjectPanel - 物体操作面板

AIVR/asr/                # ASR 模块（独立 iframe）
├── index02.html         # ASR UI 入口页面
├── main.js              # ASR 主入口
├── asr-manager.js       # 多引擎 ASR 管理器
├── recorder-core.js     # 录音核心
├── pcm.js / wav.js      # 编码器
├── wsconnecter.js       # WebSocket 连接
├── webspeech-engine.js  # 浏览器语音引擎
├── funasr-engine.js     # FunASR 服务器引擎
├── sherpa-asr-engine.js # Sherpa-ONNX 本地引擎
├── sherpa-fallback-engine.js # Sherpa 降级引擎
├── lightweight-optimizer.js  # 轻量级优化器
└── web-assembly-vad-asr-sherpa-onnx-zh-en-paraformer-small/ # WASM 模型
```

### 模块依赖关系

```
┌─────────────────────────────────────────────────────┐
│                      main.ts                        │
│  - 创建 Application                                  │
│  - 初始化 App                                        │
│  - 启动渲染循环                                       │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                       App                           │
│  (app.ts)                                           │
│  - 协调 Scene、VrManager、Entity 初始化              │
│  - 处理 VR 会话生命周期                                │
│  - 集成 InteractionManager                          │
└──┬──────────┬──────────┬───────────┬────────────────┘
   │          │          │           │
   ▼          ▼          ▼           ▼
┌──────┐ ┌──────┐ ┌──────────┐ ┌──────────┐
│Scene │ │VrMgr │ │AssetMgr  │ │FontMgr   │
└──┬───┘ └──┬───┘ └──────────┘ └──────────┘
   │        │
   ▼        ▼
┌──────┐ ┌─────────────────────┐
│Ground│ │  PlayerController   │
│ Sky  │ │  - 相机 + 手柄模型    │
└──────┘ └──────────┬──────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌────────┐  ┌──────────────┐  ┌──────────┐
│Tools   │  │ VoicePanel   │  │Object    │
│Wheel   │  │              │  │Panel     │
└────────┘  └──────────────┘  └──────────┘
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
┌──────────┐ ┌──────────┐ ┌───────────────┐
│XrInput   │ │Object    │ │Interaction    │
│Detector  │ │Ipulation │ │Manager        │
│          │ │Proxy     │ │(状态机)        │
└──────────┘ └──────────┘ └───────────────┘
```

---

## 核心模块详解

### 1. main.ts - 应用入口

**职责**：
- 创建 PlayCanvas `Application` 实例
- 配置输入设备（Mouse、Touch、ElementInput）
- 初始化 `App` 类
- 启动渲染循环

**关键代码**：

```typescript
// 创建应用（使用 Application 而非 AppBase，确保 XR 正确初始化）
const app = new Application(canvas, {
    mouse: new Mouse(canvas),
    touch: new TouchDevice(canvas),
    elementInput: new ElementInput(canvas)  // 启用 UI 交互
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
- `ElementInput` 系统必须在 Application 创建时启用，才能处理 world-space UI 交互

---

### 2. App (app.ts)

**职责**：
- 协调各模块初始化（Scene、VrManager、AssetManager、FontManager、PlayerController）
- 管理 VR 会话生命周期（`sessionstart` / `sessionend`）
- 作为顶层薄协调器，业务逻辑委托给各子模块

**App 不再是重量级类**：所有交互逻辑已移到 `InteractionManager`，输入检测在 `XrInputDetector`，物体操作在 `ObjectIpulationProxy`。App 仅负责：
- 依赖注入与生命周期管理
- VR 会话启动/结束时创建/销毁会话期对象

**资源初始化流程**：

```typescript
async init(): Promise<void> {
    // 1. 加载预置资源（GLB、cubemap、材质、纹理）
    await this.assetManager.loadInitAsset();

    // 2. 初始化场景
    this.scene.init();

    // 3. 初始化字体
    this.fontManager.init();

    // 4. 创建 UI 模块
    this.toolsWheel = new ToolsWheel(this.app);
    this.voicePanel = new VoicePanel(this.app);
    this.objectPanel = new ObjectPanel(this.app);

    // 5. 初始化玩家控制器
    this.playerController.init();

    // 6. 注册 VR 事件
    this.setupVrEvents();
}
```

**VR 会话生命周期**：

```typescript
// VR 会话开始
private onVrStart(): void {
    // 创建输入检测器、物体操作代理
    this.xrInputDetector = new XrInputDetector(this.app);
    this.objectProxy = new ObjectIpulationProxy(this.app);

    // 创建交互管理器（整合所有 VR 交互）
    this.interaction = new InteractionManager(
        this.app, this.playerController, this.objectProxy,
        this.toolsWheel, this.voicePanel, this.objectPanel
    );
    this.interaction.init();

    // 隐藏 DOM 按钮
    vrBtn.style.display = 'none';
}

// VR 会话结束
private onVrEnd(): void {
    this.interaction?.destroy();
    this.interaction = null;
    // 显示 DOM 按钮
    vrBtn.style.display = 'block';
}

// 每帧更新
update(dt: number): void {
    this.xrInputDetector?.update(dt);     // 输入检测
    this.objectProxy?.update(dt);         // 物体操作
    this.playerController.update(dt);     // 手柄追踪
}
```

---

### 3. AssetManager (manager/assetLoader.ts)

**职责**：
- 集中管理所有预置资源的加载
- 使用 `AssetListLoader` 异步加载 GLB 模型、cubemap、材质、UI 纹理
- 提供统一的资源访问入口

**预加载资源**：

| 资源名 | 类型 | 文件路径 | 用途 |
|--------|------|----------|------|
| `leftController` | container | `assets/models/meta_quest_touch/left.glb` | 左手手柄 GLB 模型 |
| `rightController` | container | `assets/models/meta_quest_touch/right.glb` | 右手手柄 GLB 模型 |
| `cubemap:skybox` | cubemap | `assets/cubemap/helipad-env-atlas.png` | 天空盒环境贴图 |
| `material:metal` | material | `assets/materials/metal.json` | 金属材质 |
| `texture:toolsWheel` | texture | `assets/textures/tools_wheel.png` | 工具轮盘 UI |
| `texture:wheel_Checkbox` | texture | `assets/textures/wheel_Checkbox.png` | 轮盘选中框 |
| `texture:voice_panel` | texture | `assets/textures/voice_panel.png` | 语音面板背景 |
| `texture:voice_button` | texture | `assets/textures/voice_button.png` | 语音面板按钮 |
| `texture:voice_status_bar` | texture | `assets/textures/voice_status_bar.png` | 语音状态栏 |
| `texture:voice_text_line` | texture | `assets/textures/voice_text_line.png` | 语音文本行 |
| `texture:object_control_panel` | texture | `assets/textures/object_control_panel.png` | 物体操作面板 |
| `texture:object_control_checkbox` | texture | `assets/textures/object_control_checkbox.png` | 操作选项框 |
| `texture:green_triangle_identifier` | texture | `assets/textures/green_triangle_identifier.png` | 操作指示器 |
| `text:fontSample` | text | `assets/font/3500_symbols.txt` | 中文字符集 |

**资源访问**：

```typescript
// 通过名称和类型查找资源（新命名规范：type:name）
const materialAsset = app.assets.find('material:metal') as pc.Asset;
const cubemapAsset = app.assets.find('cubemap:skybox') as pc.Asset;

// 通过类型筛选查找
const texture = app.assets.find('texture:voice_panel')?.resource;
```

---

### 4. Scene (app/scene.ts)

**职责**：
- 场景基础配置（环境光）
- 管理 Ground、Sky 实体的生命周期
- 通过配置控制地面/天空的启用

**配置接口**：

```typescript
interface SceneConfig {
    backgroundColor: pc.Color;   // 背景颜色
    showGrid: boolean;            // 是否显示网格
    gridScale: number;            // 网格大小
    ground?: GroundConfig;        // 地面配置
    sky?: SkyConfig;              // 天空配置
}
```

**关键方法**：

| 方法 | 说明 |
|------|------|
| `init()` | 初始化场景（环境光、天空、地面） |
| `getGround()` | 获取地面实体 |
| `getSky()` | 获取天空实体 |

---

### 5. Sky (entities/sky.ts)

**职责**：
- 配置场景天空盒
- 设置曝光度和旋转
- 通过 `app.assets.find('cubemap:skybox')` 查找天空盒资源

**天空类型**：
- `infinite` - 无限天空（程序化渐变）
- `box` - 立方体天空盒
- `dome` - 穹顶天空盒

**关键变更**（相比旧版）：
- 使用 `app.scene.setSkybox(asset.resources)` 替代直接访问 `resources[1]`
- 资源查找使用新的命名规范 `cubemap:skybox`

---

### 6. Ground (entities/ground.ts)

**职责**：
- 创建地面实体，使用 `material:metal` 预置材质
- 作为平面渲染，接收阴影

**关键变更**（相比旧版）：
- 材质查找使用 `app.assets.find('material:metal')`
- 移除了不必要的 `setPosition` / `setSize` 调用（初始化时已设置）

---

### 7. FontManager (manager/font.ts)

**职责**：
- 单例模式管理字体
- 使用 PlayCanvas 内置 `CanvasFont` 创建字体纹理图集
- 支持中文字符集（3500_symbols.txt）
- 支持动态文本更新（`updateFontTextures`）

**关键方法**：

| 方法 | 说明 |
|------|------|
| `getInstance(app?)` | 获取单例实例 |
| `init()` | 创建默认 CanvasFont（SimHei, 32px） |
| `getFont(name)` | 获取已加载的字体 |
| `updateFontTextures(name, text)` | 更新字体纹理图集 |

**使用示例**：

```typescript
const fontManager = FontManager.getInstance();
fontManager.init();  // 在 App.init() 中调用
const font = fontManager.getFont('SimHei');
fontManager.updateFontTextures('SimHei', '你好世界');
```

---

### 8. PlayerController (entities/playerController.ts)

**职责**：
- 管理玩家相机实体和 VR 手柄控制器实体
- 每帧同步 XR 输入源的位置/旋转
- 绘制手柄射线（白色=空闲，绿色=选择中）
- 支持 `teleport:to` 事件实现传送

**实体层级**：

```
app.root
  └── PlayerOffset (可传送偏移)
        ├── Camera (VR 相机)
        ├── LeftController (左手柄 + GLB 模型)
        └── RightController (右手柄 + GLB 模型)
```

**关键方法**：

| 方法 | 说明 |
|------|------|
| `init()` | 创建相机和手柄实体，加载 GLB 模型 |
| `update(dt)` | 同步手柄位置/旋转，绘制射线 |
| `getCamera()` | 获取相机实体 |
| `getControllerEntity(handedness)` | 获取指定手的手柄实体 |

**手柄模型加载**：

```typescript
left.addComponent('model', {
    type: 'asset',
    asset: (app.assets.find('leftController')?.resource as any).model,
    castShadows: true
});
```

> **设计说明**：旧版（controller.ts）需要手动处理 `handedness` 时序问题。新版在 `init()` 时直接创建 `'left'` / `'right'` 两个固定实体，在 `update()` 中从 `inputSources` 读取位置/旋转同步，避免了异步检测的复杂性。

---

### 9. XrInputDetector (app/xrInput-detector.ts)

**职责**：
- 检测 VR 手柄按钮按压和摇杆轴超过阈值
- 通过 `app.fire(eventName, inputSource)` 发射事件
- 使用 `preState` Map 实现边缘触发（仅按下瞬间触发一次）

**检测的按钮事件**：

| 事件名 | 触发条件 |
|--------|----------|
| `left_trigger_click` | 左手扳机按下 |
| `left_grip_click` | 左手握持按下 |
| `left_x_click` | 左手 X 按钮按下 |
| `left_y_click` | 左手 Y 按钮按下 |
| `left_left_click` | 左手摇杆左超过阈值 |
| `left_right_click` | 左手摇杆右超过阈值 |
| `left_up_click` | 左手摇杆上超过阈值 |
| `left_down_click` | 左手摇杆下超过阈值 |
| `right_trigger_click` | 右手扳机按下 |
| `right_grip_click` | 右手握持按下 |
| `right_a_click` | 右手 A 按钮按下 |
| `right_b_click` | 右手 B 按钮按下 |
| `right_left_click` | 右手摇杆左超过阈值 |
| `right_right_click` | 右手摇杆右超过阈值 |
| `right_up_click` | 右手摇杆上超过阈值 |
| `right_down_click` | 右手摇杆下超过阈值 |

**摇杆阈值**：`THRESHOLD = 0.8`，只有摇杆偏转超过 0.8 才触发。

**Gamepad 按钮映射（Meta Quest）**：

| 索引 | 左手 | 右手 |
|------|------|------|
| 0 | Trigger | Trigger |
| 1 | Grip | Grip |
| 4 | X | A |
| 5 | Y | B |

---

### 10. ObjectIpulationProxy (app/objectIpulation-proxy.ts)

**职责**：
- 桥接 InteractionManager 与具体物体操作
- 持有一个 `FunctionCallback`，每帧将摇杆输入传递给回调
- 作为物体操纵的"代理"，解耦输入检测与物体操作逻辑

**关键方法**：

| 方法 | 说明 |
|------|------|
| `start(callback)` | 激活操作，传入操作回调 `(entity, stickX, stickY, handedness) => void` |
| `stop()` | 停止操作，清除状态 |
| `setObject(entity)` | 设置被操作的物体 |
| `update(dt)` | 每帧读取摇杆值并执行回调 |

**操作回调注册（在 InteractionManager 中）**：

```typescript
const callbackFn = new Map<number, FunctionCallback>([
    [0, (entity, stickX, stickY, handedness) => { /* 移动 */ }],
    [1, (entity, stickX, stickY, handedness) => { /* 旋转 */ }],
    [2, (entity, stickX, stickY, handedness) => { /* 缩放 */ }],
]);
```

---

### 11. InteractionManager (manager/interaction.ts)

**职责**：
- **VR 交互状态机**：管理整个 VR 会话的交互流程
- 协调 ToolsWheel、VoicePanel、ObjectPanel 三个 UI 模块
- 处理物体拾取/释放（射线 AABB 检测）
- 注册所有按钮事件的响应回调

**交互状态机**：

```
idle  ←→  wheelOpen  ←→  voicePanelOpen  ←→  objectPanelOpen
                            ↓ A                ↓ A
                         录音/发送          objectManipulating
                                               ↓ Trigger
                                           objectSelecting
                                               ↓ Trigger
                                           objectManipulating
```

**状态说明**：

| 状态 | 说明 |
|------|------|
| `idle` | 默认状态，无 UI 打开 |
| `wheelOpen` | 工具轮盘显示中，左摇杆左右切换工具 |
| `voicePanelOpen` | 语音面板显示中，可录音/发送 |
| `objectPanelOpen` | 物体操作面板显示中，可选择操作类型 |
| `objectManipulating` | 物体操纵模式，摇杆控制 Transform |
| `objectSelecting` | 物体已拾取，处于 Reparent 抓取状态 |

**关键流程**：

```
[左手 Y] → toggle 工具轮盘 → idle ↔ wheelOpen
  [摇杆左/右] → spinning_wheel(-1/1) 切换工具
  [右手 A] → 确认:
    tool 0 → 打开语音面板 (voicePanelOpen)
    tool 1 → 打开物体操作面板 (objectPanelOpen)
    tool 2 → 定向移动 (TODO)

语音面板 (voicePanelOpen):
  [右手 B] → 关闭面板 → idle
  [start/stop/clear/send 按钮] → XR 射线点击

物体操作面板 (objectPanelOpen):
  [左摇杆 左/右] → 切换操作类型
  [右手 A] → 开始操纵 (objectManipulating)
  [右手 B] → 关闭面板 → idle

物体操纵 (objectManipulating):
  [右手 Trigger] → 射线拾取物体 → reparent → objectSelecting
  摇杆 → ObjectIpulationProxy 执行操作
  [右手 B] → 停止操纵 → objectPanelOpen

物体已拾取 (objectSelecting):
  [右手 Trigger] → 释放物体 → 还原到 world → objectManipulating
```

**EntityPositionInit**：在 VR 启动时，将各 UI 面板关联到对应的实体上：
- **ToolsWheel** → 左手柄子节点（位置：前方 -0.1）
- **VoicePanel** → 相机子节点（位置：右前方 0.6, -0.2, -1）
- **ObjectPanel** → 相机子节点（位置：正前方偏下 0, -0.3, -0.4）
- **gamepaidentifier** → 右手柄子节点（操纵模式指示器）

---

### 12. VoicePanel (ui/voice-panel.ts)

**职责**：
- 在 VR 空间内创建 world-space 3D 语音控制面板
- 提供开始录音/停止/清除/发送按钮
- 显示识别结果和状态文本
- 通过 `app.fire('voice:*')` 事件与 ASRHandler 通信

**关键方法**：

| 方法 | 说明 |
|------|------|
| `getScreenEntity()` | 获取屏幕实体（用于挂载到控制器/相机） |
| `changeScreenEnable()` | 切换显示/隐藏 |
| `setStatus(status)` | 设置状态文本 |
| `appendResultText(text)` | 追加识别结果 |
| `destroy()` | 销毁面板 |

**面板尺寸**：300×200 UI 像素，世界缩放 0.003

---

### 13. ToolsWheel (ui/tools-wheel.ts)

**职责**：
- VR 世界空间工具选择轮盘
- 显示三个工具选项：语音输入 / 物体控制 / 定向移动
- 摇杆旋转轮盘，选中项高亮

**关键方法**：

| 方法 | 说明 |
|------|------|
| `spinning_wheel(order)` | 旋转轮盘（-1 左, 1 右），步进 60° |
| `updateCurrentTool()` | 确认当前选中工具 |
| `getScreenEntity()` | 获取屏幕实体 |
| `changeScreenEnable()` | 切换显示/隐藏 |

**当前工具列表**：`['语音输入', '物体控制', '定向移动']`

**UI 组成**：
- `wheel` 实体（背景轮盘图片，旋转动画）
- `toolsname` 实体（当前工具名称文本）
- `checkbox` 实体（选中指示框）

---

### 14. ObjectPanel (ui/object-panel.ts)

**职责**：
- VR 世界空间物体操作面板
- 显示操作类型：移动 / 旋转 / 缩放 / 组合 / 复制 / 删除
- 选中框在操作类型之间循环移动

**关键方法**：

| 方法 | 说明 |
|------|------|
| `nextOperation(order)` | 循环切换操作类型 |
| `updatecurrentOperation()` | 确认当前操作类型 |
| `getScreenEntity()` | 获取屏幕实体 |
| `changeScreenEnable()` | 切换显示/隐藏 |

**当前操作列表**：`['移动', '旋转', '缩放', '组合', '复制', '删除']`

> **注意**：目前仅实现了移动(0)、旋转(1)、缩放(2)，组合/复制/删除为占位。

---

### 15. ElementContainer (entities/elementContainer.ts)

**职责**：
- 包装可交互的 3D 元素（如加载的 GS 模型）
- 提供包围盒（Wireframe Box）可视化
- 管理元素在世界中的位置（reparent 到 world / 控制器）
- 通过 `'ElementContainer'` 标签供射线检测筛选

**关键方法**：

| 静态/实例方法 | 说明 |
|------|------|
| `ElementContainer.createElement(app)` | 创建新的容器（添加包围盒子实体） |
| `ElementContainer.createElementByEntity(entity)` | 从已有实体创建容器包装器 |
| `addElement(element)` | 向容器添加元素（如 GS 模型实体） |
| `addworld(app)` | 将容器放回 world 根节点 |
| `showBoundbox(flag)` | 显示/隐藏包围盒 |
| `setSelected(flag)` | 设置选中标签 |

**包围盒**：使用 `StandardMaterial` + `RENDERSTYLE_WIREFRAME` 渲染 wireframe box，自动匹配 AABB 尺寸。

---

### 16. ASR 模块

#### ASRHandler (app/asr-handler.ts)

**职责**：
- 管理 ASR iframe 的加载和通信
- 通过 `postMessage` 与 iframe 交换命令和数据
- 将 ASR 事件转换为 PlayCanvas 应用事件

**事件通信**：

```
Host (PlayCanvas App)                iframe (ASR)
────────────────────                 ────────────
voice:startRecording  ──→ start ──→ 开始录音
voice:stopRecording   ──→ stop  ──→ 停止录音
voice:clearResults    ──→ clear ──→ 清除结果
voice:sendResult      ──→ 处理识别结果

                      ←── asr_result ──  识别结果
                      ←── asr_status ──  状态更新
                      ←── asr_error  ──  错误信息
```

**关键方法**：

| 方法 | 说明 |
|------|------|
| `init(iframeSrc)` | 创建隐藏 iframe 并加载 ASR 页面 |
| `sendCommand(command)` | 发送命令到 iframe |
| `switchEngine(engine)` | 切换 ASR 引擎 |
| `destroy()` | 销毁 iframe |

#### ASR iframe 模块 (asr/)

- **asr-manager.js** — 多引擎管理器
- **sherpa-asr-engine.js** — Sherpa-ONNX 离线引擎（WASM，无需网络）
- **funasr-engine.js** — FunASR 服务器引擎（需后端服务）
- **webspeech-engine.js** — 浏览器内置语音识别
- **recorder-core.js** — 录音核心逻辑
- **wsconnecter.js** — WebSocket 连接器

---

### 17. 3D 模型加载（语音触发）

**职责**：语音面板 send 触发 `voice:sendResult` 事件 → InteractionManager 处理：

```typescript
this.app.on('voice:sendResult', async (_text: string) => {
    // 使用 loadSplat 加载 PLY 点云 → 包装进 ElementContainer → 放置到相机前方
    const entity = await loadSplat(this.app, '/avocado_chair.ply');
    const container = ElementContainer.createElement(this.app);
    container.addElement(entity);

    const camera = this.playerController.getCamera();
    const position = camera.getPosition().clone()
        .add(camera.forward.clone().mulScalar(1));
    container.setPosition(position);
});
```

**`loadSplat` 工具函数**（utils.ts）：

```typescript
async function loadSplat(app: pc.Application, url: string): Promise<pc.Entity> {
    const asset = new pc.Asset('splat-' + Date.now(), 'gsplat', { url });
    // AssetListLoader 加载 → 创建 Entity → 添加 gsplat 组件
    entity.addComponent('gsplat', { asset, unified: true });
}
```

---

### 18. 物体操纵详情

**操作回调映射**（在 InteractionManager 中定义）：

```typescript
const callbackFn = new Map<number, FunctionCallback>([
    [0, 移动], // entity, stick_X, stick_Y, handedness
    [1, 旋转], // entity, stick_X, stick_Y, handedness
    [2, 缩放], // entity, stick_X, stick_Y, handedness
]);
```

**移动（操作 0）**：
- 左手：摇杆 Y → 上下移动
- 右手：摇杆 X → 左右移动，Y → 前后移动

**旋转（操作 1）**：
- 左手：摇杆 X → 绕 Z 轴
- 右手：摇杆 X → 绕 Y 轴，Y → 绕 X 轴
- 三轴旋转通过 `Quat.mul2` 组合

**缩放（操作 2）**：
- 右手：摇杆 Y → 等比缩放（限制 0.1~5 倍）

---

## PlayCanvas 关键 API

### Application vs AppBase

| 类 | 说明 |
|------|------|
| `Application` | 完整的应用类，自动初始化所有系统（包括XR） |
| `AppBase` | 底层应用类，不自动初始化某些系统 |

**重要**：启动 WebXR 必须使用 `Application` 类。

### ElementInput 系统

**必需**：要在 VR 中使用 world-space UI 交互，必须在 Application 创建时启用 ElementInput：

```typescript
import { ElementInput } from 'playcanvas';

const app = new Application(canvas, {
    mouse: new Mouse(canvas),
    touch: new TouchDevice(canvas),
    elementInput: new ElementInput(canvas)
});
```

### World-Space UI 配置

创建 3D 空间中的 UI 面板需要三个关键设置：

```typescript
screenEntity.addComponent('screen', {
    screenSpace: false  // 关键：禁用屏幕空间，启用 world-space
});
screenEntity.setLocalScale(0.003, 0.003, 1);  // 缩放到合适大小
```

### Cubemap 资源访问

新版使用 `scene.setSkybox()`：

```typescript
const skyboxAsset = app.assets.find('cubemap:skybox');
if (skyboxAsset) {
    app.scene.setSkybox(skyboxAsset.resources as pc.Texture[]);
}
app.scene.skyboxMip = 3;
```

### Gaussian Splatting (gsplat 组件)

```typescript
entity.addComponent('gsplat', {
    asset: splatAsset,
    unified: true  // 启用统一渲染
});
```

**AABB 访问**：

```typescript
if (entity.gsplat) {
    const resource = (entity.gsplat as any).resource;
    const localAabb: pc.BoundingBox | undefined = resource?.aabb;
    if (localAabb) {
        const worldAabb = new pc.BoundingBox();
        worldAabb.setFromTransformedAabb(localAabb, entity.getWorldTransform());
    }
}
```

### XR Input 事件 vs Gamepad 轮询

新架构采用 **事件驱动** 模式（XrInputDetector 每帧检测 + `app.fire` 发射事件），而非直接在 App 中轮询 gamepad：

```typescript
// 旧：App 内直接轮询
if (gamepad.buttons[5].pressed) { /* Y button */ }

// 新：监听事件
this.app.on('left_y_click', () => { /* Y button */ });
```

---

## 问题排查

### Q: VR 手柄无响应

**检查**：
1. `XrInputDetector` 的 `update()` 是否在 App.update 中被调用
2. `InteractionManager.init()` 是否注册了对应按钮事件
3. 事件名是否正确（如 `left_y_click`）

### Q: 语音面板不显示

**检查**：
1. `ElementInput` 是否在 Application 创建时启用
2. `screenEntity.enabled` 是否为 `true`（通过 `changeScreenEnable()` 切换）
3. 面板缩放是否合适（`setLocalScale(0.003, 0.003, 1)`）

### Q: 工具轮盘无法旋转

**检查**：
1. 当前状态是否为 `wheelOpen`
2. `spinning_wheel` 的方向参数是否正确（1 = 右, -1 = 左）
3. 轮盘旋转角度是否在 -90°~90° 范围内

### Q: 物体操作无响应

**检查**：
1. 当前状态是否为 `objectManipulating`
2. `ObjectIpulationProxy.start()` 是否传入正确的 callback
3. 右手 Trigger 是否成功拾取到物体（射线是否命中 ElementContainer）

### Q: 手柄模型不显示

**检查**：
1. `PlayerController.init()` 中 GLB 模型是否正确加载
2. 资源 key 是否为 `leftController` / `rightController`
3. `AssetManager.loadInitAsset()` 是否在 PlayerController 之前完成

---

## 更新日志

### 2026-07-26

**架构重构 — 目录重组与新模块**

**目录重组**：
- 新建 `src/manager/` 目录（vr-manager, assetLoader, font, interaction）
- 各实体移至 `src/entities/`
- UI 组件移至 `src/ui/`
- 在 `src/app.ts` 顶层统一导出 App 类

**新增模块**：

| 文件 | 职责 |
|------|------|
| `app/xrInput-detector.ts` | XR 输入手势检测器，按钮/摇杆事件发射 |
| `app/objectIpulation-proxy.ts` | 物体操作代理，解耦输入与操作逻辑 |
| `entities/playerController.ts` | 玩家相机 + VR 手柄模型管理 |
| `entities/cube.ts` | 测试用立方体实体 |
| `entities/elementContainer.ts` | 可交互 3D 元素包装器 |
| `ui/tools-wheel.ts` | 工具选择轮盘（语音/物体控制/移动） |
| `ui/object-panel.ts` | 物体操作面板（移动/旋转/缩放） |
| `app/api.ts` | Axios 基础配置 |

**移除模块**：
- 删除 `src/interaction/` 目录（grabbable, grabbable-registry, xr-picker, manipulator, interaction-manager）
- 相关逻辑合并到 `manager/interaction.ts`（InteractionManager 状态机）

**旧类废弃**：
- `entities/controller.ts`（VrController） → 被 `PlayerController` + `XrInputDetector` 取代
- `ui/vr-button.ts` → 被 `ui/start-page.ts` 取代
- `ui/vr-voice-panel.ts` → 重构为 `ui/voice-panel.ts`

**架构变更**：
- 交互从 `Grabbable/Manipulator` 模式切换为 **状态机 + 事件驱动** 模式
- 按钮/摇杆处理从直接 gamepad 轮询切换为 **XrInputDetector 事件发射**
- 物体操作从 reparent-to-controller 模式扩展为 **ObjectIpulationProxy 通用操作代理**
- UI 面板挂载方式：ToolsWheel → 左手柄子节点，VoicePanel/ObjectPanel → 相机子节点
- 资源命名规范变更：`texture:name` / `cubemap:name` / `material:name` 等带有类型前缀的命名

### 2026-07-02

**VR 语音面板可见性切换**：
- `VoicePanel` 默认隐藏（`screenEntity.enabled = false`）
- Y 按钮改为打开工具轮盘，通过轮盘选择语音输入
- 新增 `changeScreenEnable()` / `isScreenEnable()` 方法

**3D 点云模型动态加载**：
- 语音面板 send 按钮触发 `voice:sendResult` 事件
- `loadSplat()` 加载 `.ply` 点云文件
- 加载后包装为 `ElementContainer`，放置到相机前方

**物体操控**：
- 移动 / 旋转 / 缩放三模式切换
- 左右手柄独立摇杆映射

### 2026-05-23

**AssetManager 资源集中管理**：
- 使用 `AssetListLoader` 异步加载 GLB、cubemap、材质、纹理资源

**Sky 类重构**：
- 使用 `scene.setSkybox()` 设置天空盒

### 2026-05-21

**VR 手柄 GLB 模型替换**、**射线可视化**、**射线-按钮交互**

### 2026-05-09

**VrController 重构**：修复 handedness 时序问题

### 2026-05-07

**FontManager 单例模式**：支持中文字符集

### 2026-05-05

**VR 语音面板集成**：ASR iframe 通信、world-space UI
