# 15 - 渲染系统

> 涵盖：`Layer`、`Material`、`StandardMaterial`、`Texture`、`CameraComponent`

## Layer（渲染层）

Layer 控制哪些对象在何时以何种顺序渲染。

### 内置 Layer

| Layer | ID | 用途 |
|-------|-----|------|
| `LAYERID_WORLD` | 0 | 世界几何体 |
| `LAYERID_UI` | 1 | UI 元素 |
| `LAYERID_DEPTH` | 2 | 深度预渲染 |
| `LAYERID_SKYBOX` | 3 | 天空盒 |
| `LAYERID_IMMEDIATE` | 4 | 即时模式绘制 |

渲染顺序按 ID 从小到大：WORLD → UI → DEPTH → SKYBOX → IMMEDIATE。

### Layer 属性

```typescript
const layer = app.scene.layers.getLayerById(pc.LAYERID_WORLD);

// 基础
layer.id: number                    // 唯一 ID
layer.name: string                  // 名称
layer.enabled: boolean              // 是否启用（默认 true）

// 清屏控制
layer.clearColorBuffer: boolean     // 渲染前清理颜色缓冲（默认 depends）
layer.clearDepthBuffer: boolean     // 渲染前清理深度缓冲（默认 depends）
// 效果：如果不清除，上一帧/上一层的画面会保留

// 排序模式——控制该层内 mesh 的渲染顺序
layer.opaqueSortMode: number        // 不透明物体排序（默认 MATERIALMESH）
layer.transparentSortMode: number   // 半透明物体排序（默认 BACK2FRONT）

// 排序模式选项：
// SORTMODE_NONE          - 不排序
// SORTMODE_MANUAL        - 手动控制
// SORTMODE_MATERIALMESH  - 按材质/网格分组（减少状态切换，GPU 友好）
// SORTMODE_BACK2FRONT    - 远到近（半透明物体需要这个）
// SORTMODE_FRONT2BACK    - 近到远（不透明物体，减少 overdraw）
// SORTMODE_CUSTOM        - 自定义排序回调
```

### 自定义排序

```typescript
layer.customSortCallback = (a, b) => {
    // a, b 是 MeshInstance
    return a.sortDistance - b.sortDistance;
};

layer.customCalculateSortValues = (meshInstance, cameraPosition) => {
    // 自定义排序值
};
```

### Layer 回调

```typescript
layer.onEnable = () => { /* 该层开始渲染前 */ };
layer.onDisable = () => { /* 该层渲染后 */ };
layer.onPreRender = () => { /* 该层渲染前 */ };
layer.onPostRender = () => { /* 该层渲染后 */ };
// ⚠️ 这些需要在 set:layers 事件中设置
```

---

## Texture（纹理）

### 创建纹理

通常纹理由 Asset 系统加载，不需要手动创建：

```typescript
// 通过 Asset 加载（最常见）
const textureAsset = app.assets.find('myTexture');
const texture = textureAsset.resource; // pc.Texture
```

### Texture 属性

```typescript
texture.name: string
texture.width: number          // 像素宽度
texture.height: number         // 像素高度
texture.depth: number          // 纹理深度（3D 纹理）
texture.format: number         // 像素格式（PIXELFORMAT_RGBA8 等）
texture.cubemap: boolean       // 是否是 cubemap
texture.volume: boolean        // 是否是 3D 纹理
texture.mipmaps: boolean       // 是否有 mipmap
texture.addressU / addressV: number  // 寻址模式（ADDRESS_REPEAT / CLAMP_TO_EDGE 等）
texture.minFilter: number      // 缩小过滤器
texture.magFilter: number      // 放大过滤器
```

### 纹理过滤和寻址

```typescript
// 寻址模式
texture.addressU = pc.ADDRESS_REPEAT;           // 重复（默认）
texture.addressU = pc.ADDRESS_CLAMP_TO_EDGE;    // 边缘钳制
texture.addressU = pc.ADDRESS_MIRRORED_REPEAT;  // 镜像重复

// 过滤模式
texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;  // 三线性（默认，最平滑）
texture.magFilter = pc.FILTER_LINEAR;                // 线性
```

---

## Material（基础材质类）

`Material` 是所有材质的基类。用户通常使用 `StandardMaterial` 而非直接使用 Material。

```typescript
// Material 基础属性
material.blendType: number      // 混合模式（BLEND_NORMAL / BLEND_ADDITIVE 等）
material.blendState: BlendState // 自定义混合状态
material.depthTest: boolean     // 深度测试（默认 true）
material.depthWrite: boolean    // 深度写入（默认 true，半透明物体通常设为 false）
material.cull: number           // 面剔除（CULLFACE_BACK 默认）
material.alphaTest: number      // Alpha 测试阈值（> 此值的片段才渲染）
material.alphaToCoverage: boolean

// 更新
material.update()               // ⚠️ 修改属性后必须调用，否则不生效
material.destroy()              // 销毁
material.copy(source)           // 从其他材质复制属性
material.clone()                // 克隆材质
```

### 混合模式

```typescript
material.blendType = pc.BLEND_NORMAL;            // 正常（不透明或 alpha）
material.blendType = pc.BLEND_PREMULTIPLIED;     // 预乘 Alpha
material.blendType = pc.BLEND_ADDITIVE;          // 加法混合（发光效果）
material.blendType = pc.BLEND_ADDITIVEALPHA;     // 加法 + Alpha
material.blendType = pc.BLEND_MULTIPLICATIVE;    // 乘法混合（阴影效果）
material.blendType = pc.BLEND_SCREEN;            // 屏幕混合
material.blendType = pc.BLEND_SUBTRACTIVE;       // 减法混合
```

效果：`BLEND_NORMAL` 是默认，不透明物体用它。`BLEND_ADDITIVE` 适合粒子、光晕、能量盾。`BLEND_MULTIPLICATIVE` 适合投射阴影。

---

## StandardMaterial（PBR 标准材质）

PlayCanvas 的核心材质，基于物理的渲染（PBR Metal/Roughness）。

### 基础颜色 (Diffuse / Albedo)

```typescript
// 纯色
material.diffuse = new pc.Color(0.5, 0.2, 0.2);  // 红色
// 效果：物体的基础颜色，不包含光照

// 贴图
material.diffuseMap = texture;          // 设置纹理
material.diffuseMapChannel = 'rgb';     // 使用哪个通道（默认 'rgb'）
material.diffuseMapOffset = new pc.Vec2(0, 0);   // 贴图偏移
material.diffuseMapTiling = new pc.Vec2(1, 1);   // 贴图平铺
material.diffuseMapUv = 0;             // UV 通道

// 用 diffuse 颜色着色贴图（默认 true）
material.diffuseTint = true;
// true → 贴图颜色 × diffuse 颜色
// false → 只用贴图颜色

// 顶点颜色
material.diffuseVertexColor = false;   // 使用 vertex color
material.diffuseVertexColorChannel = 'rgb';
```

### 金属度与粗糙度 (Metalness & Gloss)

```typescript
// 金属度工作流
material.useMetalness = true;           // ⚠️ 必须先启用
material.metalness = 0.5;               // 0=非金属（电介质）, 1=完全金属
material.metalnessMap = texture;        // 金属度贴图
material.metalnessMapChannel = 'r';     // 哪个通道

// 光泽度（= 1 - roughness）
material.gloss = 0.8;                   // 0=完全粗糙, 1=镜面
material.glossMap = texture;            // 光泽度贴图（或在 invert 模式下是 roughness）
material.glossInvert = false;           // false=贴图是光泽度, true=贴图是粗糙度

// 或者用 specular 颜色（非金属工作流）
material.useMetalness = false;
material.specular = new pc.Color(0.5, 0.5, 0.5);
material.specularMap = texture;
```

效果：`metalness=0, gloss=1` → 光滑塑料。`metalness=0, gloss=0.2` → 粗糙橡胶。`metalness=1, gloss=0.9` → 抛光金属。

### 法线与凹凸贴图

```typescript
material.normalMap = texture;           // 法线贴图（增加表面细节）
material.bumpiness = 1.0;              // 法线强度（默认 1）
```

### 环境反射

```typescript
material.useSkybox = true;             // 使用 scene.skybox 作为环境反射源
material.envMap = texture;             // 或用独立环境贴图（必须是 cubemap 类型纹理）
material.reflectivity = 0.5;           // 反射强度（0~1）

// 立方体贴图投影
material.cubeMapProjection = pc.CUBEPROJ_NONE;  // 默认（使用原始方向）
material.cubeMapProjection = pc.CUBEPROJ_BOX;   // 盒投影（更准确的位置反射）
```

⚠️ **PNG cubemap atlas 不能用于环境反射**：PNG 加载为 2D 纹理，`_cubemap` 为 false，所以 `material.envMap` 不会生效。必须使用 `.dds` cubemap 或依赖 `useSkybox`。

### 自发光 (Emissive)

```typescript
material.emissive = new pc.Color(0, 0, 0);       // 自发光颜色（默认黑色=不发光）
material.emissiveMap = texture;                  // 自发光贴图
material.emissiveIntensity = 1.0;                // 自发光强度
// 效果：自发光不受场景光照影响，始终以该颜色渲染
```

### 透明度

```typescript
material.opacity = 1.0;                // 不透明度（0=完全透明, 1=完全不透明）
material.opacityMap = texture;         // 透明度贴图
material.opacityMapChannel = 'a';      // 透明度通道
material.alphaTest = 0.05;             // Alpha 测试阈值（>0 启用 cutout）
material.alphaFade = false;            // 启用 Alpha 衰减
```

透明模式组合：
- `opacity=1, alphaTest=0` → 不透明物体（最快）
- `opacity=1, alphaTest=0.5` → 镂空物体（cutout，如树叶）
- `opacity=0.5, alphaTest=0` → 半透明物体（需设置 blendType）

### 环境光遮蔽 (AO)

```typescript
material.aoMap = texture;              // AO 贴图
material.aoMapChannel = 'r';           // AO 通道
material.aoIntensity = 1.0;            // AO 强度
material.occludeSpecular = true;       // AO 也影响镜面高光（默认 true）
```

### 高度贴图 (Height / Parallax)

```typescript
material.heightMap = texture;          // 高度贴图（视差映射）
material.heightMapFactor = 0.05;       // 视差强度
```

### 各向异性 (Anisotropy)

```typescript
material.enableGGXSpecular = true;    // 必须启用 GGX 高光
material.anisotropyIntensity = 0.5;   // 各向异性强度（0~1）
material.anisotropyRotation = 30;     // 旋转角度（度数）
material.anisotropyMap = texture;     // 各向异性贴图
// 效果：产生拉丝金属或发丝方向性反射
```

### Clear Coat（清漆）

```typescript
material.clearCoat = 0.5;                 // 清漆强度（0~1）
material.clearCoatMap = texture;          // 清漆贴图
material.clearCoatGloss = 0.8;           // 清漆光泽度
material.clearCoatGlossMap = texture;     // 清漆光泽贴图
material.clearCoatBumpiness = 1.0;       // 清漆层凹凸强度
// 效果：模拟车漆、木地板等有表面涂层的外观
```

### 重要标志位

```typescript
material.cull = pc.CULLFACE_BACK;   // 剔除背面（默认）
material.cull = pc.CULLFACE_NONE;   // 渲染双面
material.cull = pc.CULLFACE_FRONT;  // 剔除正面

material.depthWrite = true;         // 写入深度缓冲（不透明=true, 半透明=false）
material.depthTest = true;          // 深度测试

material.useFog = true;             // 受雾影响
material.useLighting = true;        // 受光照影响
material.useTonemap = true;         // 受色调映射影响
```

### ⚠️ 必须调用 update()

```typescript
// 修改任何属性后必须手动调用
material.diffuse = new pc.Color(1, 0, 0);
material.metalness = 0.8;
material.update();  // 重新编译 shader
```

---

## CameraComponent（相机组件）

### 创建

```typescript
const camera = new pc.Entity('Camera');
camera.addComponent('camera', {
    clearColor: new pc.Color(0.1, 0.1, 0.15),
    fov: 60,
    nearClip: 0.1,
    farClip: 1000,
    projection: pc.PROJECTION_PERSPECTIVE
});
```

### CameraComponent 属性

```typescript
cam = entity.camera;

// 投影
cam.projection = pc.PROJECTION_PERSPECTIVE;     // 透视（默认）
cam.projection = pc.PROJECTION_ORTHOGRAPHIC;    // 正交

// 视场角
cam.fov = 60;                                    // 垂直 FOV（度数，透视才有）
cam.horizontalFov = false;                       // true = fov 是水平 FOV
cam.orthoHeight = 10;                            // 正交相机高度

// 裁剪面
cam.nearClip = 0.1;                              // 近裁剪面（米）
cam.farClip = 1000;                              // 远裁剪面（米）
// 近裁剪面过小 → z-fighting
// 远裁剪面过大 → 深度精度不足

// 视口
cam.rect = new pc.Vec4(0, 0, 1, 1);             // 全屏
cam.rect = new pc.Vec4(0, 0, 0.5, 0.5);         // 左下 1/4

// 宽高比
cam.aspectRatio = 16 / 9;
cam.aspectRatioMode = pc.ASPECT_AUTO;            // 自动（默认）
cam.aspectRatioMode = pc.ASPECT_MANUAL;          // 手动

// 清屏
cam.clearColor: Color                             // 清屏颜色
cam.clearColorBuffer: boolean                     // 是否清颜色
cam.clearDepthBuffer: boolean                     // 是否清深度

// 剔除
cam.frustumCulling = true;                        // 视锥体裁剪（默认 true）
cam.cullFaces = true;                             // 面剔除

// 渲染层（相机只渲染这些层）
cam.layers = [worldLayerId];                      // 默认为所有层

// 优先级——多个相机时，值大的先渲染
cam.priority = 0;

// 后处理效果
cam.postEffects: PostEffectQueue

// 色调映射和伽马
cam.gammaCorrection = pc.GAMMA_SRGB;
cam.toneMapping = pc.TONEMAP_ACES2;

// render-to-texture
cam.renderTarget: RenderTarget | null
```

### Camera 内部对象

```typescript
// cam._camera 是内部的 pc.Camera 对象（不是 CameraComponent）
const camera = cam._camera;

camera.projectionMatrix: Mat4       // 投影矩阵
camera.viewMatrix: Mat4             // 视图矩阵
camera.frustum: Frustum             // 视锥体
camera.worldToScreen(worldPos, out): Vec3   // 世界→屏幕
camera.screenToWorld(screenX, screenY, z, out): Vec3  // 屏幕→世界
```

### 多相机

```typescript
// 相机优先级控制渲染顺序
cam1.priority = 0;   // 先渲染（如场景相机）
cam2.priority = 1;   // 后渲染（如武器相机，覆盖在上面）
// 高优先级的相机渲染在上面
```

### XR 相机

```typescript
// 进入 VR 时需要传递相机实体
app.xr.start(cameraEntity, pc.XRTYPE_VR, pc.XRSPACE_LOCALFLOOR);
// XR 会话会自动接管相机的位置/旋转
// camera 实体的位置在 VR 中由头显追踪覆盖
```

## 关键 API 速查

```typescript
// Layer
layer.enabled / .id / .name
layer.clearColorBuffer / .clearDepthBuffer
layer.opaqueSortMode / .transparentSortMode
layer.onPreRender / .onPostRender

// Texture
texture.width / .height
texture.addressU / .addressV / .minFilter / .magFilter
texture.cubemap / .mipmaps

// Material
material.blendType / .depthTest / .depthWrite / .cull
material.alphaTest
material.update()           // ⚠️ 必须调用

// StandardMaterial
material.diffuse: Color / .diffuseMap: Texture / .diffuseTint
material.metalness / .gloss / .useMetalness
material.normalMap / .envMap / .useSkybox / .reflectivity
material.emissive / .emissiveMap / .emissiveIntensity
material.opacity / .opacityMap / .alphaTest
material.aoMap / .aoIntensity
material.heightMap / .heightMapFactor
material.anisotropyIntensity
material.clearCoat / .clearCoatGloss
material.cull / .useFog / .useLighting
material.update()

// CameraComponent
cam.projection / .fov / .horizontalFov
cam.nearClip / .farClip
cam.rect / .aspectRatio / .aspectRatioMode
cam.clearColor / .clearColorBuffer / .clearDepthBuffer
cam.frustumCulling / .cullFaces
cam.layers / .priority
cam.postEffects / .renderTarget
cam.gammaCorrection / .toneMapping
cam._camera.worldToScreen() / .screenToWorld()
```
