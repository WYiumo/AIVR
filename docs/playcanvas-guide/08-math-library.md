# 08 - 数学库

## 概述

PlayCanvas 提供完整的 3D 数学库，包括向量、矩阵、四元数、射线、包围盒等。所有数学类型都是**不可变友好**的——大多数方法返回 `this` 以支持链式调用。

## Vec2（二维向量）

```typescript
// 创建
const v = new pc.Vec2(x, y);
const v = new pc.Vec2();  // (0, 0)

// 属性
v.x, v.y

// 设置
v.set(x, y);

// 运算
const sum = new pc.Vec2().add2(a, b);     // sum = a + b
const diff = new pc.Vec2().sub2(a, b);    // diff = a - b
const scaled = v.clone().mulScalar(2);     // v * 2

// 长度
const len = v.length();
const sqLen = v.lengthSq();
v.normalize();  // 归一化（原地）

// 点积
const dot = a.dot(b);

// 距离
const dist = a.distance(b);

// 复制
const copy = v.clone();
const copy2 = new pc.Vec2().copy(v);
```

## Vec3（三维向量）

最常用的数学类型，用于位置、方向、缩放等。

### 创建

```typescript
const pos = new pc.Vec3(x, y, z);
const zero = new pc.Vec3();       // (0, 0, 0)
const up = pc.Vec3.UP;            // (0, 1, 0)
const forward = pc.Vec3.FORWARD;  // (0, 0, -1)
const right = pc.Vec3.RIGHT;      // (1, 0, 0)
const one = pc.Vec3.ONE;          // (1, 1, 1)
const zero = pc.Vec3.ZERO;        // (0, 0, 0)
```

### 基本运算

```typescript
// 加法
const sum = new pc.Vec3().add2(a, b);    // sum = a + b
v.add(b);                                 // v += b (原地)

// 减法
const diff = new pc.Vec3().sub2(a, b);   // diff = a - b
const offset = target.clone().sub(origin); // 从 origin 到 target 的向量

// 缩放
const doubled = v.clone().mulScalar(2);   // v * 2
const half = v.clone().divScalar(2);      // v / 2

// 取反
const negated = v.clone().mulScalar(-1);

// 线性插值
const mid = new pc.Vec3().lerp(a, b, 0.5);  // a + (b-a)*0.5
```

### 长度与归一化

```typescript
const len = v.length();          // 向量长度
const sqLen = v.lengthSq();      // 长度平方（性能更好，避免 sqrt）
v.normalize();                    // 归一化为单位长度（原地）
const unit = v.clone().normalize(); // 归一化（返回副本）
```

### 点积与叉积

```typescript
// 点积
const dot = a.dot(b);            // a·b = |a||b|cos(θ)
// dot > 0 → 同向；dot < 0 → 反向；dot ≈ 0 → 垂直

// 叉积
const cross = new pc.Vec3().cross(a, b); // a×b（垂直于 a 和 b）
```

### 实用代码

```typescript
// 相机前方 N 米的位置
const camPos = camera.getPosition();
const forward = camera.forward;  // 世界空间前方向（已归一化）
const target = new pc.Vec3()
    .copy(camPos)
    .add(forward.mulScalar(1.5));

// 两点距离
const dist = a.distance(b);

// 方向向量（归一化）
const dir = new pc.Vec3().sub2(target, origin).normalize();

// 射线终点
const endPoint = new pc.Vec3()
    .copy(direction)
    .mulScalar(10)      // 10 米长
    .add(origin);
```

## Vec4（四维向量）

用于颜色（RGBA）、齐次坐标等：

```typescript
const v = new pc.Vec4(x, y, z, w);
const color = new pc.Vec4(r, g, b, a);
```

## Color（颜色）

```typescript
// 创建
const red = new pc.Color(1, 0, 0);
const blue = new pc.Color(0, 0, 1, 0.5);  // 带 alpha
const white = new pc.Color();              // (1, 1, 1)

// 属性 (0-1 范围)
color.r, color.g, color.b, color.a

// 预设
pc.Color.RED, pc.Color.GREEN, pc.Color.BLUE
pc.Color.WHITE, pc.Color.BLACK
pc.Color.YELLOW, pc.Color.CYAN, pc.Color.MAGENTA
pc.Color.GRAY

// 操作
color.copy(other);
color.lerp(a, b, t);  // 线性插值
const hex = color.toString();  // 转十六进制
```

## Quat（四元数）

用于 3D 旋转，避免万向节死锁。

### 创建

```typescript
// 单位四元数（无旋转）
const identity = new pc.Quat();           // (0, 0, 0, 1)
const identity = pc.Quat.IDENTITY;

// 绕轴旋转
const q = new pc.Quat().setFromAxisAngle(axis, angle);
// axis: Vec3 (需归一化), angle: 弧度

// 从欧拉角
const q = new pc.Quat().setFromEulerAngles(x, y, z);  // 度数！
// x = pitch, y = yaw, z = roll

// 从 Mat4
const q = new pc.Quat().setFromMat4(matrix);
```

### 运算

```typescript
// 乘法（组合旋转）
const result = new pc.Quat().mul2(q1, q2);  // result = q1 * q2

// 归一化
q.normalize();

// 反转（反向旋转）
q.invert();

// 球面线性插值
const mid = new pc.Quat().slerp(a, b, 0.5);

// 旋转向量
const rotated = new pc.Vec3();
q.transformVector(vec, rotated);  // rotated = q * vec

// 复制
const copy = q.clone();
const copy2 = new pc.Quat().copy(q);
```

### 实用代码

```typescript
// 绕 Y 轴旋转 delta 弧度
const q = new pc.Quat().setFromAxisAngle(
    new pc.Vec3(0, 1, 0),    // Y 轴
    delta                     // 弧度
);

// 累积旋转
const current = entity.getLocalRotation();
const deltaAxis = new pc.Quat().setFromAxisAngle(axis, amount);
const next = new pc.Quat().mul2(deltaAxis, current);
entity.setLocalRotation(next);

// 从欧拉角创建 Y 轴旋转
const q = new pc.Quat().setFromEulerAngles(0, yRotation, 0);
entity.setRotation(q);

// 旋转方向向量
const forward = new pc.Vec3(0, 0, -1);
const rotated = new pc.Vec3();
rotationQuat.transformVector(forward, rotated);
// rotated 现在是旋转后的方向
```

## Mat4（4x4 矩阵）

用于世界变换矩阵：

```typescript
// 获取实体的世界变换矩阵
const worldMatrix = entity.getWorldTransform();  // pc.Mat4

// 单位矩阵
const identity = new pc.Mat4();  // 单位矩阵

// 设置单位矩阵
matrix.setIdentity();

// 从 TRS（平移、旋转、缩放）构建
matrix.setTRS(position, rotation, scale);
```

## Ray（射线）

用于碰撞检测和拾取：

```typescript
// 创建射线
const ray = new pc.Ray();         // 空射线
const ray = new pc.Ray(origin, direction);

// 设置
ray.origin.set(x, y, z);
ray.direction.set(dx, dy, dz).normalize();
// 或者
ray.set(origin, direction);       // direction 会自动归一化

// 从 XR 输入源创建射线
const origin = inputSource.getOrigin();
const direction = inputSource.getDirection();
if (origin && direction) {
    ray.set(origin, direction);
}

// 获取射线上的点（按距离 t）
const point = new pc.Vec3();
ray.getPoint(t, point);  // point = origin + direction * t
```

## BoundingBox（包围盒）

用于 AABB（轴对齐包围盒）碰撞检测：

```typescript
// 从 MeshInstance 获取 AABB
const meshInstance = entity.render?.meshInstances?.[0];
const aabb = meshInstance?.aabb;  // pc.BoundingBox

// 属性
aabb.center: Vec3        // 中心点（世界空间）
aabb.halfExtents: Vec3   // 半尺寸

// 射线检测
if (aabb.intersectsRay(ray)) {
    // 射线命中！
}

// 检查点是否在 AABB 内
if (aabb.containsPoint(point)) {
    // 点在内部
}

// 从局部 AABB 计算世界空间 AABB
const worldAabb = new pc.BoundingBox();
worldAabb.setFromTransformedAabb(localAabb, entity.getWorldTransform());

// 创建 AABB
const box = new pc.BoundingBox();
box.center.set(cx, cy, cz);
box.halfExtents.set(hx, hy, hz);
```

## BoundingSphere（包围球）

```typescript
const sphere = new pc.BoundingSphere();
sphere.center.set(cx, cy, cz);
sphere.radius = 5;

// 射线检测
if (sphere.intersectsRay(ray)) { }

// 包含检测
if (sphere.containsPoint(point)) { }
```

## Frustum（视锥体）

用于相机视锥体裁剪：

```typescript
const frustum = new pc.Frustum();

// 从投影矩阵构建（通常由相机自动维护）
camera.cameraComponent?.frustum;
```

## math 工具函数

```typescript
// 角度弧度转换
pc.math.DEG_TO_RAD          // π / 180
pc.math.RAD_TO_DEG          // 180 / π

// 实用函数
pc.math.radToDeg(radians);
pc.math.degToRad(degrees);
pc.math.clamp(value, min, max);
pc.math.lerp(a, b, t);
pc.math.random(min, max);
pc.math.smoothstep(edge0, edge1, x);

// 常量
pc.math.TWO_PI
pc.math.HALF_PI
pc.math.EPSILON
```

## 常用运算模式

### 物体前方放置

```typescript
const entityPos = entity.getPosition();
const entityForward = entity.forward;
const frontPos = new pc.Vec3()
    .copy(entityPos)
    .add(entityForward.mulScalar(distance));
```

### 朝向目标

```typescript
entity.lookAt(targetPosition);
// 这会使 entity 的 -Z 轴指向 target
```

### 旋转物体

```typescript
// 绕世界 Y 轴旋转
const currentRot = entity.getLocalRotation();
const delta = new pc.Quat().setFromAxisAngle(
    new pc.Vec3(0, 1, 0),
    rotationSpeed * dt
);
const newRot = new pc.Quat().mul2(delta, currentRot);
entity.setLocalRotation(newRot);

// 重置旋转
entity.setLocalEulerAngles(0, 0, 0);
```

### 射线-AABB 拾取

```typescript
const ray = new pc.Ray();
ray.set(origin, direction);

for (const object of pickableObjects) {
    const meshInstance = object.render?.meshInstances?.[0];
    if (!meshInstance) continue;

    if (meshInstance.aabb.intersectsRay(ray)) {
        const dist = ray.origin.distance(object.getPosition());
        // 记录最近的命中
    }
}
```

### GSplat AABB

```typescript
function getGSplatWorldAabb(entity: pc.Entity): pc.BoundingBox | null {
    if (!entity.gsplat) return null;

    const resource = (entity.gsplat as any).resource;
    const localAabb = resource?.aabb as pc.BoundingBox | undefined;
    if (!localAabb) return null;

    const worldAabb = new pc.BoundingBox();
    worldAabb.setFromTransformedAabb(localAabb, entity.getWorldTransform());
    return worldAabb;
}
```

### Reparent 保持世界变换

```typescript
// 将物体从原父节点移到新父节点，保持世界位置不变
newParent.addChildAndSaveTransform(entity);
// 这会自动计算新的 localTransform：
// entity.localTransform = inv(newParent.worldTransform) × entity.oldWorldTransform
```

## 常见陷阱

### 1. 四元数乘法顺序

四元数乘法**不交换**。`q1 * q2` 表示先应用 q2 再应用 q1（对同一个向量）：

```typescript
// 先绕 delta 旋转，再应用当前旋转
const combined = new pc.Quat().mul2(delta, current);

// 先应用 current，再旋转 delta（不同的结果）
const combined2 = new pc.Quat().mul2(current, delta);
```

### 2. setFromEulerAngles 使用度数

```typescript
// ⚠️ setFromEulerAngles 参数是度数，不是弧度！
q.setFromEulerAngles(0, 90, 0);   // 绕 Y 轴转 90 度

// setFromAxisAngle 参数是弧度，不是度数！
q.setFromAxisAngle(axis, Math.PI / 2);  // 绕 axis 转 90 度
```

### 3. Vec3 方法是原地修改的

```typescript
// ⚠️ 大多数方法修改自身并返回 this
v.normalize();  // 修改了 v

// 如果要保留原值，先 clone
const normalized = v.clone().normalize();
```

### 4. forward 是世界空间向量

```typescript
// entity.forward 是局部 (0, 0, -1) 经世界旋转后的方向
// 它是只读的，不要修改
const direction = camera.forward;  // 相机的世界前方向
```

## 关键 API 汇总

```typescript
// Vec3
new pc.Vec3(x, y, z)
v.add2(a, b)  /  v.sub2(a, b)  /  v.copy(src)
v.length()  /  v.lengthSq()  /  v.normalize()  /  v.clone()
v.dot(other)  /  v.distance(other)
v.lerp(a, b, t)  /  v.mulScalar(s)  /  v.divScalar(s)
pc.Vec3.UP / RIGHT / FORWARD / ONE / ZERO

// Quat
new pc.Quat()  /  pc.Quat.IDENTITY
q.setFromAxisAngle(axis, radians)
q.setFromEulerAngles(x, y, z)  // 度数！
q.mul2(a, b)  /  q.invert()  /  q.slerp(a, b, t)
q.transformVector(v, out)

// Mat4
entity.getWorldTransform(): Mat4
m.setIdentity()  /  m.setTRS(pos, rot, scale)

// Ray
new pc.Ray(origin, direction)
ray.set(origin, direction)
ray.getPoint(t, out)

// BoundingBox
bb.center  /  bb.halfExtents
bb.intersectsRay(ray)
bb.setFromTransformedAabb(localAabb, worldTransform)

// Color
new pc.Color(r, g, b, a)
pc.Color.RED / GREEN / BLUE / WHITE / BLACK

// math
pc.math.radToDeg / degToRad / clamp / lerp / DEG_TO_RAD
```
