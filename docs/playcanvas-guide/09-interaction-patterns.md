# 09 - 交互模式

## 概述

3D/VR 交互的核心模式包括：射线拾取（Ray Picking）、抓取（Grabbing）、移动（Moving）、旋转（Rotating）和选择反馈（Visual Feedback）。本章结合 AIVR 项目的实际实现，介绍这些模式的设计与编码。

## 交互架构总览

```
事件输入层
    ├── XR Input (select/squeeze 事件)
    ├── Gamepad 按钮轮询 (Y/X/Grip/Trigger)
    └── Mouse/Touch (编辑器/调试)

         ↓

拾取层 (Picking)
    ├── 射线-AABB 测试 (intersectsRay)
    └── 拾取结果筛选 (最近命中)

         ↓

交互层 (Interaction)
    ├── 抓取/释放 (Grab/Release)
    ├── 旋转 (Rotate)
    └── 缩放 (Scale)

         ↓

反馈层 (Feedback)
    ├── 高亮框 (Highlight Box)
    ├── 射线可视化 (Debug Rays)
    └── 触觉反馈 (Haptics)
```

## 模式 1：射线拾取（Ray Picking）

### 射线来源

```typescript
// VR 中：从右手 XR 输入源获取射线
const origin = inputSource.getOrigin();
const direction = inputSource.getDirection();
ray.set(origin, direction);

// 桌面中：从相机和鼠标位置计算
camera.screenToWorld(screenX, screenY, farClip, worldPos);
ray.set(camPos, worldPos.sub(camPos).normalize());
```

### AABB 拾取实现

```typescript
class GrabbableRegistry {
    private items: Set<Grabbable> = new Set();

    /**
     * 按射线找出最近的可抓取实体
     * 返回距离最近的命中
     */
    pick(ray: pc.Ray): Grabbable | null {
        let best: Grabbable | null = null;
        let bestDist = Infinity;

        for (const g of this.items) {
            const aabb = this.getWorldAabb(g.entity);
            if (!aabb) continue;

            if (aabb.intersectsRay(ray)) {
                // 使用实体位置估算距离（简单方案）
                const dist = ray.origin.distance(g.entity.getPosition());
                if (dist < bestDist) {
                    best = g;
                    bestDist = dist;
                }
            }
        }

        return best;
    }

    /**
     * 获取实体的世界空间 AABB
     */
    private getWorldAabb(entity: pc.Entity): pc.BoundingBox | null {
        // 普通渲染实体
        const render = entity.render;
        if (render?.meshInstances?.[0]?.aabb) {
            return render.meshInstances[0].aabb;
        }

        // GSplat 实体
        if (entity.gsplat) {
            const resource = (entity.gsplat as any).resource;
            const localAabb = resource?.aabb as pc.BoundingBox | undefined;
            if (localAabb) {
                const worldAabb = new pc.BoundingBox();
                worldAabb.setFromTransformedAabb(
                    localAabb,
                    entity.getWorldTransform()
                );
                return worldAabb;
            }
        }

        return null;
    }
}
```

### XRPicker：监听 XR 事件

```typescript
class XRPicker {
    private app: pc.Application;
    private registry: GrabbableRegistry;
    private ray: pc.Ray = new pc.Ray();

    constructor(
        app: pc.Application,
        registry: GrabbableRegistry,
        onPicked: (grabbable: Grabbable, inputSource: pc.XrInputSource) => void
    ) {
        this.app = app;
        this.registry = registry;

        // ⚠️ 关键：使用 select 事件而非按钮轮询
        if (this.app.xr?.input) {
            this.app.xr.input.on('select', (inputSource) => {
                // 只用右手拾取
                if (inputSource.handedness !== 'right') return;

                const origin = inputSource.getOrigin();
                const direction = inputSource.getDirection();
                if (!origin || !direction) return;

                this.ray.set(origin, direction);
                const hit = this.registry.pick(this.ray);

                if (hit) {
                    onPicked(hit, inputSource);
                }
            });
        }
    }

    destroy(): void {
        // 移除事件监听
    }
}
```

## 模式 2：抓取/释放（Grab/Release）

### 方案对比

| 方案 | 实现 | 优点 | 缺点 |
|------|------|------|------|
| **Reparent**（推荐） | `addChildAndSaveTransform` | 自动跟随，无抖动 | 改变层级 |
| **Offset 跟随** | 手动 `setPosition(gripPose + offset)` | 不改变层级 | 对延迟敏感 |

### Reparent 模式实现

```typescript
class Manipulator {
    private held: {
        grabbable: Grabbable;
        originalParent: pc.GraphNode;
    } | null = null;

    /**
     * 开始抓取
     * 将物体 reparent 到 controller entity 下
     */
    startHold(grabbable: Grabbable, controllerEntity: pc.Entity): void {
        const heldEntity = grabbable.entity;
        const originalParent = heldEntity.parent;
        if (!originalParent) return;

        this.held = { grabbable, originalParent };

        // ⚠️ 关键：addChildAndSaveTransform 保留世界变换
        // 物体自动跟随 controller 移动（PlayCanvas 每帧同步层级变换）
        controllerEntity.addChildAndSaveTransform(heldEntity);
    }

    /**
     * 释放
     * 还原到原父节点
     */
    endHold(): void {
        if (!this.held) return;

        const entity = this.held.grabbable.entity;
        this.held.originalParent.addChildAndSaveTransform(entity);
        this.held = null;
    }
}
```

### Reparent 工作原理

```
抓取前:
    app.root → heldEntity (world: position P0)

抓取时:
    controllerEntity.addChildAndSaveTransform(heldEntity)
    → heldEntity.localTransform = inv(controllerEntity.worldTransform) × P0
    → heldEntity 的世界位置保持不变

抓取后每帧:
    heldEntity.worldPosition = controllerEntity.worldTransform
                              × heldEntity.localTransform
    → heldEntity 自动跟随 controller 移动！
```

### Toggle 抓取语义

```typescript
class InteractionManager {
    onPicked(g: Grabbable, inputSource: pc.XrInputSource): void {
        const held = this.manipulator.getHeldEntity();

        if (held === g.entity) {
            // 命中当前抓取物体 → 释放
            this.manipulator.endHold();
        } else {
            // 未抓取 → 抓取新物体
            // 或命中不同物体 → 先释放旧的，再抓取新的
            if (held) this.manipulator.endHold();

            const ctrl = this.controller.findByInputSource(inputSource);
            if (ctrl) {
                this.manipulator.startHold(g, ctrl.entity);
            }
        }
    }
}
```

## 模式 3：旋转（Rotation）

### 摇杆旋转

```typescript
class Manipulator {
    private rotationSpeed = 20;  // rad/s
    private stickDeadzone = 0.3;

    applyRotation(dt: number): void {
        if (!this.held) return;

        // Grip 按下才能旋转
        if (!this.isGripHeld()) return;

        // 读取右摇杆
        const stick = this.getThumbstick(rightController);
        if (!stick) return;

        // 死区
        const sx = Math.abs(stick.x) > this.stickDeadzone ? stick.x : 0;
        const sy = Math.abs(stick.y) > this.stickDeadzone ? stick.y : 0;
        if (sx === 0 && sy === 0) return;

        // 按主分量选轴
        let axis: pc.Vec3;
        let amount: number;
        if (Math.abs(sx) > Math.abs(sy)) {
            axis = new pc.Vec3(0, 1, 0);  // 摇杆左右 → 绕 Y 轴
            amount = sx;
        } else {
            axis = new pc.Vec3(1, 0, 0);  // 摇杆上下 → 绕 X 轴
            amount = sy;
        }

        // 应用旋转
        const delta = amount * this.rotationSpeed * dt;
        const q = new pc.Quat().setFromAxisAngle(axis, delta);
        const current = this.held.grabbable.entity.getLocalRotation();
        const next = new pc.Quat().mul2(q, current);
        this.held.grabbable.entity.setLocalRotation(next);
    }

    getThumbstick(controller: ControllerInfo): { x: number; y: number } | null {
        const gamepad = (controller.inputSource as any).gamepad;
        if (!gamepad?.axes) return null;
        return {
            x: gamepad.axes[2] ?? 0,  // 右摇杆 X
            y: gamepad.axes[3] ?? 0   // 右摇杆 Y
        };
    }
}
```

## 模式 4：反馈（Feedback）

### 高亮框

```typescript
class HighlightBox {
    entity: pc.Entity;

    constructor(app: pc.Application) {
        this.entity = new pc.Entity('HighlightBox');

        // 添加线框渲染
        this.entity.addComponent('render', {
            type: 'box',
            material: this.createWireframeMaterial(),
            castShadows: false,
            receiveShadows: false
        });

        app.root.addChild(this.entity);
        this.entity.enabled = false;
    }

    setSize(size: number): void {
        this.entity.setLocalScale(size, size, size);
    }

    show(): void { this.entity.enabled = true; }
    hide(): void { this.entity.enabled = false; }

    destroy(): void { this.entity.destroy(); }
}
```

### 调试射线

```typescript
// 在 VrController.update() 中绘制
drawInputSourceRays(): void {
    if (!this.app.xr?.active) return;

    for (const inputSource of this.app.xr.input.inputSources) {
        if (inputSource.targetRayMode === pc.XRTARGETRAY_POINTER) {
            const origin = inputSource.getOrigin();
            const direction = inputSource.getDirection();
            if (origin && direction) {
                const endPoint = direction.clone()
                    .mulScalar(10)
                    .add(origin);
                const color = inputSource.selecting
                    ? pc.Color.GREEN   // 扳机按下 = 绿色
                    : pc.Color.WHITE;  // 未按下 = 白色
                this.app.drawLine(origin, endPoint, color);
            }
        }
    }
}
```

## 模式 5：Grabbable 标签系统

```typescript
class Grabbable {
    readonly entity: pc.Entity;

    constructor(entity: pc.Entity, registry: GrabbableRegistry) {
        this.entity = entity;
        entity.tags.add('grabbable');
        registry.register(this);
    }

    destroy(registry: GrabbableRegistry): void {
        registry.unregister(this);
        this.entity.tags.delete('grabbable');
    }
}

// 使用
const grabbable = new Grabbable(loadedEntity, interactionManager.registry);
```

## 完整交互流程

```
[VR 中，用户右手持手柄]
    │
    ▼
右手扳机射线指向可抓取物体
    │
    ▼ app.xr.input.on('select', cb) -- XRPicker 触发
    │
    ▼
ray.set(origin, direction)
    │
    ▼ GrabbableRegistry.pick(ray)
遍历 grabbable 列表 → 对每个做 AABB.intersectsRay(ray)
    │ → 返回最近的命中 Grabbable
    │
    ▼ InteractionManager.onPicked()
    │
    ├─ 已抓取同物体 → Manipulator.endHold()
    │       └→ controllerEntity.removeChild(entity)
    │       └→ originalParent.addChildAndSaveTransform(entity)
    │       └→ 隐藏高亮框
    │
    └─ 未抓取 / 不同物体 → Manipulator.startHold()
            ├→ 如有旧抓取，先 endHold()
            └→ controllerEntity.addChildAndSaveTransform(entity)
            └→ 创建高亮框

[物体成为 controller entity 的子节点]
    │
    ▼ 每帧
    │
    ├─ PlayCanvas 自动同步世界变换（物体跟随手柄）
    │
    ├─ Manipulator.update():
    │   ├─ 高亮框抵消父旋转（保持世界轴对齐）
    │   └─ Grip 按下 + 摇杆偏移 → 累积旋转
    │
    └─ 再次 Trigger 命中同一物体 → 释放
```

## 交互设计原则

### 1. 单一职责

每个类只做一件事：

| 类 | 单一职责 |
|------|----------|
| `Grabbable` | 标签 + 注册 |
| `GrabbableRegistry` | 存储 + AABB 拾取 |
| `XRPicker` | 监听 XR 事件 + 发射射线 |
| `Manipulator` | 抓取/释放 + 旋转 |
| `InteractionManager` | 组合协调 |
| `HighlightBox` | 视觉反馈 |

### 2. 事件驱动 vs 轮询

| 场景 | 推荐方式 |
|------|----------|
| 拾取（点选） | 事件驱动（`select` 事件） |
| 按住（Grip） | 轮询（`isGripHeld()` 每帧查） |
| Toggle 按钮（Y） | 轮询 + 上升沿检测 |
| 摇杆 | 轮询（`gamepad.axes[i]`） |

### 3. Reparent vs Offset

**优先使用 reparent**：
- 代码更简洁
- PlayCanvas 自动处理层级变换
- 对相机/控制器延迟更鲁棒

**使用 offset 的场景**：
- 不能改变层级结构时
- 物体需要保持在特定父节点下

### 4. 反馈必须即时

- 抓取时立即显示高亮框
- 射线颜色实时反映扳机状态
- 不要等下一帧才更新反馈

## 位置同步的 Offset 模式（备用方案）

当不能使用 reparent 时，手动 offset 跟随：

```typescript
class VrController {
    private grabbedEntity: pc.Entity | null = null;
    private grabOffset: pc.Vec3 = new pc.Vec3();

    startGrab(inputSource: pc.XrInputSource, target: pc.Entity): void {
        const gripPose = inputSource.getPosition();
        if (!gripPose) return;

        this.grabbedEntity = target;
        // 抓取偏移 = 物体位置 - 手柄位置
        this.grabOffset.sub2(target.getPosition(), gripPose);
    }

    updateGrabbing(inputSource: pc.XrInputSource): void {
        if (!this.grabbedEntity) return;

        const gripPose = inputSource.getPosition();
        if (gripPose) {
            // 物体位置 = 手柄位置 + 偏移
            const targetPos = new pc.Vec3().add2(gripPose, this.grabOffset);
            this.grabbedEntity.setPosition(targetPos);
        }
    }
}
```

## 常见问题

### Q: 射线拾取不准？

检查：
1. 射线方向是否归一化（`ray.set` 会自动处理）
2. AABB 是否正确更新（`meshInstance.aabb` 由引擎自动维护）
3. GSplat 的 AABB 需要手动转换到世界空间
4. 确保 `inputSource.getOrigin()` 和 `getDirection()` 不为 null

### Q: 物体跟随有延迟？

Reparent 方案中，物体的世界变换由 PlayCanvas 每帧自动计算，延迟取决于 controller entity 的变换更新频率。确保在 `update()` 中每帧更新 controller 位置。

### Q: 释放后物体跳到错误位置？

`addChildAndSaveTransform` 会保留世界变换。确保：
1. 抓取前保存了正确的 `originalParent`
2. 使用 `addChildAndSaveTransform` 而不是 `addChild`
3. `originalParent` 在此期间没有被销毁或移动

## 关键 API 汇总

```typescript
// 拾取
aabb.intersectsRay(ray): boolean
ray.origin.distance(point): number

// 抓取
controllerEntity.addChildAndSaveTransform(entity)
originalParent.addChildAndSaveTransform(entity)

// 旋转
new pc.Quat().setFromAxisAngle(axis, radians)
new pc.Quat().mul2(q1, q2)
entity.setLocalRotation(q)

// 调试
app.drawLine(origin, end, color)

// XR 事件
app.xr.input.on('select', cb)
inputSource.getOrigin() / getDirection()
inputSource.selecting: boolean

// 标签
entity.tags.add('grabbable')
entity.tags.has('grabbable')
```
