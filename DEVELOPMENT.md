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
│   ├── asset-manager.ts  # AssetManager 类 - 资源预加载管理
│   └── font-manager.ts  # FontManager 类 - 单例字体管理器
├── asr/
│   └── asr-handler.ts   # ASR 处理器，与 iframe 通信
├── entities/
│   ├── ground.ts         # Ground 类 - 地面实体
│   ├── sky.ts           # Sky 类 - 天空盒配置
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
│  │   Ground    │  │    Sky      │  │VrController │  │
│  │ (ground.ts) │  │  (sky.ts)   │  │(controller) │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│  ┌─────────────┐  ┌─────────────┐                    │
│  │SplatLoader  │  │             │                    │
│  │(splat-load) │  │             │                    │
│  └─────────────┘  └─────────────┘                    │
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

**资源初始化流程**：

```typescript
async init(): Promise<void> {
    // 1. 加载预置资源（GLB 模型、cubemap、材质）
    await this.assetManager.loadInitAsset();
    console.log(this.app.assets);  // 查看所有已加载资源

    // 2. 初始化场景
    await this.scene.init();

    // 3. 创建相机
    this.createCamera();
}
```

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

### 3. AssetManager (app/asset-manager.ts)

**职责**：
- 集中管理所有预置资源的加载
- 使用 `AssetListLoader` 异步加载 GLB 模型、cubemap、材质
- 提供统一的资源访问入口

**预加载资源**：

| 资源名 | 类型 | 文件路径 | 用途 |
|--------|------|----------|------|
| `leftController` | container | `assets/meta_quest_touch/left.glb` | 左手手柄 GLB 模型 |
| `rightController` | container | `assets/meta_quest_touch/right.glb` | 右手手柄 GLB 模型 |
| `skybox` | cubemap | `assets/cubemap/helipad-env-atlas.png` | 环境贴图 |
| `metal` | material | `assets/materials/metal.json` | 金属材质 |

**关键代码**：

```typescript
private createDefaultAssets(): void {
    this.assets = [
        new pc.Asset('leftController', 'container', { url: 'assets/meta_quest_touch/left.glb' }),
        new pc.Asset('rightController', 'container', { url: 'assets/meta_quest_touch/right.glb' }),
        new pc.Asset('skybox', 'cubemap', { url: 'assets/cubemap/helipad-env-atlas.png' }),
        new pc.Asset('metal', 'material', { url: 'assets/materials/metal.json' })
    ];
}

async loadInitAsset(): Promise<void> {
    this.createDefaultAssets();
    return new Promise((resolve, reject) => {
        const loader = new pc.AssetListLoader(this.assets, this.app.assets);
        loader.load((err: Error) => {
            if (err) {
                console.error('Asset加载失败:', err);
                reject(err);
                return;
            }
            resolve();
        });
    });
}
```

**资源访问**：

```typescript
// 通过名称和类型查找资源
const metalAsset = app.assets.find('metal', 'material') as pc.Asset;
const material = metalAsset.resource as pc.StandardMaterial;

// 通过名称查找（类型未知）
const skyboxAsset = app.assets.find('skybox');
```

---

### 4. Scene (app/scene.ts)

**职责**：
- 场景基础配置（环境光、背景色）
- 管理地面、天空等实体
- 提供实体添加/移除接口

**配置接口**：

```typescript
interface SceneConfig {
    backgroundColor: pc.Color;  // 背景颜色
    showGrid: boolean;           // 是否显示网格
    gridScale: number;           // 网格大小
    ground?: GroundConfig;       // 地面配置
    sky?: SkyConfig;             // 天空配置
}
```

**关键方法**：

| 方法 | 说明 |
|------|------|
| `addEntity(entity)` | 添加实体到场景 |
| `removeEntity(entity)` | 移除并销毁实体 |
| `getGround()` | 获取地面实体 |
| `getSky()` | 获取天空实体 |
| `getCamera()` | 获取相机实体 |
| `setCamera(entity)` | 设置相机实体 |

---

### 5. Sky (entities/sky.ts)

**职责**：
- 配置场景天空盒
- 设置曝光度和旋转

**天空类型**：
- `infinite` - 无限天空（程序化渐变）
- `box` - 立方体天空盒
- `dome` - 穹顶天空盒

**关键代码**：

```typescript
// 构造函数中查找 skybox 资源
this.skyboxAsset = this.app.assets.find('skybox');

// 应用配置
private apply(): void {
    const { type, scale, centerHeight, exposure, rotation } = this.config;

    // 设置天空类型
    this.app.scene.sky.type = type;

    // 设置天空盒缩放和中心
    if (type !== 'infinite') {
        this.app.scene.sky.node.setLocalScale(scale, scale, scale);
        this.app.scene.sky.center = new pc.Vec3(0, centerHeight, 0);
    }

    // 设置 skybox 纹理（从 assets.find() 获取的资源）
    if (this.skyboxAsset) {
        this.app.scene.skybox = this.skyboxAsset.resources[1] as pc.Texture;
    }

    this.app.scene.skyboxMip = 3;  // 设置 mipmap 级别
    this.app.scene.exposure = exposure;
    this.app.scene.skyboxRotation = new pc.Quat().setFromEulerAngles(0, rotation, 0);
}
```

**cubemap 资源访问**：

> **重要**：cubemap 资源的纹理不在 `asset.resource` 中，而是在 `asset.resources[1]`

```typescript
// 检查资源结构
console.log('skyboxAsset.resources:', this.skyboxAsset.resources);
// 输出: (7) [null, Texture, null, null, null, null, null]
// 纹理位于 resources[1]

this.app.scene.skybox = this.skyboxAsset.resources[1] as pc.Texture;
```

---

### 6. Ground (entities/ground.ts)

**职责**：
- 创建地面实体
- 应用预置材质

**关键代码**：

```typescript
constructor(app: pc.Application, config: GroundConfig = {}) {
    const { size = 100, receiveShadows = true } = config;

    // 从 AssetManager 加载的材质
    const materialAsset = app.assets.find('metal', 'material') as pc.Asset;
    this.material = materialAsset.resource as pc.StandardMaterial;

    // 创建地面实体
    this.entity = new pc.Entity('ground');
    this.entity.setPosition(0, 0, 0);
    this.entity.setLocalScale(size, 1, size);

    // 添加渲染组件
    this.entity.addComponent('render', {
        type: 'plane',
        material: this.material,
        receiveShadows: receiveShadows,
        layer: 'World'
    });

    app.root.addChild(this.entity);
}
```

---

### 7. FontManager (app/font-manager.ts)

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

### 8. VrController (entities/controller.ts)

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
constructor(app: pc.Application) {
    this.app = app;
    this.leftModelAsset = this.app.assets.find('leftController');
    this.rightModelAsset = this.app.assets.find('rightController');
    this.setupControllers();
}
```

**GLB 模型替换**：

```typescript
private SetupControllerModel(controller: ControllerInfo): void {
    if (controller.modelAsset) return;

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
drawInputSourceRays(): void {
    if (!this.app.xr?.active) return;

    for (const inputSource of this.app.xr.input.inputSources) {
        if (inputSource.targetRayMode === pc.XRTARGETRAY_POINTER) {
            const origin = inputSource.getOrigin();
            const direction = inputSource.getDirection();
            if (origin && direction) {
                const endPoint = direction.clone().mulScalar(10).add(origin);
                const color = inputSource.selecting ? pc.Color.GREEN : pc.Color.WHITE;
                this.app.drawLine(origin, endPoint, color);
            }
        }
    }
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

### 9. VrVoicePanel (ui/vr-voice-panel.ts)

**职责**：
- 在 VR 空间内创建 3D world-space UI 面板
- 提供语音输入控制按钮
- 显示识别结果和状态
- 跟随 VR 相机位置

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
       this.screenEntity.lookAt(camPos);
   }
   ```

---

### 10. ASR 模块 (asr/)

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
    command: 'start'
}, '*');
```

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

### XR 输入源时序问题

**问题**：`XrInputSource.handedness` 在 `input.on('add')` 事件触发时为 `undefined`

**原因**：PlayCanvas 的 XrInputSource 包装了 WebXR 输入源，但在 'add' 事件触发时，底层属性尚未同步

**解决方案**：在 `update()` 循环中检测 handedness

```typescript
// 使用 needsAssignment 标志位
if (controller.needsAssignment && inputSource.handedness) {
    if (inputSource.handedness === 'right') {
        this.rightController = controller;
    } else if (inputSource.handedness === 'left') {
        this.leftController = controller;
    }
    controller.needsAssignment = false;
}
```

### Cubemap 资源访问

**问题**：cubemap 纹理资源不在 `asset.resource` 中

**解决**：访问 `asset.resources[1]`

```typescript
// skyboxAsset 结构
skyboxAsset.resources: (7) [null, Texture, null, null, null, null, null]
//                                              ↑
//                                         resources[1]

this.app.scene.skybox = this.skyboxAsset.resources[1] as pc.Texture;
```

### 环境反射材质限制

**已知限制**：PNG 格式的 cubemap atlas 无法用于材质的环境反射

**原因**：PNG 作为 2D 纹理加载时，`_cubemap` 属性为 `false`，`useSkybox` 无法生效

**现象**：
- `scene.skybox` 正确设置并显示
- `material.useSkybox` 为 `true`
- `material.envTex` 为 `undefined`
- 金属材质无环境反射效果

**解决方案**：
1. 使用 `.dds` 格式的 cubemap 文件（完整 cubemap 数据）
2. 或降低材质的 `reflectivity`，使用高 `shininess` + `specular` 颜色代替

---

## 问题排查

### Q: 材质 useSkybox 不生效

**检查**：
1. `scene.skybox` 是否正确设置（控制台查看）
2. 材质是否加载自 metal.json
3. 是否为 PNG cubemap atlas（PNG 无法用于环境反射）

**临时解决**：降低 `reflectivity`，增加 `shininess`

### Q: Y 按钮无响应

**检查**：
1. `onVrStart()` 中是否调用了 `vrController.setYButtonCallback()`
2. 模拟器/手柄是否正确映射了 Y 按钮（索引 5）
3. `leftController` 是否为 null

### Q: 语音面板不显示

**检查**：
1. `ElementInput` 是否在 Application 创建时启用
2. UI 元素是否在正确的 Layer（UI Layer）
3. `followTarget()` 是否被调用
4. 面板缩放是否合适（`setLocalScale(0.005, 0.005, 1)`）

### Q: 控制器不显示

**检查**：
1. `VrController` 是否在 `onVrStart()` 中正确创建
2. `update()` 是否被调用
3. GLB 模型是否正确加载（AssetManager）

---

## 更新日志

### 2026-05-23

**AssetManager 资源集中管理**：

- 新增 `src/app/asset-manager.ts`
- 使用 `AssetListLoader` 异步加载 GLB、cubemap、材质资源
- 统一管理 `leftController`、`rightController`、`skybox`、`metal` 资源

**Sky 类重构**：
- 通过 `this.app.assets.find('skybox')` 查找 skybox 资源
- 通过 `asset.resources[1]` 访问 cubemap 纹理
- 设置 `skyboxMip = 3` 控制 mipmap 级别

**Ground 材质应用**：
- 使用 AssetManager 预加载的 `metal` 材质
- 通过 `app.assets.find('metal', 'material')` 获取材质资源

**已知问题**：
- PNG cubemap atlas 无法用于材质环境反射
- `material.envTex` 为 `undefined`
- 金属材质 `useSkybox` 属性不生效

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