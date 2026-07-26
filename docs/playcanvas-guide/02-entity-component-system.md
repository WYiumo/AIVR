# 02 - 实体与组件系统

## 概述

PlayCanvas 使用 **Entity-Component** 架构。Entity（实体）是场景中的对象容器，本身不包含任何行为或数据；Component（组件）附加到 Entity 上，赋予其渲染、物理、音效等功能。

## Entity

### 创建实体

```typescript
// 创建命名实体
const entity = new pc.Entity('MyEntity');

// 添加到场景
app.root.addChild(entity);
```

### 层级结构

Entity 基于 `GraphNode`，支持父子层级：

```typescript
const parent = new pc.Entity('Parent');
const child = new pc.Entity('Child');

// 建立父子关系
parent.addChild(child);

// child 的世界变换 = parent 的世界变换 × child 的局部变换
// 即: 子节点跟随父节点移动/旋转/缩放
```

### 变换操作

```typescript
// 位置
entity.setPosition(x, y, z);             // 设置局部位置
entity.setLocalPosition(x, y, z);        // 同上
const pos = entity.getPosition();        // 获取世界位置
const localPos = entity.getLocalPosition(); // 获取局部位置

// 旋转
entity.setEulerAngles(x, y, z);          // 设置世界欧拉角
entity.setLocalEulerAngles(x, y, z);     // 设置局部欧拉角
entity.setRotation(q);                   // 设置世界旋转（四元数）
entity.setLocalRotation(q);              // 设置局部旋转（四元数）
const rot = entity.getRotation();        // 获取世界旋转
const localRot = entity.getLocalRotation(); // 获取局部旋转

// 缩放
entity.setLocalScale(x, y, z);
const scale = entity.getLocalScale();

// 朝向
entity.lookAt(targetPosition);           // 朝向目标位置
entity.rotateLocal(x, y, z);             // 局部空间旋转
entity.translateLocal(x, y, z);          // 局部空间平移

// 获取方向向量
const forward = entity.forward;          // 前方向 (0, 0, -1) 的世界变换
const up = entity.up;                    // 上方向 (0, 1, 0) 的世界变换
const right = entity.right;              // 右方向 (1, 0, 0) 的世界变换

// 世界矩阵
const trans = entity.getWorldTransform(); // pc.Mat4
```

### 父子关系操作

```typescript
// 添加子节点（保持世界变换）
parent.addChildAndSaveTransform(child);
// child 的局部变换被调整，使其世界位置/旋转保持不变

// 移除子节点
parent.removeChild(child);

// 查找子节点
const found = entity.findByName('name');  // 按名称递归查找
const foundByTag = entity.findByTag('tag'); // 按标签递归查找
const children = entity.children;          // 子节点数组
const parentNode = entity.parent;          // 父节点

// 销毁
entity.destroy();
```

### Tags 标签系统

```typescript
// 添加标签
entity.tags.add('grabbable');
entity.tags.add('interactive');

// 检查标签
if (entity.tags.has('grabbable')) { }

// 移除标签
entity.tags.delete('grabbable');

// 查找带标签的实体
const grabbables = app.root.findByTag('grabbable');
// 返回 Entity[]（递归查找所有子节点）
```

### 启用/禁用

```typescript
entity.enabled = true;   // 启用（渲染、更新）
entity.enabled = false;  // 禁用（隐藏且不更新）
```

## Component 系统

### 添加组件

```typescript
// 渲染组件
entity.addComponent('render', {
    type: 'box',           // 或 'plane', 'sphere', 'capsule', 'cone', 'cylinder'
    material: myMaterial,
    castShadows: true,
    receiveShadows: false,
    layer: 'World'
});

// 相机组件
entity.addComponent('camera', {
    clearColor: new pc.Color(0.1, 0.1, 0.1),
    fov: 60,              // 视场角
    nearClip: 0.1,        // 近裁剪面
    farClip: 1000         // 远裁剪面
});

// 光照组件
entity.addComponent('light', {
    type: 'directional',  // 'directional' | 'point' | 'spot'
    color: new pc.Color(1, 1, 1),
    intensity: 1,
    range: 10,            // point/spot 有效
    castShadows: true
});

// 模型组件（加载 GLB/GLTF）
entity.addComponent('model', {
    type: 'asset',
    asset: modelAsset,    // pc.Asset 类型为 'container'
    castShadows: true
});

// 碰撞组件
entity.addComponent('collision', {
    type: 'box',          // 'box' | 'sphere' | 'capsule' | 'mesh'
    halfExtents: new pc.Vec3(1, 1, 1)
});

// 刚体组件（需要先添加 collision）
entity.addComponent('rigidbody', {
    type: 'dynamic',      // 'static' | 'dynamic' | 'kinematic'
    mass: 1,
    restitution: 0.5
});

// GSplat 组件（Gaussian Splatting）
entity.addComponent('gsplat', {
    asset: splatAsset,
    unified: true
});

// 屏幕组件（UI 根）
entity.addComponent('screen', {
    referenceResolution: new pc.Vec2(1280, 720),
    screenSpace: false,   // false = world-space UI
    scaleBlend: 1,
    scaleMode: pc.SCALEMODE_BLEND,
    resolutionMode: pc.RESOLUTION_FIXED
});

// 元素组件（UI 元素）
entity.addComponent('element', {
    type: 'text',         // 'text' | 'image' | 'group'
    text: 'Hello World',
    fontSize: 16,
    color: new pc.Color(1, 1, 1)
});

// 布局组组件
entity.addComponent('layoutgroup', {
    orientation: pc.ORIENTATION_VERTICAL,
    spacing: new pc.Vec2(0, 10),
    padding: new pc.Vec4(8, 8, 8, 8)
});

// 按钮组件
entity.addComponent('button', {
    active: true,
    transitionMode: pc.BUTTON_TRANSITION_MODE_TINT,
    hoverTint: new pc.Color(0.5, 0.5, 1)
});

// 音效组件
entity.addComponent('sound', {
    volume: 1,
    pitch: 1,
    loop: false,
    positional: true     // 3D 空间音效
});

// 动画组件
entity.addComponent('anim', {
    activate: true,
    speed: 1
});
```

### 访问组件

```typescript
// 通过属性访问（推荐）
const render = entity.render;     // RenderComponent | null
const camera = entity.camera;     // CameraComponent | null
const light = entity.light;       // LightComponent | null
const model = entity.model;       // ModelComponent | null
const screen = entity.screen;     // ScreenComponent | null
const element = entity.element;   // ElementComponent | null
const button = entity.button;     // ButtonComponent | null
const collision = entity.collision; // CollisionComponent | null
const rigidbody = entity.rigidbody; // RigidBodyComponent | null
const sound = entity.sound;       // SoundComponent | null
const anim = entity.anim;         // AnimComponent | null
const gsplat = entity.gsplat;     // GSplatComponent | null
```

### 移除组件

```typescript
entity.removeComponent('render');
```

### 检查组件

```typescript
if (entity.render) {
    // 实体有渲染组件
}
```

## GraphNode 层级

### 什么是 GraphNode

`Entity` 继承自 `GraphNode`，后者提供层级变换的核心功能：

```typescript
// GraphNode 核心属性
node.name: string
node.parent: GraphNode
node.children: GraphNode[]
node.enabled: boolean

// GraphNode 局部变换
node.localPosition: Vec3
node.localRotation: Quat
node.localScale: Vec3

// GraphNode 只读世界属性
node.position: Vec3       // getPosition()
node.rotation: Quat       // getRotation()
node.forward: Vec3
node.up: Vec3
node.right: Vec3
```

### 变换传播

```
世界变换计算（自动）:
child.worldMatrix = parent.worldMatrix × child.localMatrix
```

当父节点移动时，所有子节点自动跟随。这一机制在 VR 交互中非常关键：

```typescript
// VR 手柄抓取物体：将物体 reparent 到手柄实体下
controllerEntity.addChildAndSaveTransform(grabbedEntity);
// 物体自动跟随手柄移动，无需手动计算 offset
```

## 组件系统注册

PlayCanvas 的组件系统是自注册的：

```typescript
// Application 自动注册所有组件系统
// 可通过 app.systems 访问
app.systems.render      // RenderComponentSystem
app.systems.camera      // CameraComponentSystem
app.systems.light       // LightComponentSystem
app.systems.model       // ModelComponentSystem
app.systems.collision   // CollisionComponentSystem
app.systems.rigidbody   // RigidBodyComponentSystem
app.systems.screen      // ScreenComponentSystem
app.systems.element     // ElementComponentSystem
app.systems.button      // ButtonComponentSystem
app.systems.layoutgroup // LayoutGroupComponentSystem
app.systems.sound       // SoundComponentSystem
app.systems.anim        // AnimComponentSystem
// ...等等
```

## 常用实体模式

### 创建相机

```typescript
const camera = new pc.Entity('Camera');
camera.addComponent('camera', {
    clearColor: new pc.Color(0.8, 0.9, 0.9),
    fov: 60,
    nearClip: 0.1,
    farClip: 1000
});
app.root.addChild(camera);
```

### 创建可见物体

```typescript
const box = new pc.Entity('Box');
box.addComponent('render', {
    type: 'box',
    material: material
});
box.setPosition(0, 1, -5);
app.root.addChild(box);
```

### 创建光源

```typescript
// 方向光
const dirLight = new pc.Entity('Sun');
dirLight.addComponent('light', {
    type: 'directional',
    color: new pc.Color(1, 0.95, 0.8),
    intensity: 1.5,
    castShadows: true
});
dirLight.setEulerAngles(45, 30, 0);
app.root.addChild(dirLight);
```

### 实体销毁

```typescript
// 递归销毁实体及其所有子节点
entity.destroy();

// 手动管理
parent.removeChild(entity);
entity.destroy();
```

## 访问全局对象

```typescript
// 从任意 Entity 访问 Application
const app = entity.app; // pc.Application | undefined (仅当 entity 属于场景时)

// 通过 app 访问关键系统
app.root       // 场景根实体
app.scene      // pc.Scene
app.assets     // pc.AssetRegistry
app.xr         // pc.XrManager
app.systems    // ComponentSystemRegistry
```

## 关键 API 汇总

```typescript
// Entity 创建与层级
new pc.Entity(name)
parent.addChild(child)
parent.addChildAndSaveTransform(child)
parent.removeChild(child)
entity.findByName(name)
entity.findByTag(tag)
entity.destroy()

// 变换 - 设置
entity.setPosition(x, y, z)
entity.setLocalPosition(x, y, z)
entity.setEulerAngles(x, y, z)
entity.setLocalEulerAngles(x, y, z)
entity.setRotation(quat)
entity.setLocalRotation(quat)
entity.setLocalScale(x, y, z)

// 变换 - 查询
entity.getPosition(): Vec3
entity.getLocalPosition(): Vec3
entity.getRotation(): Quat
entity.getLocalRotation(): Quat
entity.getLocalScale(): Vec3
entity.forward: Vec3
entity.up: Vec3
entity.right: Vec3
entity.getWorldTransform(): Mat4

// 变换 - 操作
entity.lookAt(target)
entity.rotateLocal(x, y, z)
entity.translateLocal(x, y, z)

// 标签
entity.tags.add('tag')
entity.tags.has('tag')
entity.tags.delete('tag')

// 组件
entity.addComponent(type, data)
entity.removeComponent(type)
entity.render / entity.camera / entity.light / ... // 组件访问

// 状态
entity.enabled: boolean
entity.name: string
entity.children: Entity[]
entity.parent: GraphNode
```
