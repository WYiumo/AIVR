# 11 - API 速查手册

## 导入

```typescript
import * as pc from 'playcanvas';
// 或按需导入
import { Application, Entity, Vec3, Quat, Color } from 'playcanvas';
```

## Application

```typescript
// 创建
const app = new Application(canvas, {
    mouse: new Mouse(canvas),
    touch: new TouchDevice(canvas),
    elementInput: new ElementInput(canvas),   // VR UI 必需
    keyboard: new Keyboard(window),
});

// Canvas
app.setCanvasFillMode(FILLMODE_FILL_WINDOW);  // 填满窗口
app.setCanvasResolution(RESOLUTION_AUTO);      // 自动分辨率
app.resizeCanvas();

// 生命周期
app.start();
app.on('update', (dt: number) => { });
app.once('destroy', () => { });

// 核心属性
app.root          // pc.Entity - 场景根节点
app.scene         // pc.Scene
app.assets        // pc.AssetRegistry
app.xr            // pc.XrManager
app.keyboard      // pc.Keyboard
app.mouse         // pc.Mouse
app.touch         // pc.TouchDevice
app.systems       // ComponentSystemRegistry
app.graphicsDevice // pc.GraphicsDevice

// 调试
app.drawLine(origin: Vec3, end: Vec3, color?: Color);
app.renderNextFrame = true;
```

## Entity

```typescript
// 创建与层级
const e = new pc.Entity('name');
parent.addChild(e);
parent.addChildAndSaveTransform(e);   // 保留世界变换
parent.removeChild(e);
e.destroy();

// 查找
root.findByName('name'): Entity | null
root.findByTag('tag'): Entity[]
e.children: Entity[]
e.parent: GraphNode

// 变换 - 设置
e.setPosition(x, y, z)           // 世界位置
e.setLocalPosition(x, y, z)      // 局部位置
e.setEulerAngles(x, y, z)        // 世界欧拉角（度）
e.setLocalEulerAngles(x, y, z)   // 局部欧拉角（度）
e.setRotation(q: Quat)           // 世界旋转
e.setLocalRotation(q: Quat)      // 局部旋转
e.setLocalScale(x, y, z)         // 局部缩放

// 变换 - 查询
e.getPosition(): Vec3
e.getLocalPosition(): Vec3
e.getRotation(): Quat
e.getLocalRotation(): Quat
e.getLocalScale(): Vec3
e.getWorldTransform(): Mat4
e.forward: Vec3
e.up: Vec3
e.right: Vec3

// 变换 - 操作
e.lookAt(target: Vec3)
e.rotateLocal(x, y, z)
e.translateLocal(x, y, z)

// 标签
e.tags.add('tag')
e.tags.has('tag')
e.tags.delete('tag')

// 组件
e.addComponent('camera', { fov: 60 })
e.addComponent('render', { type: 'box' })
e.addComponent('light', { type: 'directional' })
e.addComponent('model', { type: 'asset', asset })
e.addComponent('gsplat', { asset, unified: true })
e.addComponent('screen', { screenSpace: false })
e.addComponent('element', { type: 'text' })
e.addComponent('button', { active: true })
e.addComponent('layoutgroup', { orientation })
e.addComponent('layoutchild', { minWidth, minHeight })

// 组件快捷访问
e.render / e.camera / e.light / e.model
e.gsplat / e.screen / e.element / e.button
e.sound / e.anim / e.collision / e.rigidbody

// 状态
e.enabled: boolean
e.name: string
```

## Vec3

```typescript
new Vec3(x, y, z)
new Vec3()                    // (0, 0, 0)
Vec3.ZERO / ONE / UP / RIGHT / FORWARD

v.set(x, y, z)
v.copy(src): Vec3
v.clone(): Vec3
v.add(b): Vec3                // v += b
v.sub(b): Vec3                // v -= b
v.mulScalar(s): Vec3          // v *= s
v.divScalar(s): Vec3          // v /= s
v.add2(a, b): Vec3            // v = a + b
v.sub2(a, b): Vec3            // v = a - b
v.length(): number
v.lengthSq(): number
v.normalize(): Vec3
v.dot(other): number
v.cross(a, b): Vec3           // v = a × b
v.distance(other): number
v.lerp(a, b, t): Vec3         // v = a + (b-a)*t
```

## Quat

```typescript
new Quat()                    // 单位四元数
Quat.IDENTITY

q.setFromAxisAngle(axis: Vec3, radians: number): Quat
q.setFromEulerAngles(x, y, z): Quat     // ⚠️ 参数是度数！
q.copy(src): Quat
q.clone(): Quat
q.mul2(a, b): Quat            // q = a * b（组合旋转）
q.invert(): Quat
q.normalize(): Quat
q.slerp(a, b, t): Quat
q.transformVector(v, out): void
```

## Color

```typescript
new Color(r, g, b, a?)        // 0-1 范围
new Color()                    // (1, 1, 1) 白色
Color.RED / GREEN / BLUE / WHITE / BLACK / CYAN / MAGENTA / YELLOW

c.r, c.g, c.b, c.a
c.copy(src): Color
c.clone(): Color
c.toString(): string          // '#ff0000'
```

## Ray & BoundingBox

```typescript
// Ray
new Ray(origin?, direction?)
ray.set(origin: Vec3, direction: Vec3)  // 自动归一化 direction
ray.origin: Vec3
ray.direction: Vec3
ray.getPoint(t: number, out: Vec3): void

// BoundingBox
bb.center: Vec3
bb.halfExtents: Vec3
bb.intersectsRay(ray): boolean
bb.containsPoint(point): boolean
bb.setFromTransformedAabb(localAabb, worldTransform): void
```

## Camera

```typescript
// 创建
entity.addComponent('camera', {
    clearColor: Color,
    fov: 60,                  // 视场角
    nearClip: 0.1,
    farClip: 1000,
    projection: PROJECTION_PERSPECTIVE,
    priority: 0
})

// 组件访问
entity.camera.fov: number
entity.camera.nearClip / farClip
entity.camera.clearColor
entity.camera.projection
entity.camera.frustumCulling

// 方向
entity.forward: Vec3
entity.up: Vec3
entity.right: Vec3
entity.getPosition(): Vec3
```

## Light

```typescript
entity.addComponent('light', {
    type: 'directional',       // 'directional' | 'point' | 'spot'
    color: Color,
    intensity: 1,
    range: 10,                 // point/spot
    castShadows: true,
    shadowResolution: 2048,
    innerConeAngle: 20,        // spot
    outerConeAngle: 30         // spot
})
```

## Material

```typescript
const mat = new StandardMaterial();

// 颜色
mat.diffuse / mat.diffuseMap / mat.diffuseTint
mat.emissive / mat.emissiveMap / mat.emissiveIntensity
mat.specular / mat.specularMap

// PBR
mat.metalness / mat.metalnessMap / mat.useMetalness
mat.gloss / mat.glossMap

// 法线/环境
mat.normalMap / mat.envMap / mat.useSkybox
mat.reflectivity

// 透明度
mat.opacity / mat.opacityMap / mat.blendType

// 其他
mat.shininess / mat.cull / mat.depthWrite
mat.aoMap / mat.heightMap

// ⚠️ 修改后必须调用
mat.update();
```

## Asset

```typescript
// 创建
const asset = new pc.Asset('name', 'type', { url: 'path/file.ext' });

// 类型: 'container' | 'texture' | 'cubemap' | 'material'
//       | 'gsplat' | 'audio' | 'font' | 'json' | 'text'

// 批量加载
const loader = new pc.AssetListLoader([assets], app.assets);
loader.load((err: Error | null) => {
    if (err) { /* 错误处理 */ }
    // 加载完成
});

// 查找
app.assets.find(name: string, type?: string): Asset | null
app.assets.get(id: number): Asset | null

// 访问资源
asset.resource           // Container: ContainerResource, Material: StandardMaterial, etc.
asset.resources          // Cubemap: resources[1] = Texture
```

## Scene

```typescript
// 场景配置
app.scene.ambientLight = new Color(0.8, 0.8, 0.8);
app.scene.exposure = 1.0;
app.scene.tonemapping = TONEMAP_ACES2;
app.scene.gammaCorrection = GAMMA_SRGB;

// 天空盒
app.scene.skybox = texture;             // cubemap Texture
app.scene.skyboxMip = 2;
app.scene.skyboxRotation = new Quat();
app.scene.sky.type = 'infinite';        // 'infinite' | 'box' | 'dome'

// 雾
app.scene.fog = FOG_LINEAR;             // FOG_NONE | FOG_LINEAR | FOG_EXP | FOG_EXP2
app.scene.fogStart = 10;
app.scene.fogEnd = 100;

// 图层
app.scene.layers.getLayerById(LAYERID_WORLD)
app.scene.layers.getLayerById(LAYERID_UI)
app.scene.layers.getLayerByName('UI')
```

## WebXR / VR

```typescript
// XR Manager
app.xr.supported: boolean
app.xr.active: boolean
app.xr.type: string             // 'vr' | 'ar' | null
app.xr.isAvailable(type): boolean
app.xr.start(camera, type, spaceType)
app.xr.end()
app.xr.on('start'|'end'|'error', cb)

// XR Input
app.xr.input.inputSources: XrInputSource[]
app.xr.input.on('add'|'remove', (inputSource) => {})
app.xr.input.on('select'|'selectstart'|'selectend', (inputSource) => {})
app.xr.input.on('squeeze'|'squeezestart'|'squeezeend', (inputSource) => {})

// XrInputSource
src.handedness: 'left' | 'right' | undefined
src.selecting: boolean
src.squeezing: boolean
src.targetRayMode: string
src.getOrigin(): Vec3 | null
src.getDirection(): Vec3 | null
src.getPosition(): Vec3 | null       // 世界空间 grip 位置
src.getRotation(): Quat | null       // 世界空间 grip 旋转
src.getLocalPosition(): Vec3 | null  // 局部空间 grip 位置
src.getLocalRotation(): Quat | null  // 局部空间 grip 旋转
src.gamepad: Gamepad                 // .buttons[index].pressed, .axes[index]

// Meta Quest 按钮索引
// 0:Trigger  1:Grip  4:X/A  5:Y/B
// axes[2]:stickX  axes[3]:stickY
```

## UI / Elements

```typescript
// Screen
entity.addComponent('screen', {
    referenceResolution: new Vec2(1280, 720),
    screenSpace: false,            // world-space UI
    scaleBlend: 1,
    scaleMode: SCALEMODE_BLEND
})

// Element
entity.addComponent('element', {
    type: 'text',                  // 'text' | 'image' | 'group'
    text: 'Hello',
    font: canvasFont,
    fontSize: 16,
    color: Color,
    anchor: new Vec4(0, 0, 1, 1),
    pivot: new Vec2(0.5, 0.5),
    useInput: false,
    layers: [layerId]
})

// Button
entity.addComponent('button', {
    active: true,
    transitionMode: BUTTON_TRANSITION_MODE_TINT,
    hoverTint: Color,
    pressedTint: Color
})
entity.button.on('click', () => { })          // 鼠标/触摸
entity.button.on('selectstart', () => { })     // XR 射线

// LayoutGroup
entity.addComponent('layoutgroup', {
    orientation: ORIENTATION_VERTICAL,  // or HORIZONTAL
    alignment: new Vec2(0.5, 0.5),
    padding: new Vec4(8, 8, 8, 8),
    spacing: new Vec2(0, 10),
    widthFitting: FITTING_STRETCH,
    heightFitting: FITTING_NONE
})

// LayoutChild
entity.addComponent('layoutchild', {
    minWidth: 50, minHeight: 30,
    maxWidth: 100, maxHeight: 60,
    fitWidthProportion: 1
})

// CanvasFont
const font = new pc.CanvasFont(app, { fontName: 'MyFont', fontSize: 32 });
font.createTextures(text);  // 更新纹理图集以包含新字符

// UI Layer
app.scene.layers.getLayerById(pc.LAYERID_UI)！
```

## Input (非 XR)

```typescript
// Mouse
app.mouse.on('mousedown'|'mouseup'|'mousemove'|'mousewheel', (e: MouseEvent) => {})
app.mouse.isPressed(button) / wasPressed(button) / wasReleased(button)
// button: MOUSEBUTTON_LEFT(0) | _MIDDLE(1) | _RIGHT(2)

// Keyboard
app.keyboard.on('keydown'|'keyup', (e: KeyboardEvent) => {})
app.keyboard.isPressed(key) / wasPressed(key)
// key: KEY_A..Z, KEY_0..9, KEY_SPACE, KEY_ENTER, KEY_ESCAPE, KEY_SHIFT, KEY_CONTROL
//      KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN, KEY_F1..F12

// Touch
app.touch.on('touchstart'|'touchmove'|'touchend', (e: TouchEvent) => {})
```

## Math Utils

```typescript
pc.math.DEG_TO_RAD: number       // π / 180
pc.math.RAD_TO_DEG: number       // 180 / π
pc.math.degToRad(degrees): number
pc.math.radToDeg(radians): number
pc.math.clamp(value, min, max): number
pc.math.lerp(a, b, t): number
pc.math.smoothstep(edge0, edge1, x): number
```

## 常量速查

```typescript
// 填充模式
FILLMODE_FILL_WINDOW | FILLMODE_KEEP_ASPECT | FILLMODE_NONE

// 天空类型
SKYTYPE_INFINITE | SKYTYPE_BOX | SKYTYPE_DOME

// 雾类型
FOG_NONE | FOG_LINEAR | FOG_EXP | FOG_EXP2

// 投影类型
PROJECTION_PERSPECTIVE | PROJECTION_ORTHOGRAPHIC

// 色调映射
TONEMAP_LINEAR | TONEMAP_FILMIC | TONEMAP_ACES | TONEMAP_ACES2 | TONEMAP_HEJL

// 光源类型
LIGHTTYPE_DIRECTIONAL | LIGHTTYPE_POINT | LIGHTTYPE_SPOT

// 渲染层
LAYERID_WORLD(0) | LAYERID_UI(1) | LAYERID_DEPTH(2) | LAYERID_SKYBOX(3) | LAYERID_IMMEDIATE(4)

// 混合模式
BLEND_NORMAL | BLEND_PREMULTIPLIED | BLEND_ADDITIVE | BLEND_ADDITIVEALPHA
BLEND_MULTIPLICATIVE | BLEND_MULTIPLICATIVE2X | BLEND_SCREEN | BLEND_SUBTRACTIVE

// 面剔除
CULLFACE_NONE | CULLFACE_BACK | CULLFACE_FRONT | CULLFACE_FRONTANDBACK

// 按钮过渡
BUTTON_TRANSITION_MODE_TINT | BUTTON_TRANSITION_MODE_SPRITE_CHANGE

// 布局方向
ORIENTATION_HORIZONTAL | ORIENTATION_VERTICAL

// 适配模式
FITTING_NONE | FITTING_STRETCH | FITTING_SHRINK | FITTING_BOTH

// 缩放模式
SCALEMODE_NONE | SCALEMODE_BLEND

// 分辨率模式
RESOLUTION_AUTO | RESOLUTION_FIXED

// 环境光来源
AMBIENTSRC_CONSTANT | AMBIENTSRC_ENVALATLAS | AMBIENTSRC_AMBIENTSH

// 阴影类型
SHADOW_PCF3 | SHADOW_PCF5 | SHADOW_VSM8 | SHADOW_VSM16 | SHADOW_VSM32

// GSplat 渲染
GSPLAT_FORWARD | GSPLAT_SHADOW
GSPLATDATA_COMPACT | GSPLATDATA_LARGE

// XR
XRTYPE_VR | XRTYPE_AR
XRSPACE_LOCAL | XRSPACE_LOCALFLOOR | XRSPACE_BOUNDEDFLOOR | XRSPACE_UNBOUNDED
XRTARGETRAY_POINTER | XRTARGETRAY_GAZE | XRTARGETRAY_SCREEN
```

## 常用代码片段

### 创建相机并放置

```typescript
const camera = new pc.Entity('Camera');
camera.addComponent('camera', {
    clearColor: new pc.Color(0.1, 0.1, 0.15),
    fov: 60, nearClip: 0.1, farClip: 1000
});
camera.setPosition(0, 1.6, 0);
app.root.addChild(camera);
```

### 将物体放在相机前方

```typescript
const camPos = camera.getPosition();
const forward = camera.forward;
const pos = new pc.Vec3().copy(camPos).add(forward.mulScalar(1.5));
entity.setPosition(pos);
entity.lookAt(camPos);
```

### 加载 GLB 模型

```typescript
const asset = new pc.Asset('model', 'container', { url: 'model.glb' });
new pc.AssetListLoader([asset], app.assets).load((err) => {
    if (err) return;
    entity.addComponent('model', {
        type: 'asset',
        asset: asset.resource.model,
        castShadows: true
    });
});
```

### 加载 GSplat 模型

```typescript
const asset = new pc.Asset('splat-' + Date.now(), 'gsplat', { url });
new pc.AssetListLoader([asset], app.assets).load((err) => {
    if (err) return;
    const entity = new pc.Entity('splat');
    entity.addComponent('gsplat', { asset, unified: true });
    app.root.addChild(entity);
});
```

### VR 手柄跟随 + 按钮检测

```typescript
update(dt: number): void {
    for (const src of this.app.xr?.input?.inputSources ?? []) {
        const pos = src.getLocalPosition();
        const rot = src.getLocalRotation();
        if (pos) controllerEntity.setLocalPosition(pos);
        if (rot) controllerEntity.setLocalRotation(rot);

        // 按钮轮询
        const g = (src as any).gamepad;
        const trigger = g?.buttons?.[0]?.pressed ?? false;
        const grip = g?.buttons?.[1]?.pressed ?? false;
    }
}
```

### 射线-AABB 拾取

```typescript
const ray = new pc.Ray();
ray.set(inputSource.getOrigin()!, inputSource.getDirection()!);

for (const entity of pickableEntities) {
    const aabb = entity.render?.meshInstances?.[0]?.aabb;
    if (aabb?.intersectsRay(ray)) {
        // 命中！
    }
}
```

### Reparent 抓取

```typescript
// 抓取
const originalParent = entity.parent！;
controllerEntity.addChildAndSaveTransform(entity);

// 释放
originalParent.addChildAndSaveTransform(entity);
```

### 绕轴旋转

```typescript
const axis = new pc.Vec3(0, 1, 0);
const delta = rotationSpeed * dt;
const q = new pc.Quat().setFromAxisAngle(axis, delta);
const current = entity.getLocalRotation();
entity.setLocalRotation(new pc.Quat().mul2(q, current));
```

### 监听 VR 会话

```typescript
const vrManager = new VrManager(app);
vrManager.on('sessionstart', () => { /* 创建 VR 对象 */ });
vrManager.on('sessionend', () => { /* 销毁 VR 对象 */ });
```

### World-space UI 面板

```typescript
const screen = new pc.Entity('Panel');
screen.addComponent('screen', {
    referenceResolution: new pc.Vec2(400, 300),
    screenSpace: false,
    scaleBlend: 1,
    scaleMode: pc.SCALEMODE_BLEND
});
screen.setLocalScale(0.005, 0.005, 1);
// 在相机前方 1.2m
const pos = new pc.Vec3().copy(camPos).add(forward.mulScalar(1.2));
screen.setPosition(pos);
screen.lookAt(camPos);
```
