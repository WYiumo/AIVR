# AIVR — Appliance Interaction in VR

基于 WebXR 的 VR 交互应用，支持语音命令加载 3D 模型，以及使用 VR 手柄进行物体的抓取、移动、旋转、缩放等操作。

- **PlayCanvas Engine** `^2.20.6` — 高性能 WebGL / WebXR 引擎
- **TypeScript** `~6.0.2` — 类型安全的开发体验
- **Vite** `^8.0.8` — 极速开发服务器与构建工具
- **Sherpa-ONNX** — 离线中文语音识别（WASM）

---

## 功能特性

- **VR 6DoF 场景** — 天空盒、地面、环境光配置
- **手柄控制器追踪** — Meta Quest 手柄模型渲染 + 射线可视化
- **语音控制** — Y 按钮呼出工具轮盘，选择语音输入；ASR iframe 进行语音识别，触发 3D 模型加载
- **物体交互** — 射线拾取、抓取、移动、旋转、缩放
- **Gaussian Splatting** — 支持 `.ply` 点云模型的加载与渲染
- **工具轮盘** — 左控制器 Y 按钮打开，左右摇杆切换工具（语音输入 / 物体控制 / 定向移动）

---

## 环境要求

- **Node.js** ≥ 20.19.0 或 ≥ 22.12.0
- 推荐使用 [nvm](https://github.com/nvm-sh/nvm) 管理 Node 版本：

```bash
nvm install 22
nvm use 22
```

- **VR 设备**：Meta Quest 系列（通过 WebXR）

---

## 快速开始

```bash
# 克隆项目
git clone <your-repo-url> aivr
cd aivr

# 安装依赖
npm install

# 启动开发服务器（HTTPS + 局域网）
npm run dev
```

打开支持 WebXR 的浏览器（如 Meta Quest Browser），访问 `https://<你的IP>:5173`，点击「进入VR」按钮。

> **注意**：VR 需要 HTTPS，项目已通过 `vite-plugin-mkcert` 自动生成本地证书。

---

## 脚本

| 命令               | 说明                                   |
|--------------------|----------------------------------------|
| `npm run dev`      | 启动 Vite 开发服务器（HTTPS，局域网暴露） |
| `npm run build`    | TypeScript 类型检查 + 生产构建           |
| `npm run preview`  | 本地预览生产构建                         |
| `npm run predev`   | Node 版本检查（dev 前自动运行）           |

---

## 项目结构

```
AIVR/
├── index.html                    # 入口 HTML
├── package.json                  # 依赖与脚本
├── tsconfig.json                 # TypeScript 配置
├── vite.config.js                # Vite 配置（HTTPS + mkcert）
├── scripts/
│   └── ensure-node-version.cjs   # Node 版本检查
├── public/                       # 静态文件（PLY 点云模型）
│   ├── avocado_chair.ply
│   ├── canonical.ply
│   ├── female_student.ply
│   └── room.ply
├── assets/                       # 应用资源
│   ├── cubemap/                  # 天空盒环境贴图
│   ├── font/                     # 字体文件（SimHei.ttf + 字符集）
│   ├── materials/                # 材质 JSON
│   ├── models/                   # GLB 模型（手柄）
│   └── textures/                 # UI 纹理图片
├── asr/                          # ASR 语音识别模块（独立 iframe）
│   ├── index02.html              # ASR UI 入口
│   ├── asr-manager.js            # 多引擎 ASR 管理器
│   ├── recorder-core.js          # 录音核心
│   ├── sherpa-asr-engine.js      # Sherpa-ONNX 离线引擎
│   ├── funasr-engine.js          # FunASR 服务器引擎
│   ├── webspeech-engine.js       # Web Speech API 引擎
│   └── web-assembly-vad-asr-sherpa-onnx-zh-en-paraformer-small/ # WASM 模型
└── src/
    ├── main.ts                   # 应用入口，创建 PlayCanvas Application
    ├── app.ts                    # App 类 — 总协调器（薄层）
    ├── utils.ts                  # 工具函数（按键常量、splat 加载、AABB 检测）
    ├── style.css                 # 全局样式
    ├── app/
    │   ├── scene.ts              # Scene — 场景管理（环境光/天空/地面）
    │   ├── xrInput-detector.ts   # XrInputDetector — XR 输入手势检测
    │   ├── objectIpulation-proxy.ts # ObjectIpulationProxy — 物体操作代理
    │   ├── asr-handler.ts        # ASRHandler — ASR iframe 通信
    │   └── api.ts                # API 客户端（Axios 基础配置）
    ├── entities/
    │   ├── playerController.ts   # PlayerController — 玩家相机 + VR 手柄模型
    │   ├── ground.ts             # Ground — 地面实体
    │   ├── sky.ts                # Sky — 天空盒
    │   ├── cube.ts               # Cube — 测试立方体
    │   └── elementContainer.ts   # ElementContainer — 可交互 3D 元素包装
    ├── manager/
    │   ├── vr-manager.ts         # VrManager — VR 会话生命周期
    │   ├── assetLoader.ts        # AssetManager — 资源预加载
    │   ├── font.ts               # FontManager — 字体管理（单例）
    │   └── interaction.ts        # InteractionManager — VR 交互状态机
    └── ui/
        ├── start-page.ts         # VR 入口按钮（DOM）
        ├── voice-panel.ts        # VoicePanel — VR 语音面板（world-space UI）
        ├── tools-wheel.ts        # ToolsWheel — 工具选择轮盘
        └── object-panel.ts       # ObjectPanel — 物体操作面板
```

---

## 架构概览

```
main.ts (创建 PlayCanvas Application)
    ↓
App (app.ts) — 总协调器
    ├── Scene          — 场景管理（环境光、天空、地面）
    ├── VrManager      — VR 会话启动/停止
    ├── AssetManager   — 资源预加载（GLB / cubemap / 材质 / 纹理）
    ├── FontManager    — 字体管理（单例）
    ├── PlayerController — 相机 + 手柄模型 + 射线绘制
    ├── ASRHandler     — ASR iframe 通信
    │
    └── VR 启动后 (onVrStart):
        ├── XrInputDetector    — 输入手势检测→事件发射
        ├── ObjectIpulationProxy — 物体操作代理（移动/旋转/缩放）
        └── InteractionManager — 交互状态机
              ├── ToolsWheel    — 工具轮盘
              ├── VoicePanel    — 语音面板
              └── ObjectPanel   — 物体操作面板
```

---

## VR 交互流程

```
[Y 按钮] → 打开/关闭 工具轮盘
    ↓ 摇杆左右选择工具
[右 A 按钮] → 确认选择:
    ├── 0: 语音面板 → 录音 → send → 加载 PLY 模型
    ├── 1: 物体操作面板 → 选择操作 → Trigger 拾取物体 → 摇杆操作
    └── 2: 定向移动
```

### 物体操纵

| 操作 | 左摇杆 | 右摇杆 |
|------|--------|--------|
| 移动 | Y: 上下 | X: 左右, Y: 前后 |
| 旋转 | X: 绕 Z 轴 | X: 绕 Y 轴, Y: 绕 X 轴 |
| 缩放 | — | Y: 缩放比例 |

---

## 部署

```bash
npm run build
```

将生成的 `dist/` 目录部署到任意静态托管服务（Netlify、Vercel、Nginx 等）。

> **注意**：WebXR 要求 HTTPS。部署时确保服务器配置了有效的 SSL 证书。

---

## 更多资源

- [PlayCanvas Engine 文档](https://developer.playcanvas.com/en/api/)
- [WebXR 规范](https://immersiveweb.dev/)
- [Sherpa-ONNX 文档](https://github.com/k2-fsa/sherpa-onnx)

---

Made with ❤️ by **AIVR Team**。欢迎 PR 和 Issue！
