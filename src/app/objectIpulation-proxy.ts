import * as pc from 'playcanvas';
import { type FunctionCallback } from '../utils';

export class ObjectIpulationProxy {
    private app: pc.Application;

    private object: pc.Entity | null = null;
    private IsActive: boolean = false;

    private fn: FunctionCallback | null = null;

    constructor(app: pc.Application) {
        this.app = app;
    }

    update(_dt: number): void {
        if (!(this.IsActive && this.object && this.fn)) return;
        const inputSources = this.app.xr?.input?.inputSources ?? [];
        for (const inputSource of inputSources) {
            const gamepad = inputSource.gamepad;
            if (!gamepad?.axes) return;
            const stick_X = gamepad.axes[pc.XRPAD_STICK_X];
            const stick_Y = gamepad.axes[pc.XRPAD_STICK_Y];

            this.fn(this.object, stick_X, stick_Y, inputSource.handedness);
        }
    }

    setObject(object: pc.Entity): void {
        this.object = object;
    }

    start(callbck: FunctionCallback): void {
        this.IsActive = true;
        this.fn = callbck;
    }

    isActive(): boolean {
        return this.IsActive;
    }

    stop(): void {
        this.IsActive = false;
        this.object = null;
        this.fn = null;
    }
}