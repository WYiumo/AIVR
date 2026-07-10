import * as pc from 'playcanvas';
import { Grabbable } from './grabbable';
import { GrabbableRegistry } from './grabbable-registry';

type OnPicked = (g: Grabbable, inputSource: pc.XrInputSource) => void;

/**
 * XRPicker - 监听 XR select 事件，对右手射线做 AABB 拾取。
 * 命中 GrabbableRegistry 中的可抓取实体时，回调 onPicked。
 */
export class XRPicker {
    private app: pc.Application;
    private registry: GrabbableRegistry;
    private onPicked: OnPicked;
    private ray: pc.Ray = new pc.Ray();
    private boundOnSelect: (inputSource: pc.XrInputSource) => void;

    constructor(app: pc.Application, registry: GrabbableRegistry, onPicked: OnPicked) {
        this.app = app;
        this.registry = registry;
        this.onPicked = onPicked;
        this.boundOnSelect = (inputSource) => this.handleSelect(inputSource);
        if (this.app.xr?.input) {
            this.app.xr.input.on('select', this.boundOnSelect);
        }
    }

    private handleSelect(inputSource: pc.XrInputSource): void {
        console.log('[XRPicker] select 触发, handedness:', inputSource.handedness, 'registry size:', this.registry.size);
        // 只用右手拾取
        if (inputSource.handedness !== 'right') return;

        const origin = inputSource.getOrigin();
        const direction = inputSource.getDirection();
        if (!origin || !direction) return;
        this.ray.set(origin, direction);

        const hit = this.registry.pick(this.ray);
        console.log('[XRPicker] pick 结果:', hit ? hit.entity.name : 'null');
        if (hit) {
            this.onPicked(hit, inputSource);
        }
    }

    destroy(): void {
        if (this.app.xr?.input && this.boundOnSelect) {
            this.app.xr.input.off('select', this.boundOnSelect);
        }
    }
}
