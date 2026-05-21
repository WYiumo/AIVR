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
- [x] 语音控制（VR 3D UI + ASR iframe）
- [x] VR 手柄 Y 按钮呼出语音面板

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
│   ├── vr-manager.ts     # VrManager 类 - VR 会话管理
│   └── font-manager.ts  # FontManager 类 - 单例字体管理器
├── asr/
│   └── asr-handler.ts   # ASR 处理器，与 iframe 通信
├── entities/
│   ├── cube.ts          # Cube 类 - 蓝色立方体示例
│   ├── controller.ts    # VrController 类 - VR 手柄控制器
│   └── splat-loader.ts   # SplatLoader 类 - Gaussian Splatting 加载器
└── ui/
    ├── vr-button.ts     # VR 入口按钮
    └── vr-voice-panel.ts # VR 3D 语音面板

AIVR/asr/                # ASR 模块（独立）
├── index02.html         # ASR UI 入口页面
├── core.html            # 轻量级 ASR 核心（仅 API，无 UI）
├── asr-manager.js       # 多引擎 ASR 管理器
├── recorder-core.js     # 录音核心
├── pcm.js / wav.js     # 编码器
├── wsconnecter.js       # WebSocket 连接
├── webspeech-engine.js  # 浏览器语音引擎
├── funasr-engine.js     # FunASR 服务器引擎
├── sherpa-asr-engine.js # Sherpa-ONNX 本地引擎
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
│  (app/index.ts)                                     │
│  - 协调 Scene、VrManager、Entity                     │
│  - 处理 VR 会话生命周期                                │
│  - 管理 VrController、VrVoicePanel                   │
└───────────┬─────────────────────┬───────────────────┘
            │                     │
            ▼                     ▼
┌───────────────────┐   ┌───────────────────┐
│      Scene        │   │    VrManager      │
│  (scene.ts)       │   │  (vr-manager.ts)  │
│  - 场景配置         │   │  - 会话管理        │
│  - 实体列表         │   │  - 事件发射        │
└───────────────────┘   └───────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────┐
│                     Entities                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │    Cube     │  │VrController │  │SplatLoader  │  │
│  │ (cube.ts)   │  │(controller) │  │(splat-load) │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────┐
│                        UI                           │
│  ┌─────────────────┐ ┌─────────────────────────────┐│
│  │   VrButton      │ │    VrVoicePanel             ││
│  │ (vr-button.ts)  │ │    (vr-voice-panel.ts)      ││
│  └─────────────────┘ │  - 3D world-space UI        ││
│                      │  - ASR 通信                  ││
│                      │  - Y 按钮呼出                ││
│                      └─────────────────────────────┘│
└─────────────────────────────────────────────────────┘
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

### 2. App (app/index.ts)

**职责**：
- 协调各模块的工作
- 管理 VR 会话生命周期
- 提供统一的更新循环
- 管理 VrController 和 VrVoicePanel

**VR 会话生命周期**：

```typescript
// VR 会话开始
private onVrStart(): void {
    // 创建 VR 控制器管理器
    this.vrController = new VrController(this.app);

    // 创建 VR 语音面板
    this.voicePanel = new VrVoicePanel(this.app, this.scene, {
        onStartRecording: () => handler?.startRecording(),
        onStopRecording: () => handler?.stopRecording(),
        onClear: () => handler?.clearResults(),
        onResult: (result) => console.log('识别结果:', result.text)
    });

    // 设置 Y 按钮回调（呼出语音面板）
    this.vrController?.setYButtonCallback(() => {
        this.voicePanel?.followTarget();
    });
}

// VR 会话结束
private onVrEnd(): void {
    this.voicePanel?.destroy();
    this.vrController?.destroy();
}
```

---

### 3. FontManager (app/font-manager.ts)

**职责**：
- 单例模式管理字体加载
- 使用 FontFace API 加载 TTF/OTF 字体
- 创建 PlayCanvas CanvasFont 供 UI 使用
- 支持中文字符集（3500_symbols.txt）

**关键方法**：

| 方法 | 说明 |
|------|------|
| `getInstance(app?)` | 获取单例实例 |
| `loadFont(name, url)` | 异步加载字体 |
| `getFont(name)` | 获取已加载的字体 |
| `updateFontTextures(name, text)` | 更新字体纹理图集 |

**使用示例**：

```typescript
// 初始化（首次获取时自动创建）
const fontManager = FontManager.getInstance(app);

// 加载字体
await fontManager.loadFont('SimHei', 'assets/font/SimHei.ttf');

// 获取字体用于 UI
const font = fontManager.getFont('SimHei');

// 更新纹理图集（显示新字符前必须调用）
fontManager.updateFontTextures('SimHei', '你好世界');
```

**已知问题与解决**：

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| CanvasFont fontSize: NaN | 构造函数缺少 fontSize 参数 | 使用 `{ fontName: name, fontSize: 32 }` |
| 汉字显示为方块 | 字体纹理图集不包含汉字 | 同时加载 3500_symbols.txt 字符集 |

---

### 4. VrController (entities/controller.ts)

**职责**：
- 追踪 VR 手柄控制器
- 处理手柄输入
- 实现抓取逻辑
- Y 按钮回调（呼出语音面板）
- GLB 模型加载与替换
- 射线可视化

**关键设计 - PlayCanvas 官方推荐模式**：

> **重要**：不要在 `on('add')` 事件时检测 `inputSource.handedness`。此时 PlayCanvas 尚未同步 WebXR 数据，`handedness` 为 `undefined`。应在 `update()` 循环中检测。

**GLB 模型加载**：

```typescript
// 构造函数中预加载模型
constructor(app: pc.Application) {
    this.app = app;
    this.loadControllerModels();  // 异步加载 left.glb 和 right.glb
    this.setupControllers();
}

// 加载 GLB 模型资产
private loadControllerModels(): Promise<void> {
    const assets = {
        left: new pc.Asset('leftController', 'container', {
            url: 'assets/meta_quest_touch/left.glb'
        }),
        right: new pc.Asset('rightController', 'container', {
            url: 'assets/meta_quest_touch/right.glb'
        })
    };

    const loader = new pc.AssetListLoader(Object.values(assets), this.app.assets);
    loader.load(() => {
        this.leftModelAsset = assets.left;
        this.rightModelAsset = assets.right;
        this.modelsLoaded = true;
    });
}
```

**GLB 模型替换**：

```typescript
// 在 update() 中尝试替换 box 模型为 GLB
private SetupControllerModel(controller: ControllerInfo): void {
    if (controller.modelAsset || !this.modelsLoaded) return;

    const handedness = controller.inputSource.handedness;
    const modelAsset = handedness === 'left' ? this.leftModelAsset :
                       handedness === 'right' ? this.rightModelAsset : null;
    if (!modelAsset) return;

    // 添加 model 组件（GLB）
    const containerResource = modelAsset.resource as any;
    controller.entity.addComponent('model', {
        type: 'asset',
        asset: containerResource?.model,
        castShadows: true
    });

    controller.modelAsset = modelAsset;
}
```

**射线可视化**：

```typescript
// 每帧绘制 XR 输入源射线
drawInputSourceRays(): void {
    if (!this.app.xr?.active) return;

    for (const inputSource of this.app.xr.input.inputSources) {
        if (inputSource.targetRayMode === pc.XRTARGETRAY_POINTER) {
            const origin = inputSource.getOrigin();
            const direction = inputSource.getDirection();
            if (origin && direction) {
                const endPoint = direction.clone().mulScalar(10).add(origin);
                // 按下扳机时绿色，否则白色
                const color = inputSource.selecting ? pc.Color.GREEN : pc.Color.WHITE;
                this.app.drawLine(origin, endPoint, color);
            }
        }
    }
}
```

**完整 update 流程**：

```typescript
update(_dt: number): void {
    const inputSources = this.app.xr?.input?.inputSources ?? [];

    for (const inputSource of inputSources) {
        const controller = this.controllers.find(c => c.inputSource === inputSource);
        if (!controller) continue;

        // 更新位置和旋转
        const position = inputSource.getLocalPosition();
        const rotation = inputSource.getLocalRotation();
        if (position) controller.entity.setLocalPosition(position);
        if (rotation) controller.entity.setLocalRotation(rotation);

        // 区分左右手
        if (controller.needsAssignment && inputSource.handedness) {
            if (inputSource.handedness === 'right') {
                this.rightController = controller;
            } else if (inputSource.handedness === 'left') {
                this.leftController = controller;
            }
            controller.needsAssignment = false;
        }

        // 替换 GLB 模型
        this.SetupControllerModel(controller);
    }

    // Y 按钮检测（左手，按钮索引 5）
    if (this.leftController) {
        const gamepad = this.leftController.inputSource.gamepad;
        const yButtonPressed = gamepad?.buttons?.[5]?.pressed ?? false;
        if (yButtonPressed && !this.prevYButtonState) {
            this.onYButtonPressed?.();
        }
        this.prevYButtonState = yButtonPressed;
    }

    // 射线可视化
    this.drawInputSourceRays();
}
```

**Gamepad 按钮映射（Meta Quest）**：

| 索引 | 左手 | 右手 |
|------|------|------|
| 0 | Trigger | Trigger |
| 1 | Grip | Grip |
| 2 |  |  |
| 3 |  |  |
| 4 | X | A |
| 5 | Y | B |
| 6 |  |  |

---

### 5. VrVoicePanel (ui/vr-voice-panel.ts)

**职责**：
- 在 VR 空间内创建 3D world-space UI 面板
- 提供语音输入控制按钮
- 显示识别结果和状态
- 跟随 VR 相机位置

**关键方法**：

| 方法 | 说明 |
|------|------|
| `followTarget()` | 跟随 XR 相机，重新定位面板 |
| `initASR()` | 初始化 ASR 处理器 |
| `startRecording()` | 开始录音 |
| `stopRecording()` | 停止录音 |
| `appendResultText(text)` | 追加识别结果文本 |
| `setStatus(status)` | 设置状态文本 |

**面板布局（LayoutGroup 自动布局）**：

```
┌────────────────────────────────┐
│  🎤 语音助手                    │  ← 标题
├────────────────────────────────┤
│  [开始]  [停止]  [清空]          │  ← 按钮行（水平布局）
├────────────────────────────────┤
│  ┌────────────────────────┐    │
│  │  识别结果将显示在这里...  │    │  ← 结果区域
│  └────────────────────────┘    │
│                                │
│  状态: 就绪                     │  ← 状态文本
└────────────────────────────────┘
```

**关键实现**：

1. **World-space UI**：`screenSpace: false` 使 UI 存在于 3D 空间
2. **LayoutGroup**：`orientation: VERTICAL/HORIZONTAL` 自动布局子元素
3. **跟随相机**：
   ```typescript
   followTarget(): void {
       const camera = this.scene.getCamera();
       const camPos = camera.getPosition();
       const forward = camera.forward;
   
       // 放置在相机前方 0.4 米
       const panelPos = camPos.clone().add(forward.mulScalar(0.4));
       this.screenEntity.setPosition(panelPos);
       this.screenEntity.lookAt(camPos);  // 朝向相机
   }
   ```

---

### 6. ASR 模块 (asr/)

**架构**：
- `asr-handler.ts` - 父页面模块，与 iframe 通信
- `core.html` - 轻量级 ASR iframe，仅 API 无 UI

**core.html 特点**：
- 移除所有 UI 元素和 console.log
- 移除 LightweightOptimizer（避免内存警告）
- 仅处理 postMessage 命令
- 支持 start/stop/clear/switch_engine 命令

**父页面与 iframe 通信**：

```typescript
// asr-handler.ts 发送命令
iframe.contentWindow.postMessage({
    type: 'vr_command',
    command: 'start'  // 'start' | 'stop' | 'clear' | 'switch_engine'
}, '*');

// iframe 接收并处理
window.addEventListener('message', (event) => {
    if (event.data.type === 'vr_command') {
        handleVrCommand(event.data.command, event.data);
    }
});
```

**ASR 事件回调**：

| 事件 | 说明 |
|------|------|
| `asr_result` | 识别结果，返回 `{ text, metadata }` |
| `asr_status` | 状态变化 |
| `asr_engine_change` | 引擎切换 |
| `asr_error` | 错误信息 |

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
    elementInput: new ElementInput(canvas)  // 启用元素输入系统
});
```

### XR 输入源时序问题

**问题**：`XrInputSource.handedness` 在 `input.on('add')` 事件触发时为 `undefined`

**原因**：PlayCanvas 的 XrInputSource 包装了 WebXR 输入源，但在 'add' 事件触发时，底层属性尚未同步

**解决方案**：在 `update()` 循环中检测 handedness，而非在 `onControllerAdded` 中

```typescript
// 错误：on('add') 时 handedness 为 undefined
app.xr.input.on('add', (inputSource) => {
    if (inputSource.handedness === 'right') {  // 始终 false
        // ...
    }
});

// 正确：在 update 中检测
update(dt): void {
    for (const inputSource of app.xr.input.inputSources) {
        if (inputSource.handedness === 'right') {  // 此时有值
            // ...
        }
    }
}
```

### XR 事件

```typescript
app.xr.on('start', () => {})      // 会话开始
app.xr.on('end', () => {})         // 会话结束
app.xr.on('available:XRTYPE_VR', (available) => {})  // 可用性变化

app.xr.input.on('add', (inputSource) => {})    // 输入源添加
app.xr.input.on('remove', (inputSource) => {}) // 输入源移除
```

---

## 开发需求清单

### 优先级 P0 - 核心功能

- [x] **修复 VR 控制器可视化**：当前手柄使用简单 box 模型，应改为更符合实际手柄的模型
- [ ] **实现射线检测**：使用 `getRightRay()` 实现射线与场景物体的交互
- [ ] **实现抓取功能**：`VrController.startGrab()` 和 `endGrab()` 需要与场景物体联动

### 优先级 P1 - 交互功能

- [x] **VR 语音面板**：在 VR 中显示 3D UI 面板用于语音输入控制
- [x] **Y 按钮呼出**：左手 Y 按钮触发 `followTarget()` 重新定位面板
- [ ] **物体变换**：实现立方体的移动、旋转、缩放
- [ ] **手柄震动反馈**：抓取物体时触发震动

### 优先级 P2 - 扩展功能

- [x] **语音控制**：ASR iframe 集成，支持 VR 命令
- [ ] **场景切换**：支持多个场景的加载和切换
- [ ] **物体导入**：支持加载外部 3D 模型

### 优先级 P3 - Splatting 集成

- [x] **Splat 加载器**：已实现 SplatLoader 类
- [ ] **VR 中 Splat 控制**：在 VR 中控制 splat 模型的位置和旋转
- [ ] **LOD 支持**：根据距离调整 splat 渲染质量

---

## 问题排查

### Q: Y 按钮无响应

**检查**：
1. `onVrStart()` 中是否调用了 `vrController.setYButtonCallback()`
2. 模拟器/手柄是否正确映射了 Y 按钮（索引 5）
3. `leftController` 是否为 null（检查 update 中是否有 "Y button pressed" 日志）

### Q: 语音面板不显示

**检查**：
1. `ElementInput` 是否在 Application 创建时启用
2. UI 元素是否在正确的 Layer（UI Layer）
3. `followTarget()` 是否被调用（Y 按钮按下时）
4. 面板缩放是否合适（`setLocalScale(0.005, 0.005, 1)`）

### Q: 控制器不显示

**检查**：
1. `VrController` 是否在 `onVrStart()` 中正确创建
2. `update()` 是否被调用
3. 实体是否添加到了场景（`app.root.addChild`）

### Q: 汉字显示为方块

**原因**：字体纹理图集不包含要显示的汉字字符

**解决**：调用 `fontManager.updateFontTextures('SimHei', text)` 更新纹理

---

## 代码规范

### 类型定义

- 使用 `pc.` 前缀访问 PlayCanvas 类型
- 自定义类使用 PascalCase 命名
- 接口使用 Interface 后缀（如 `CubeConfig`）

### VR 控制器检测

```typescript
// 官方推荐模式：在 update 中检测 handedness
update(dt): void {
    this.rightController = null;
    this.leftController = null;

    for (const inputSource of this.app.xr?.input?.inputSources ?? []) {
        if (inputSource.handedness === 'right') {
            this.rightController = this.findController(inputSource);
        } else if (inputSource.handedness === 'left') {
            this.leftController = this.findController(inputSource);
        }
    }
}
```

---

## 参考资源

- [PlayCanvas XR 文档](https://developer.playcanvas.com/user-manual/xr/)
- [PlayCanvas Engine API](https://playcanvas.github.io/engine/)
- [WebXR 规范](https://immersive-web.github.io/webxr/)
- [vr-controllers.example.mjs](../playcanvas/engine/examples/src/examples/xr/vr-controllers.example.mjs)
- [xr-ui.example.mjs](../playcanvas/engine/examples/src/examples/xr/xr-ui.example.mjs)

---

## 更新日志

### 2026-05-21

**VR 手柄 GLB 模型替换**：
- 新增 GLB 模型预加载机制（`loadControllerModels()`）
- 使用 `AssetListLoader` 异步加载 `left.glb` / `right.glb`
- 在 `update()` 中检测模型加载状态，将 box 替换为 GLB 模型
- `ControllerInfo` 接口添加 `modelAsset` 字段

**射线可视化**：
- `VrController.drawInputSourceRays()` 每帧绘制 XR 输入源射线
- 射线方向：`inputSource.getOrigin()` + `inputSource.getDirection()`
- 按下扳机时射线为绿色，否则为白色
- 使用 `app.drawLine()` 绘制调试线段

**射线-按钮交互**：
- PlayCanvas 内置射线-UI 交集检测
- 为 `VrVoicePanel` 按钮添加 `selectstart` 事件监听
- 射线指向按钮并按下扳机时自动触发点击

### 2026-05-09

**VrController 重构**：
- 修复 `handedness` 为 `undefined` 的时序问题
- 将左右手检测移至 `update()` 循环中
- 符合 PlayCanvas 官方 vr-controllers 示例推荐模式
- Y 按钮索引更正为 5（Meta Quest）

**VrVoicePanel Y 按钮呼出**：
- `VrController.setYButtonCallback()` 注册回调
- Y 按钮按下时调用 `voicePanel.followTarget()` 重定位面板

### 2026-05-07

**FontManager 单例模式**：
- 新增 `src/app/font-manager.ts`
- 使用 FontFace API 加载 TTF 字体
- 支持中文字符集（3500_symbols.txt）
- 修复 CanvasFont fontSize: NaN 问题

### 2026-05-05

**VR 语音面板集成**：
- 新增 `src/asr/asr-handler.ts` - ASR iframe 通信模块
- 新增 `src/ui/vr-voice-panel.ts` - VR 3D 语音面板组件
- 修改 `asr/index02.html` - 添加 VR 命令处理
- 修改 `src/main.ts` - 添加 `ElementInput` 系统支持 UI 交互
- 修改 `src/app/index.ts` - 集成语音面板到 VR 会话

**技术要点**：
- WebXR DOM Overlay 仅支持 AR，不支持纯 VR
- VR 中必须使用 3D world-space UI
- `elementInput` 系统必须在 Application 创建时初始化
- 面板跟随使用 `lookAt()` 正确朝向用户

### 2026-04-17

- 初始项目架构设计
- 实现蓝色立方体显示
- 实现 VR 会话管理
- 实现 VR 控制器追踪
- SplatLoader 实现 Gaussian Splatting 加载
- 修复 Application vs AppBase 问题
