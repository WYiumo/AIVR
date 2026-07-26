import * as pc from 'playcanvas';

export type FunctionCallback = (...args: any[]) => any;

// 按键索引
export const PAD = {
    L_Trigger: 0,
    L_Grip: 1,
    R_Trigger: 0,
    R_Grip: 1,
    L_X: 4,
    L_Y: 5,
    R_A: 4,
    R_B: 5
};

// 摇杆数轴方向
export const JoySTICK = {
    L_LEFT: -1,
    L_RIGHT: 1,
    L_UP: -1,
    L_DOWN: 1,
    R_LEFT: -1,
    R_RIGHT: 1,
    R_UP: -1,
    R_DOWN: 1
};

export function IsPadButtonPressed(inputSource: pc.XrInputSource, button: number): boolean {
    const gamepad = inputSource.gamepad;
    return gamepad?.buttons?.[button]?.pressed ?? false;
}

export async function loadSplat(app: pc.Application, url: string): Promise<pc.Entity> {
    return new Promise((resolve, reject) => {
        // 创建gsplat asset
        const asset = new pc.Asset(
            'splat-' + Date.now(),
            'gsplat',
            { url: url }
        );

        // AssetListLoader加载资源
        const assetListLoader = new pc.AssetListLoader([asset], app.assets);
        assetListLoader.load((err: Error) => {
            if (err) {
                console.error('Splat加载失败:', err);
                reject(err);
                return;
            }

            // 创建entity并添加gsplat组件
            const entity = new pc.Entity('splat');
            entity.addComponent('gsplat', {
                asset: asset,
                unified: true  // 启用统一渲染
            });

            console.log('Splat加载成功:', url);
            resolve(entity);
        });
    });
}

export function getIntersectElementContainer(app: pc.Application, ray: pc.Ray): pc.Entity | null {
    const Containers = app.root.findByTag('ElementContainer') as pc.Entity[];
    for (const container of Containers) {
        const entitys = container.children as pc.Entity[];
        if (IntersectEntity(entitys, ray))
            return container;
    }
    return null;
}

export function IntersectEntity(entitys: pc.Entity[], ray: pc.Ray): boolean {
    for (const entity of entitys) {
        const aabb = getWorldAabb(entity);
        if (!aabb) continue;
        if (aabb.intersectsRay(ray)) {
           return true;
        }
    }
    return false;
}

export function getWorldAabb(entity: pc.Entity): pc.BoundingBox | null {
    // render 组件（普通 mesh）
    const render = entity.render;
    if (render?.meshInstances?.[0]?.aabb) {
        return render.meshInstances[0].aabb;
    }
    // gsplat 组件
    // 注意: entity.gsplat.asset 返回的是 asset ID (number)，不是 Asset 对象
    // 正确获取 resource: entity.gsplat.resource (public getter)
    if (entity.gsplat) {
        const resource = (entity.gsplat as any).resource;
        const localAabb: pc.BoundingBox | undefined = resource?.aabb;
        if (localAabb) {
            const worldAabb = new pc.BoundingBox();
            worldAabb.setFromTransformedAabb(localAabb, entity.getWorldTransform());

            return worldAabb;
        }
    }
    return null;
}

// pick(ray: pc.Ray): Grabbable | null {
//         let best: Grabbable | null = null;
//         let bestT = Infinity;

//         for (const g of this.items) {
//             const aabb = this.getWorldAabb(g.entity);
//             if (!aabb) {
//                 console.warn('[GrabbableRegistry] 无 AABB:', g.entity.name, 'render:', !!g.entity.render, 'gsplat:', !!g.entity.gsplat);
//                 continue;
//             }
//             // 调试：打印 AABB 和 ray
//             console.log('[GrabbableRegistry] 测试', g.entity.name,
//                 'aabb center:', aabb.center.toString(),
//                 'aabb halfExtents:', aabb.halfExtents.toString(),
//                 'entity pos:', g.entity.getPosition().toString(),
//                 'ray origin:', ray.origin.toString(),
//                 'ray dir:', ray.direction.toString());

//             if (aabb.intersectsRay(ray)) {
//                 const t = ray.origin.distance(g.entity.getPosition());
//                 console.log('[GrabbableRegistry] HIT', g.entity.name, 'dist:', t);
//                 if (t < bestT) {
//                     best = g;
//                     bestT = t;
//                 }
//             }
//         }
//         return best;
//     }