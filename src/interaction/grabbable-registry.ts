import * as pc from 'playcanvas';
import { Grabbable } from './grabbable';

/**
 * GrabbableRegistry - 管理所有可抓取实体。
 * 提供按射线拾取 (pick) 功能。
 */
export class GrabbableRegistry {
    private items: Set<Grabbable> = new Set();

    register(g: Grabbable): void {
        this.items.add(g);
    }

    unregister(g: Grabbable): void {
        this.items.delete(g);
    }

    clear(): void {
        this.items.clear();
    }

    get size(): number {
        return this.items.size;
    }

    /**
     * 获取实体的世界空间 AABB（公开方法，给 HighlightBox 等使用）
     */
    getAabb(entity: pc.Entity): pc.BoundingBox | null {
        return this.getWorldAabb(entity);
    }

    /**
     * 按射线找出最近的可抓取实体
     * 优先用 render / gsplat 的 meshInstance.aabb
     */
    pick(ray: pc.Ray): Grabbable | null {
        let best: Grabbable | null = null;
        let bestT = Infinity;

        for (const g of this.items) {
            const aabb = this.getWorldAabb(g.entity);
            if (!aabb) {
                console.warn('[GrabbableRegistry] 无 AABB:', g.entity.name, 'render:', !!g.entity.render, 'gsplat:', !!g.entity.gsplat);
                continue;
            }
            // 调试：打印 AABB 和 ray
            console.log('[GrabbableRegistry] 测试', g.entity.name,
                'aabb center:', aabb.center.toString(),
                'aabb halfExtents:', aabb.halfExtents.toString(),
                'entity pos:', g.entity.getPosition().toString(),
                'ray origin:', ray.origin.toString(),
                'ray dir:', ray.direction.toString());

            if (aabb.intersectsRay(ray)) {
                const t = ray.origin.distance(g.entity.getPosition());
                console.log('[GrabbableRegistry] HIT', g.entity.name, 'dist:', t);
                if (t < bestT) {
                    best = g;
                    bestT = t;
                }
            }
        }
        return best;
    }

    private getWorldAabb(entity: pc.Entity): pc.BoundingBox | null {
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
}
