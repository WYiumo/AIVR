import * as pc from 'playcanvas';
import { VrController } from '../entities/controller';
import { Grabbable } from './grabbable';
import { GrabbableRegistry } from './grabbable-registry';
import { XRPicker } from './xr-picker';
import { Manipulator } from './manipulator';

/**
 * InteractionManager - 顶层协调：
 * 持有 Registry、Picker、Manipulator，将三者连接起来。
 * 负责 per-frame update 和销毁。
 */
export class InteractionManager {
    readonly registry: GrabbableRegistry = new GrabbableRegistry();
    readonly manipulator: Manipulator;
    private picker: XRPicker;

    constructor(app: pc.Application, controller: VrController) {
        this.manipulator = new Manipulator(app, controller, this.registry);

        this.picker = new XRPicker(app, this.registry, (g, inputSource) => {
            this.onPicked(g, inputSource);
        });
    }

    /**
     * 拾取回调：toggle 语义
     * - 命中当前抓取物体 → 释放
     * - 命中其他物体 → 切换抓取目标
     * - 未抓取 → 抓取
     */
    private onPicked(g: Grabbable, inputSource: pc.XrInputSource): void {
        const held = this.manipulator.getHeldEntity();
        if (held === g.entity) {
            this.manipulator.endHold();
        } else {
            if (held) this.manipulator.endHold();
            this.manipulator.startHold(g, inputSource);
        }
    }

    update(dt: number): void {
        this.manipulator.update(dt);
    }

    destroy(): void {
        this.manipulator.endHold();
        this.picker.destroy();
        this.registry.clear();
    }
}
