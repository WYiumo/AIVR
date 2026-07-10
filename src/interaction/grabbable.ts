import * as pc from 'playcanvas';
import { GrabbableRegistry } from './grabbable-registry';

/**
 * Grabbable - 给实体打 'grabbable' 标签并注册到 GrabbableRegistry。
 * 作为 composition 使用，附着在任何可被射线拾取的 3D 实体上（如 splat）。
 */
export class Grabbable {
    readonly entity: pc.Entity;

    constructor(entity: pc.Entity, registry: GrabbableRegistry) {
        this.entity = entity;
        this.entity.tags.add('grabbable');
        registry.register(this);
    }

    /**
     * 销毁：从 Registry 注销并移除标签
     */
    destroy(registry: GrabbableRegistry): void {
        this.entity.tags.remove('grabbable');
        registry.unregister(this);
    }
}
