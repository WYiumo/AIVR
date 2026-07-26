# 13 - Scene 与 Entity

> 涵盖：`Scene`、`Entity`、`GraphNode`

## Scene（场景）

`app.scene` 是 `Scene` 类型的对象，管理场景的全局视觉属性。

### 光照相关

```typescript
// 环境光——最基础的全方向均匀光照
app.scene.ambientLight = new pc.Color(0.8, 0.8, 0.8);
// 设置为黑色 (0,0,0) → 无环境光，完全依赖场景光源
// 设置为白色 (1,1,1) → 极亮，物体暗面也很亮
```

**`ambientSource`** — 环境光来源类型：
```typescript
app.scene.ambientSource = pc.AMBIENTSRC_CONSTANT;    // 使用 ambientLight 纯色
app.scene.ambientSource = pc.AMBIENTSRC_ENVALATLAS;  // 从环境贴图采样
app.scene.ambientSource = pc.AMBIENTSRC_AMBIENTSH;   // 球谐函数（更平滑）
```
`CONSTANT` 是最简单的，所有物体暗面同样的颜色。`ENVALATLAS` 让环境贴图（skybox）影响环境光颜色，更真实。

### 色调映射 (Tonemapping)

```typescript
app.scene.tonemapping = pc.TONEMAP_ACES2;   // 推荐：自然色调映射
// 其他选项
app.scene.tonemapping = pc.TONEMAP_LINEAR;  // 无色调映射（HDR 值可能 > 1 导致过曝）
app.scene.tonemapping = pc.TONEMAP_FILMIC;  // 电影风格
app.scene.tonemapping = pc.TONEMAP_HEJL;    // Hejl-Burgess 方法
app.scene.tonemapping = pc.TONEMAP_ACES;    // ACES 第一版
app.scene.tonemapping = pc.TONEMAP_NEUTRAL; // 中性映射
```

效果：将 HDR 亮度值映射到 LDR [0,1] 显示范围。不设置（LINEAR）时，亮度 > 1 的区域会完全过曝发白。**ACES2 是最常用也是最通用的选择。**

### 曝光 (Exposure)

```typescript
app.scene.exposure = 1.0;   // 默认
app.scene.exposure = 2.0;   // 更亮（画面曝光 +1 EV）
app.scene.exposure = 0.5;   // 更暗（画面曝光 -1 EV）
```

### 天空系统

```typescript
// 天空盒（cubemap 纹理）
app.scene.skybox = cubemapTexture;     // pc.Texture（必须是 cubemap）
app.scene.skyboxMip = 2;               // 使用哪个 mipmap 级别（0=最清晰, 值越大越模糊）
app.scene.skyboxIntensity = 1.0;       // 天空盒亮度
app.scene.skyboxRotation = new pc.Quat().setFromEulerAngles(0, 45, 0); // 旋转天空盒

// 程序化天空
app.scene.sky.type = 'infinite';       // 无限天空（程序化渐变）
app.scene.sky.type = 'box';            // 立方体天空
app.scene.sky.type = 'dome';           // 穹顶天空（需要 dome 纹理）
app.scene.sky.node.setLocalScale(1000, 1000, 1000);  // 天空大小
```

`skyboxMip` 设置较高值（如 2-3）可以让天空盒更模糊——如果天空盒分辨率和清晰度过高会喧宾夺主，降低 mip 级别让画面焦点在场景物体上。

### 雾 (Fog)

```typescript
app.scene.fog = pc.FOG_NONE;       // 无雾（默认）
app.scene.fog = pc.FOG_LINEAR;     // 线性雾（fogStart → fogEnd 之间均匀过渡）
app.scene.fog = pc.FOG_EXP;        // 指数雾（密度随距离指数增长）
app.scene.fog = pc.FOG_EXP2;       // 指数平方雾（增长更快）

app.scene.fogColor = new pc.Color(0.5, 0.6, 0.7);
app.scene.fogStart = 10;           // 线性雾开始距离（米）
app.scene.fogEnd = 100;            // 线性雾结束距离（在此距离完全被雾覆盖）
app.scene.fogDensity = 0.01;       // 指数雾密度
```

### 物理光照单位

```typescript
app.scene.physicalUnits = true;   // 启用基于物理的光照单位
// 启用后，光源亮度使用流明/坎德拉等物理单位
// 更精确但需要正确配置 HDR 和曝光
```

### Scene 事件

| 事件 | 触发时机 | 参数 |
|------|----------|------|
| `set:layers` | 图层组合变更 | `(oldComposition, newComposition)` |
| `set:skybox` | 天空盒变更 | `(oldSkyboxTexture)` |
| `prerender` | 相机渲染前 | `(cameraComponent)` |
| `postrender` | 相机渲染后 | `(cameraComponent)` |
| `prerender:layer` | 图层渲染前 | `(camera, layer, transparent)` |
| `postrender:layer` | 图层渲染后 | `(camera, layer, transparent)` |
| `precull` | 可见性剔除前 | `(camera)` |
| `postcull` | 可见性剔除后 | `(camera)` |

`prerender:layer` / `postrender:layer` 非常有用——可以在某个 layer 渲染前后插入额外的渲染，如后处理效果。

### layers — LayerComposition

```typescript
// 获取内置图层
const world = app.scene.layers.getLayerById(pc.LAYERID_WORLD);     // id=0
const ui    = app.scene.layers.getLayerById(pc.LAYERID_UI);        // id=1
const depth = app.scene.layers.getLayerById(pc.LAYERID_DEPTH);     // id=2
const sky   = app.scene.layers.getLayerById(pc.LAYERID_SKYBOX);    // id=3

// 按名称查找
const uiLayer = app.scene.layers.getLayerByName('UI');
```

渲染顺序按 layer ID 从小到大：`WORLD(0) → UI(1) → DEPTH(2) → SKYBOX(3) → IMMEDIATE(4)`。

---

## Entity（实体）

`Entity` 继承自 `GraphNode`，是场景中所有对象的类型。

### 构造函数

```typescript
new Entity(name?: string, app?: AppBase)
// name 默认 "Untitled"
// app 默认当前 Application（通常不需要传）
```

### 组件快捷访问

Entity 提供 21 个只读属性快速访问组件：

```typescript
entity.render       // RenderComponent | undefined
entity.camera       // CameraComponent | undefined
entity.light        // LightComponent | undefined
entity.model        // ModelComponent | undefined
entity.element      // ElementComponent | undefined
entity.screen       // ScreenComponent | undefined
entity.button       // ButtonComponent | undefined
entity.sound        // SoundComponent | undefined
entity.anim         // AnimComponent | undefined
entity.animation    // AnimationComponent | undefined
entity.gsplat       // GSplatComponent | undefined
entity.rigidbody    // RigidBodyComponent | undefined
entity.collision    // CollisionComponent | undefined
entity.script       // ScriptComponent | undefined
// 还有: audiolistener, layoutchild, layoutgroup,
//       particlesystem, scrollbar, scrollview, sprite
```

这些属性的值随组件添加/移除自动更新。例如 `entity.addComponent('camera', ...)` 后，`entity.camera` 立即可用。

### 组件管理

```typescript
// 添加
entity.addComponent('camera', { fov: 60, nearClip: 0.1, farClip: 1000 });
entity.addComponent('render', { type: 'box', material: myMaterial });

// 检查
if (entity.render) { /* 有渲染组件 */ }

// 移除
entity.removeComponent('render');
// 移除后 entity.render 变为 undefined

// 查找同一 entity 上的组件
const allScripts = entity.findComponents('script');
```

### Entity 事件

```typescript
entity.on('destroy', () => {
    console.log(`Entity ${entity.name} 被销毁`);
});
```

### enabled

```typescript
entity.enabled = false;  // 禁用（隐藏且不更新，子节点也被禁用）
entity.enabled = true;   // 启用（默认）
```

禁用一个 entity 会同时禁用其所有子节点。不可见的父节点会让所有子节点也不可见。

---

## GraphNode（层级与变换）

`Entity extends GraphNode`，所有变换操作来自 GraphNode。

### 层级操作

```typescript
parent.addChild(child);                       // 添加子节点
parent.addChildAndSaveTransform(child);       // 添加子节点并保留世界变换 ⚠️ 重要
parent.removeChild(child);                    // 移除子节点
entity.reparent(newParent);                   // 更换父节点
entity.remove();                              // 从父节点移除自身
entity.destroy();                             // 递归销毁（含子节点）
```

`addChild` vs `addChildAndSaveTransform`：
- `addChild`：子节点的局部变换不变，世界变换会变（因为父节点可能不同位置）
- `addChildAndSaveTransform`：子节点的世界变换不变，局部变换会被重新计算

抓取物体时用 `addChildAndSaveTransform`——物体保持世界位置不变但成为手柄的子节点。

### 查找

```typescript
root.findByName('Camera'): Entity | null          // 深度优先，按名称查找
root.findByTag('grabbable'): Entity[]             // 递归查找所有带此标签的节点
root.findByPath('/root/child/grandchild'): Entity | null
root.find((node) => node.name.startsWith('Enemy')): GraphNode | null  // 自定义条件
root.findOne((node) => ...): GraphNode | null                       // 自定义条件，只找一个
root.forEach((node) => { /* 遍历所有子节点 */ })
```

### 变换属性

```typescript
// 层次信息
node.parent: GraphNode | null
node.children: GraphNode[]
node.root: GraphNode         // 最顶层根节点
node.path: string            // 完整路径
node.graphDepth: number      // 在层级中的深度

// 局部变换
node.setLocalPosition(x, y, z)     // 相对父节点的位置
node.getLocalPosition(): Vec3
node.setLocalRotation(q: Quat)     // 相对父节点的旋转
node.getLocalRotation(): Quat
node.setLocalEulerAngles(x, y, z)  // 局部欧拉角（度数）
node.getLocalEulerAngles(): Vec3
node.setLocalScale(x, y, z)        // 局部缩放
node.getLocalScale(): Vec3

// 世界变换（只读或通过 setter 设置）
node.setPosition(x, y, z)          // 世界位置
node.getPosition(): Vec3
node.setRotation(q: Quat)          // 世界旋转
node.getRotation(): Quat
node.setEulerAngles(x, y, z)       // 世界欧拉角（度数）
node.getEulerAngles(): Vec3
node.getWorldTransform(): Mat4     // 世界变换矩阵

// 方向向量（只读，世界空间，已归一化）
node.forward: Vec3    // 局部 (0,0,-1) 在世界空间的方向
node.up: Vec3         // 局部 (0,1,0) 在世界空间的方向
node.right: Vec3      // 局部 (1,0,0) 在世界空间的方向
```

### 变换操作

```typescript
node.translate(x, y, z)         // 世界空间平移
node.translateLocal(x, y, z)    // 局部空间平移（沿自身方向）
node.rotate(x, y, z)            // 世界空间旋转（欧拉角，度数）
node.rotateLocal(x, y, z)       // 局部空间旋转
node.lookAt(target: Vec3)       // 使 -Z 轴指向目标
// 如果想 +Z 轴指向目标：
// node.lookAt(target) 后 node.rotateLocal(0, 180, 0)
```

### Tags（标签系统）

```typescript
entity.tags.add('grabbable');
entity.tags.add('interactive');
entity.tags.has('grabbable');   // true
entity.tags.delete('grabbable');
entity.tags.size;               // 标签数量
entity.tags.list();             // 返回标签数组
```

标签用于分类和查找。不需要单独注册——标签存在 entity 上，`findByTag` 会递归搜索所有子节点。

### 世界矩阵

```typescript
const worldMat = entity.getWorldTransform();  // pc.Mat4
// 这是实体的 4×4 世界变换矩阵（TRS）
// 自动缓存，只在 dirty 时重新计算
```

---

## 常用模式

### 创建相机并在 VR 中工作

```typescript
const camera = new pc.Entity('Camera');
camera.addComponent('camera', {
    clearColor: new pc.Color(0.1, 0.1, 0.15),
    fov: 60,
    nearClip: 0.1,
    farClip: 1000
});
camera.setPosition(0, 1.6, 0);  // 人眼高度
app.root.addChild(camera);
```

### 获取相机前方位置

```typescript
const camPos = camera.getPosition();
const forward = camera.forward;           // 世界空间归一化方向
const target = new pc.Vec3()
    .copy(camPos)
    .add(forward.mulScalar(1.5));         // 前方 1.5m
```

### 面板朝向用户

```typescript
panel.setPosition(targetPos);
panel.lookAt(camPos);                     // panel 的 -Z 轴指向相机
panel.rotateLocal(-7.5, 180, 0);          // 微调朝向
```

### 遍历带标签的实体

```typescript
const grabbables = app.root.findByTag('grabbable');
for (const entity of grabbables) {
    console.log('可抓取:', entity.name);
}
```

### reparent 抓取（VR 中最常用）

```typescript
// 抓取
controllerEntity.addChildAndSaveTransform(grabbedEntity);
// 抓取后 grabbedEntity 自动跟随 controllerEntity 移动

// 释放
originalParent.addChildAndSaveTransform(grabbedEntity);
```

## 关键 API 速查

```typescript
// Scene
app.scene.ambientLight: Color          // 环境光
app.scene.exposure: number             // 曝光
app.scene.tonemapping: number          // 色调映射
app.scene.skybox: Texture              // 天空盒纹理
app.scene.skyboxMip: number            // 天空盒 mip
app.scene.skyboxIntensity: number      // 天空盒亮度
app.scene.sky.type: string             // 'infinite'|'box'|'dome'
app.scene.fog: number                  // 雾类型
app.scene.fogColor: Color              // 雾颜色
app.scene.fogStart / fogEnd: number    // 线性雾范围
app.scene.fogDensity: number           // 指数雾密度
app.scene.physicalUnits: boolean       // 物理光照
app.scene.layers.getLayerById(id)
app.scene.layers.getLayerByName(name)
app.scene.on('prerender'|'postrender'|'prerender:layer'...)

// Entity
new Entity(name?)
entity.addComponent(type, data)
entity.removeComponent(type)
entity.enabled: boolean
entity.tags.add/has/delete(tag)
app.root.findByName(name)
app.root.findByTag(tag)
entity.destroy()
entity.render / .camera / .light / .element / .gsplat / ...  // 快捷访问

// GraphNode (Entity 继承)
node.setPosition(x,y,z) / getPosition()
node.setRotation(q) / getRotation()
node.setLocalPosition(x,y,z) / getLocalPosition()
node.setLocalRotation(q) / getLocalRotation()
node.setLocalScale(x,y,z) / getLocalScale()
node.setEulerAngles(x,y,z) / setLocalEulerAngles(x,y,z)
node.translate(x,y,z) / translateLocal(x,y,z)
node.rotate(x,y,z) / rotateLocal(x,y,z)
node.lookAt(target: Vec3)
node.forward / .up / .right: Vec3
node.getWorldTransform(): Mat4
addChild(child) / addChildAndSaveTransform(child)
removeChild(child) / reparent(newParent)
```
