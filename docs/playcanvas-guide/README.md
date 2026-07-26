# PlayCanvas 3D VR 开发指南

本指南基于 **PlayCanvas Engine v2.20.6**，结合 AIVR 项目的实际开发经验，系统性地讲解如何使用 PlayCanvas 进行 Web 端 3D/VR 应用开发。

## 第一部分：基础指南

| 章节 | 说明 |
|------|------|
| [01 - 应用初始化](01-application-setup.md) | Application 创建、Canvas 配置、渲染循环 |
| [02 - 实体与组件系统](02-entity-component-system.md) | Entity、Component、GraphNode 层级 |
| [03 - 场景与渲染](03-scene-and-rendering.md) | Scene、Camera、Light、Skybox、Layer、Material |
| [04 - 资源管理](04-assets-and-resources.md) | Asset 加载、AssetListLoader、资源类型 |
| [05 - 输入系统](05-input-systems.md) | Mouse、Touch、Keyboard、Gamepad、ElementInput |
| [06 - WebXR 与 VR](06-webxr-and-vr.md) | XR 会话、VR 控制器、XR Input Source |
| [07 - UI 系统](07-ui-and-elements.md) | Element 组件、World-space UI、LayoutGroup |
| [08 - 数学库](08-math-library.md) | Vec3、Quat、Mat4、Ray、BoundingBox |
| [09 - 交互模式](09-interaction-patterns.md) | 拾取、抓取、操纵、射线检测 |
| [10 - 项目架构设计](10-project-architecture.md) | 3D 多交互项目的模块设计与关系 |
| [11 - API 速查手册](11-api-quick-reference.md) | 最常用 API 速查表 |

## 第二部分：API 详解

按类深入讲解核心 API，包含每个属性/方法的作用、参数含义、设置后的效果。

| 章节 | 涵盖类 | 说明 |
|------|--------|------|
| [12 - Application 详解](12-api-application.md) | `Application`, `AppBase` | 应用生命周期、Canvas 配置、渲染控制、时间缩放 |
| [13 - Scene 与 Entity](13-api-scene-entity.md) | `Scene`, `Entity`, `GraphNode` | 场景属性、实体层级、变换系统、组件管理 |
| [14 - Asset、Script 与 EventHandler](14-api-assets-scripts.md) | `Asset`, `AssetRegistry`, `AssetListLoader`, `Script`, `EventHandler` | 资源加载全流程、脚本系统、事件机制 |
| [15 - 渲染系统](15-api-rendering.md) | `Layer`, `Material`, `StandardMaterial`, `Texture`, `CameraComponent` | 渲染层、PBR 材质、相机控制 |
| [16 - UI 与 GSplat](16-api-ui-gsplat.md) | `ElementComponent`, `GSplatComponent`, `GSplatInstance` | UI 元素事件、Gaussian Splatting |
| [17 - 输入与 XR](17-api-input-xr.md) | `GamePads`, `XrManager`, `XrInput`, `XrInputSource`, `Picker` | 手柄管理、XR 会话、射线拾取 |

## 项目结构 (v0.1.0)

```
AIVR/src/
├── main.ts                  # 入口：Application 创建 + 渲染循环
├── app.ts                   # App 类（薄协调器）
│
├── app/                     # 核心子模块
│   ├── scene.ts             # Scene 管理器
│   ├── api.ts               # HTTP 客户端 (axios)
│   ├── event.ts             # AppEventHandler（自定义事件基类）
│   ├── asr-handler.ts       # ASR iframe 通信代理
│   └── splat-loader.ts      # Gaussian Splatting 加载器
│
├── manager/                 # 管理器模块
│   ├── vr-manager.ts        # VR 会话管理器
│   ├── asset-manager.ts     # 资源预加载
│   ├── font-manager.ts      # 字体管理（单例）
│   └── interaction-manager.ts # 交互协调器
│
├── entities/                # 3D 实体封装
│   ├── ground.ts            # 地面
│   ├── sky.ts               # 天空
│   ├── controller.ts        # VR 手柄控制器
│   └── cube.ts              # 测试方块实体
│
├── interaction/             # 交互系统
│   ├── grabbable.ts         # 可抓取标签 + 注册
│   ├── grabbable-registry.ts # 可抓取注册表 + AABB 拾取
│   ├── xr-picker.ts         # XR 射线拾取器
│   ├── manipulator.ts       # 抓取/旋转操纵器
│   └── highlight-box.ts     # 抓取高亮反馈框
│
└── ui/                      # UI 组件
    ├── vr-button.ts          # VR 入口按钮
    └── vr-voice-panel.ts     # VR 3D 语音面板
```

## 核心技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| PlayCanvas Engine | 2.20.6 | WebGL2/WebGPU 3D 引擎 |
| TypeScript | ~6.0.2 | 类型安全 |
| Vite | ^8.0.8 | 构建工具 |

## 参考资源

- [PlayCanvas 官方文档](https://api.playcanvas.com/)
- [PlayCanvas Engine GitHub](https://github.com/playcanvas/engine)
- [Engine API Reference](file:///D:/Study/project/playcanvas/engine/docs/index.html)
- [WebXR Specification](https://immersive-web.github.io/webxr/)
