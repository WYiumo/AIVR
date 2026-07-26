import * as pc from 'playcanvas';

export class PlayerController {
    private app: pc.Application;
    private playerOffset: pc.Entity;
    private cameraEntity: pc.Entity;
    private controllerEntitys: Map<string, pc.Entity>;

    constructor(app: pc.Application) {
        this.app = app;
        this.playerOffset = new pc.Entity('PlayerOffset');
        this.cameraEntity = new pc.Entity('Camera');
        this.controllerEntitys = new Map<string, pc.Entity>([
            ['left', new pc.Entity('LeftController')],
            ['right', new pc.Entity('RightController')]]);
    }

    init(): void {
        this.initPlayerEntity();

        if (!this.app.xr?.input) return;
        this.app.on('teleport:to', (position) => {
            this.playerOffset.setPosition(position);
        });
    }

    update(_dt: number): void {
        const inputSources = this.app.xr?.input?.inputSources ?? [];
        let left = this.controllerEntitys.get('left');
        let right = this.controllerEntitys.get('right');
        for (const inputSource of inputSources) {
            const position = inputSource.getLocalPosition();
            const rotation = inputSource.getLocalRotation();
            if (inputSource.handedness === 'left' && left) {
                if (position) left.setPosition(position);
                if (rotation) left.setRotation(rotation);
            }
            if (inputSource.handedness === 'right' && right) {
                if (position) right.setPosition(position);
                if (rotation) right.setRotation(rotation);
            }

            if (inputSource.targetRayMode === pc.XRTARGETRAY_POINTER) {
                const origin = inputSource.getOrigin();
                const direction = inputSource.getDirection();

                if (origin && direction) {
                    const endPoint = direction.clone().add(origin);
                    const color = inputSource.selecting ? pc.Color.GREEN : pc.Color.WHITE;
                    this.app.drawLine(origin, endPoint, color);
                }
            }
        }
    }

    private initPlayerEntity(): void {
        const left = this.getControllerEntity('left');
        const right = this.getControllerEntity('right');

        this.cameraEntity.addComponent('camera', {
            fov: 60,
            nearClip: 0.1,
            farClip: 1000
        });

        left.addComponent('model', {
            type: 'asset',
            asset: (this.app.assets.find('leftController')?.resource as any).model,
            castShadows: true
        });

        right.addComponent('model', {
            type: 'asset',
            asset: (this.app.assets.find('rightController')?.resource as any).model,
            castShadows: true
        });

        this.app.root.addChild(this.playerOffset);
        this.playerOffset.addChild(this.cameraEntity);
        this.playerOffset.addChild(left);
        this.playerOffset.addChild(right);
    }

    getCamera(): pc.Entity {
        return this.cameraEntity;
    }

    getControllerEntity(handedness: 'left' | 'right'): pc.Entity {
        return this.controllerEntitys.get(handedness) as pc.Entity;
    }

    destroy(): void {
        if (this.playerOffset) this.playerOffset.destroy();
        if (this.cameraEntity) this.cameraEntity.destroy();
        this.controllerEntitys.clear();
    }
}