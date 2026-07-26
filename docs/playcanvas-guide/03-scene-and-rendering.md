# 03 - 场景与渲染

## 概述

PlayCanvas 的场景系统管理 3D 世界中的所有视觉元素。核心组件包括 `Scene`（场景配置）、`Camera`（相机）、`Layer`（渲染层）、`Light`（光照）、`Sky`（天空盒）和 `Material`（材质）。

## Scene（场景）

### 访问场景

```typescript
const scene = app.scene; // pc.Scene
```

### 场景基本配置

```typescript
// 环境光（最基础的光照，无方向）
app.scene.ambientLight = new pc.Color(0.8, 0.8, 0.8);

// 环境光来源（更高级）
app.scene.ambientSource = pc.AMBIENTSRC_CONSTANT;    // 使用 ambientLight 颜色
// 或者
app.scene.ambientSource = pc.AMBIENTSRC_ENVALATLAS;  // 使用环境贴图
// 或者
app.scene.ambientSource = pc.AMBIENTSRC_AMBIENTSH;   // 使用球谐函数

// 色调映射
app.scene.tonemapping = pc.TONEMAP_ACES2;  // 推荐
// 可选: TONEMAP_LINEAR, TONEMAP_FILMIC, TONEMAP_HEJL, TONEMAP_ACES, TONEMAP_NEUTRAL

// 曝光
app.scene.exposure = 1.0;

// 伽马校正
app.scene.gammaCorrection = pc.GAMMA_SRGB;

// 雾
app.scene.fog = pc.FOG_NONE;     // 无雾
app.scene.fog = pc.FOG_LINEAR;   // 线性雾
app.scene.fog = pc.FOG_EXP;      // 指数雾
app.scene.fog = pc.FOG_EXP2;     // 指数平方雾

app.scene.fogColor = new pc.Color(0.8, 0.9, 0.9);
app.scene.fogStart = 10;         // 线性雾起始距离
app.scene.fogEnd = 100;          // 线性雾结束距离
app.scene.fogDensity = 0.01;     // 指数雾密度

// 天空盒
app.scene.skybox = texture;      // pc.Texture (cubemap)
app.scene.skyboxMip = 2;         // Mipmap 级别
app.scene.skyboxRotation = new pc.Quat().setFromEulerAngles(0, 45, 0);
```

### Scene 对象属性速查

| 属性 | 类型 | 说明 |
|------|------|------|
| `ambientLight` | `Color` | 环境光颜色 |
| `ambientSource` | `number` | 环境光来源类型 |
| `tonemapping` | `number` | 色调映射算法 |
| `exposure` | `number` | 曝光值 |
| `gammaCorrection` | `number` | 伽马校正 |
| `fog` | `number` | 雾类型 |
| `fogColor` | `Color` | 雾颜色 |
| `fogStart` | `number` | 雾起始（线性） |
| `fogEnd` | `number` | 雾结束（线性） |
| `fogDensity` | `number` | 雾密度（指数） |
| `skybox` | `Texture` | 天空盒纹理 |
| `skyboxMip` | `number` | 天空盒 mip 级别 |
| `skyboxRotation` | `Quat` | 天空盒旋转 |
| `sky` | `Sky` | 程序化天空对象 |
| `layers` | `LayerComposition` | 渲染层组合 |

## Layer（渲染层）

PlayCanvas 使用 Layer 来控制渲染顺序和可见性：

### 内置 Layer

```typescript
// 获取内置图层
const worldLayer = app.scene.layers.getLayerById(pc.LAYERID_WORLD);   // 0 - 世界层
const uiLayer = app.scene.layers.getLayerById(pc.LAYERID_UI);         // 1 - UI 层
const depthLayer = app.scene.layers.getLayerById(pc.LAYERID_DEPTH);   // 2 - 深度层
const skyLayer = app.scene.layers.getLayerById(pc.LAYERID_SKYBOX);    // 3 - 天空层
const immedLayer = app.scene.layers.getLayerById(pc.LAYERID_IMMEDIATE); // 4 - 立即层

// 获取自定义图层
const hudLayer = app.scene.layers.getLayerById(pc.LAYER_HUD);   // 5
const gizmoLayer = app.scene.layers.getLayerById(pc.LAYER_GIZMO); // 6
```

### Layer 配置

```typescript
const layer = app.scene.layers.getLayerById(pc.LAYERID_WORLD);

// 启用/禁用
layer.enabled = true;

// 清屏
layer.clearColor = true;
layer.clearDepth = true;

// 排序模式
layer.opaqueSortMode = pc.SORTMODE_FRONT2BACK;
layer.transparentSortMode = pc.SORTMODE_BACK2FRONT;
```

### 将实体放入指定 Layer

```typescript
// 在 render 组件中指定 Layer
entity.addComponent('render', {
    type: 'box',
    layers: [worldLayer.id]  // 可以指定多个 layer
});

// Element 组件也有 layers 属性
element.addComponent('element', {
    type: 'text',
    layers: [uiLayer.id]
});
```

## Camera（相机）

### 创建相机

```typescript
const camera = new pc.Entity('Camera');
camera.addComponent('camera', {
    clearColor: new pc.Color(0.1, 0.1, 0.15),
    fov: 60,                     // 垂直视场角
    nearClip: 0.1,               // 近裁剪面
    farClip: 1000,               // 远裁剪面
    projection: pc.PROJECTION_PERSPECTIVE,  // 透视投影
    priority: 0,                 // 多相机时的优先级（数值越大越优先）
    rect: new pc.Vec4(0, 0, 1, 1),  // 视口矩形
    clearDepthBuffer: true,
    clearColorBuffer: true
});

camera.setPosition(0, 1.6, 0);  // 人眼高度
app.root.addChild(camera);
```

### 相机组件属性

```typescript
const cam = entity.camera;

// 投影类型
cam.projection = pc.PROJECTION_PERSPECTIVE;   // 透视
cam.projection = pc.PROJECTION_ORTHOGRAPHIC;  // 正交

// 视场角（透视相机）
cam.fov = 60;

// 正交尺寸
cam.orthoHeight = 10;

// 裁剪面
cam.nearClip = 0.1;
cam.farClip = 1000;

// 视口
cam.rect = new pc.Vec4(0, 0, 1, 1);       // 全屏
cam.rect = new pc.Vec4(0, 0, 0.5, 0.5);   // 左下 1/4

// 宽高比
cam.aspectRatio = 16 / 9;
cam.aspectRatioMode = pc.ASPECT_AUTO;

// 清屏
cam.clearColor = new pc.Color(0.1, 0.1, 0.1);
cam.clearDepthBuffer = true;
cam.clearColorBuffer = true;

// 渲染层（相机只渲染这些层）
cam.layers = [worldLayerId, skyLayerId];

// 后处理效果
cam.postEffects; // PostEffectQueue

// 优先级
cam.priority = 0;

// 裁剪/剔除
cam.frustumCulling = true;
cam.cullFaces = true;
```

### 获取相机方向

```typescript
const camera = cameraEntity;
const camPos = camera.getPosition();
const forward = camera.forward;    // 世界空间前方向 (归一化)
const up = camera.up;              // 世界空间上方向
const right = camera.right;        // 世界空间右方向

// 相机前方指定距离的位置
const target = new pc.Vec3()
    .copy(camPos)
    .add(forward.mulScalar(1.5));
```

## Light（光照）

### 光源类型

```typescript
// 方向光（太阳光，无限远）
const dirLight = new pc.Entity('DirectionalLight');
dirLight.addComponent('light', {
    type: 'directional',       // pc.LIGHTTYPE_DIRECTIONAL
    color: new pc.Color(1, 0.95, 0.8),
    intensity: 1.5,
    castShadows: true,
    shadowResolution: 2048,
    shadowDistance: 50,
    numCascades: 4,            // 级联阴影（CSM）
    shadowType: pc.SHADOW_PCF5
});
dirLight.setEulerAngles(45, 30, 0);

// 点光源（灯泡，有范围）
const pointLight = new pc.Entity('PointLight');
pointLight.addComponent('light', {
    type: 'point',             // pc.LIGHTTYPE_POINT 或 LIGHTTYPE_OMNI
    color: new pc.Color(1, 0.8, 0.5),
    intensity: 5,
    range: 10,                 // 光照范围
    castShadows: true
});

// 聚光灯（手电筒，有方向和角度）
const spotLight = new pc.Entity('SpotLight');
spotLight.addComponent('light', {
    type: 'spot',              // pc.LIGHTTYPE_SPOT
    color: new pc.Color(1, 1, 1),
    intensity: 10,
    range: 20,
    innerConeAngle: 20,        // 内锥角
    outerConeAngle: 30,        // 外锥角
    castShadows: true
});
```

### 光源组件属性

```typescript
const light = entity.light;

light.type          // 'directional' | 'point' | 'spot'
light.color         // pc.Color
light.intensity     // 强度
light.range         // 范围（point/spot）
light.castShadows   // 投射阴影
light.shadowResolution  // 阴影贴图分辨率
light.shadowDistance    // 阴影距离
light.falloffMode       // LIGHTFALLOFF_LINEAR | LIGHTFALLOFF_INVERSESQUARED
```

### 烘焙光照

```typescript
// 启用光照贴图烘焙
entity.render.castShadows = true;
entity.render.receiveShadows = true;
entity.render.lightmapped = true;
```

### 点光源手柄光（VR 中常见）

```typescript
controllerEntity.addComponent('light', {
    type: 'point',
    color: new pc.Color(0.2, 0.5, 1.0),
    range: 0.5,
    intensity: 0.5
});
```

## Sky（天空）

### 程序化天空

```typescript
// 使用内置 Sky 对象
const sky = app.scene.sky;

// 天空类型
sky.type = 'infinite';  // 程序化无限天空
// 或
sky.type = 'box';       // 立方体天空盒
// 或
sky.type = 'dome';      // 穹顶天空盒

// 配置程序化天空
sky.node.setLocalScale(1000, 1000, 1000);
sky.center = new pc.Vec3(0, 0, 0);  // 天空中心点
```

### Skybox 天空盒

```typescript
// 设置 cubemap 纹理作为天空盒
const skyboxAsset = app.assets.find('skybox');
const texture = skyboxAsset.resources[1] as pc.Texture;
app.scene.skybox = texture;
app.scene.skyboxMip = 3;
app.scene.skyboxRotation = new pc.Quat().setFromEulerAngles(0, 0, 0);

// 天空盒曝光
app.scene.exposure = 2.0;
```

### 自定义 Sky 类（AIVR 项目模式）

```typescript
export class Sky {
    private app: pc.Application;
    private config: SkyConfig;
    private skyboxAsset: pc.Asset | null = null;

    constructor(app: pc.Application, config: SkyConfig = {}) {
        this.app = app;
        this.config = config;
        this.skyboxAsset = this.app.assets.find('skybox');
        this.apply();
    }

    private apply(): void {
        this.app.scene.sky.type = this.config.type ?? 'infinite';
        this.app.scene.sky.node.setLocalScale(200, 200, 200);
        this.app.scene.sky.center = new pc.Vec3(0, 0, 0);

        if (this.skyboxAsset) {
            this.app.scene.skybox = this.skyboxAsset.resources[1] as pc.Texture;
        }
        this.app.scene.skyboxMip = 3;
        this.app.scene.exposure = 2.0;
    }
}
```

## Material（材质）

### StandardMaterial

PlayCanvas 的 `StandardMaterial` 是基于物理的渲染（PBR）材质：

```typescript
const material = new pc.StandardMaterial();

// 基础属性
material.diffuse = new pc.Color(0.5, 0.5, 0.5);
material.diffuseMap = texture;
material.diffuseTint = true;      // 使用 diffuse 颜色着色贴图

// 金属度/粗糙度
material.metalness = 0.5;         // 0 = 非金属, 1 = 完全金属
material.metalnessMap = texture;
material.gloss = 0.8;             // 替代 roughness (gloss = 1 - roughness)
material.glossMap = texture;

// 法线贴图
material.normalMap = normalTexture;

// 环境贴图
material.envMap = envTexture;
material.useSkybox = true;         // 使用 scene.skybox 作为环境贴图
material.reflectivity = 0.5;       // 反射率（需要有效 envMap）

// 自发光
material.emissive = new pc.Color(0, 0, 0);
material.emissiveMap = texture;
material.emissiveIntensity = 1.0;

// 透明度
material.opacity = 1.0;
material.opacityMap = texture;
material.blendType = pc.BLEND_NORMAL;

// 其他
material.shininess = 30;           // Blinn-Phong 镜面高光
material.specular = new pc.Color(1, 1, 1);
material.aoMap = aoTexture;        // 环境光遮蔽贴图
material.heightMap = heightMap;    // 高度贴图（视差映射）
material.cull = pc.CULLFACE_BACK;  // 面剔除
material.depthWrite = true;
material.depthTest = true;

// 更新材质（修改属性后必须调用）
material.update();
```

### 从 JSON 加载材质

```typescript
// 创建材质 Asset
const metalAsset = new pc.Asset('metal', 'material', {
    url: 'assets/materials/metal.json'
});

// 使用 AssetListLoader 加载
loader.load((err) => {
    const material = metalAsset.resource as pc.StandardMaterial;
    // 使用 material
});
```

### 材质 JSON 示例

```json
{
    "shader": "blinn",
    "diffuse": [0.5, 0.5, 0.5],
    "shininess": 30,
    "specular": [0.5, 0.5, 0.5],
    "metalness": 0.8,
    "gloss": 0.3
}
```

## Render（渲染组件）

```typescript
entity.addComponent('render', {
    // 渲染类型
    type: 'box',       // 'box' | 'plane' | 'sphere' | 'capsule' | 'cone'
                       // | 'cylinder' | 'torus' | 'asset'

    // 资源引用（type: 'asset' 时）
    asset: modelAsset, // pc.Asset (container 类型的 GLB/GLTF)

    // 材质
    material: myMaterial,

    // 渲染层
    layers: [worldLayerId],

    // 阴影
    castShadows: true,
    receiveShadows: false,
    castShadowsLightmap: true,

    // 光照
    lightmapped: false,
    lightmap: null,

    // 批处理
    batchGroupId: -1
});
```

### 访问渲染数据

```typescript
const render = entity.render;
if (render && render.meshInstances.length > 0) {
    const meshInstance = render.meshInstances[0];

    // AABB 包围盒
    const aabb = meshInstance.aabb;
    console.log('AABB center:', aabb.center);
    console.log('AABB halfExtents:', aabb.halfExtents);

    // 材质
    const mat = meshInstance.material;

    // 网格
    const mesh = meshInstance.mesh;
}
```

## 几何体创建

PlayCanvas 内置了多种几何体：

```typescript
import {
    BoxGeometry, PlaneGeometry, SphereGeometry,
    CapsuleGeometry, ConeGeometry, CylinderGeometry,
    TorusGeometry, DomeGeometry
} from 'playcanvas';

// 创建实体并手动设置几何体
const entity = new pc.Entity('CustomGeometry');
const geometry = new BoxGeometry({ halfExtents: new pc.Vec3(1, 1, 1) });
const mesh = new pc.Mesh();
mesh.setGeometry(geometry);
// ... 设置材质等
```

## 场景管理器模式（AIVR 项目）

将场景相关逻辑封装成独立的 `Scene` 管理器类：

```typescript
export class Scene {
    readonly app: pc.Application;
    readonly config: SceneConfig;

    private entities: Set<pc.Entity> = new Set();
    private cameraEntity: pc.Entity | null = null;
    private ground: Ground | null = null;
    private sky: Sky | null = null;

    async init(): Promise<void> {
        this.app.scene.ambientLight = new pc.Color(0.8, 0.8, 0.8);
        this.sky = new Sky(this.app, this.config.sky);
        this.ground = new Ground(this.app, this.config.ground);
    }

    addEntity(entity: pc.Entity): void {
        this.entities.add(entity);
        this.app.root.addChild(entity);
    }

    removeEntity(entity: pc.Entity): void {
        this.entities.delete(entity);
        entity.destroy();
    }

    getCamera(): pc.Entity | null { return this.cameraEntity; }
    setCamera(entity: pc.Entity): void { this.cameraEntity = entity; }
}
```

## 常见问题

### Q: cubemap 纹理在哪个字段？

cubemap 类型 Asset 的纹理不在 `asset.resource`，而在 `asset.resources[1]` 中：

```typescript
const skyboxAsset = app.assets.find('skybox');
// skyboxAsset.resources: (7) [null, Texture, null, null, null, null, null]
const texture = skyboxAsset.resources[1] as pc.Texture;
app.scene.skybox = texture;
```

### Q: PNG cubemap atlas 不支持环境反射？

是的——PNG 加载为 2D 纹理时 `_cubemap` 为 `false`，`material.useSkybox` 无法生效，`material.envTex` 为 `undefined`。

**解决方案**：
1. 使用 `.dds` 格式 cubemap
2. 或降低 reflectivity + 增加 shininess/specular

### Q: 如何获取 UI Layer？

```typescript
// 三种方式，按优先级
const layer = app.scene.layers.getLayerByName('UI');
const uiLayer = app.scene.layers.getLayerById(pc.LAYERID_UI);
const worldLayer = app.scene.layers.getLayerById(pc.LAYERID_WORLD);
```

## 关键 API 汇总

```typescript
// Scene
app.scene.ambientLight = new pc.Color(r, g, b)
app.scene.tonemapping = pc.TONEMAP_ACES2
app.scene.exposure
app.scene.skybox / skyboxMip / skyboxRotation
app.scene.fog / fogColor / fogStart / fogEnd
app.scene.layers.getLayerById(id)

// Camera
entity.addComponent('camera', { fov, nearClip, farClip, clearColor })
camera.forward / .up / .right
camera.getPosition() / .getRotation()

// Light
entity.addComponent('light', { type, color, intensity, range, castShadows })

// Material
new pc.StandardMaterial()
material.diffuse / metalness / gloss
material.diffuseMap / normalMap / envMap
material.update()

// Render
entity.addComponent('render', { type, material, layers, castShadows })
entity.render.meshInstances[0].aabb
```
