import * as pc from 'playcanvas';
import { PlayerController } from '../entities/playerController';
import { ObjectIpulationProxy } from '../app/objectIpulation-proxy';
import { VoicePanel } from '../ui/voice-panel';
import { ToolsWheel } from '../ui/tools-wheel';
import { ObjectPanel } from '../ui/object-panel';
import { loadSplat, getIntersectElementContainer, type FunctionCallback } from '../utils';
import { ElementContainer } from '../entities/elementContainer';

type InteractionState = 'idle' | 'wheelOpen' | 'voicePanelOpen' | 'objectPanelOpen' | 'objectManipulating' | 'objectSelecting'

export class InteractionManager {
    private app: pc.Application;
    private playerController: PlayerController;
    private objectProxy: ObjectIpulationProxy;
    private toolsWheel: ToolsWheel;
    private VoicePanel: VoicePanel;
    private ojectPanel: ObjectPanel;

    private interactionState: InteractionState = 'idle';
    private cunt = 0;

    // private currentObject: ElementContainer[] | null = null;

    constructor(app: pc.Application, playerController: PlayerController, objectProxy: ObjectIpulationProxy,
        toolsWheel: ToolsWheel, voicePanel: VoicePanel, ojectPanel: ObjectPanel) {
        this.app = app;
        this.playerController = playerController;
        this.objectProxy = objectProxy;

        this.toolsWheel = toolsWheel;
        this.VoicePanel = voicePanel;
        this.ojectPanel = ojectPanel;
    }

    init(): void {
        this.EntityPositionInit();
        this.registerToolsWheelEvents();
        this.registerVoicePanelEvents();
        this.registerObjectControlEvents();
    }

    private EntityPositionInit(): void {
        const camera = this.playerController.getCamera();
        const left = this.playerController.getControllerEntity('left');
        const wheel = this.toolsWheel.getScreenEntity();
        const voice = this.VoicePanel.getScreenEntity();
        const object = this.ojectPanel.getScreenEntity();

        left.addChild(wheel);
        wheel.setLocalPosition(0, 0, -0.1);
        wheel.setLocalEulerAngles(-38, 0, 0);

        camera.addChild(voice);
        voice.setLocalPosition(0.6, -0.2, -1)
        voice.setLocalEulerAngles(-12, -10, 0);

        camera.addChild(object)
        object.setLocalPosition(0, -0.3, -0.4);
        object.setLocalEulerAngles(-5, 0, 0);
    }

    private registerToolsWheelEvents(): void {
        const toolsWheel = this.toolsWheel;
        const voice = this.VoicePanel;
        const object = this.ojectPanel;

        this.app.on('left_y_click', () => {
            if (this.interactionState == 'idle') {
                toolsWheel.changeScreenEnable();
                this.interactionState = 'wheelOpen';
                return;
            }
            if (this.interactionState == 'wheelOpen') {
                toolsWheel.changeScreenEnable();
                this.interactionState = 'idle';
                return;
            }
        }, this);

        this.app.on('left_left_click', () => {
            if (this.interactionState == 'wheelOpen') {
                toolsWheel.spinning_wheel(-1);
            }
        }, this);

        this.app.on('left_right_click', () => {
            if (this.interactionState == 'wheelOpen') {
                toolsWheel.spinning_wheel(1);
            }
        }, this);

        this.app.on('right_a_click', () => {
            if (this.interactionState == 'wheelOpen') {
                toolsWheel.updateCurrentTool();
                toolsWheel.changeScreenEnable();
                if (this.toolsWheel.currentTool == 0) {
                    this.interactionState = 'voicePanelOpen'
                    voice.changeScreenEnable();
                }
                if (this.toolsWheel.currentTool == 1) {
                    this.interactionState = 'objectPanelOpen'
                    object.changeScreenEnable();
                }
                this.cunt = 1;
            }
        }, this);
    }

    private registerVoicePanelEvents() {
        this.app.on('right_b_click', () => {
            if (this.interactionState == 'voicePanelOpen') {
                this.VoicePanel.changeScreenEnable();
                this.interactionState = 'idle';
            }
        }, this);

        this.app.on('voice:sendResult', async (_text: string) => {
            // 加载模拟，原定为将文本发送到后端生成对应GS模型，获取url后加载到世界中
            const entity = await loadSplat(this.app, '/avocado_chair.ply');
            const container = ElementContainer.createElement(this.app);
            container.addElement(entity);

            const camera = this.playerController.getCamera();
            const position = camera.getPosition().clone().add(camera.forward.clone().mulScalar(1));

            container.setPosition(position);
        });
    }

    private registerObjectControlEvents() {
        const object = this.ojectPanel;
        const callbackFn = new Map<number, FunctionCallback>([
            [0, (object: pc.Entity, stick_X: number, stick_Y: number, handedness: string) => {
                const pos = object.getPosition();
                if (handedness == 'left') {
                    pos.add(new pc.Vec3(0, -stick_Y * 0.1, 0))
                } else if (handedness == 'right') {
                    pos.add(new pc.Vec3(stick_X * 0.1, 0, stick_Y * 0.1))
                }

                object.setPosition(pos);
            }],
            [1, (object: pc.Entity, stick_X: number, stick_Y: number, handedness: string) => {
                const current = object.getRotation();
                let delta_y = new pc.Quat();
                let delta_z = new pc.Quat();
                let delta_x = new pc.Quat();
                if (handedness == 'left') {
                    if (Math.abs(stick_X) > 0.5) {
                        delta_z = delta_z.setFromAxisAngle(new pc.Vec3(0, 0, 1), -stick_X * 5);
                    }
                } else if (handedness == 'right') {
                    if (Math.abs(stick_X) > 0.5) {
                        delta_y = delta_y.setFromAxisAngle(new pc.Vec3(0, 1, 0), stick_X * 5);
                    }
                    if (Math.abs(stick_Y) > 0.5) {
                        delta_x = delta_x.setFromAxisAngle(new pc.Vec3(1, 0, 0), stick_Y * 5);
                    }
                }
                const deltaAxis = new pc.Quat().mul2(delta_x, delta_y).mul(delta_z);
                object.setRotation(new pc.Quat().mul2(deltaAxis, current));
            }]
        ]);

        this.app.on('right_a_click', () => {
            if (this.cunt) {
                this.cunt = 0;
                return;
            }
            if (this.interactionState == 'objectPanelOpen') {
                object.updatecurrentOperation();
                this.objectProxy.start(callbackFn.get(object.currentOperation) as FunctionCallback);
                this.interactionState = 'objectManipulating'
            }
        }, this);

        this.app.on('right_b_click', () => {
            if (this.interactionState == 'objectManipulating') {
                this.objectProxy.stop();
                this.interactionState = 'objectPanelOpen';
                return;
            }
            if (this.interactionState == 'objectPanelOpen') {
                object.changeScreenEnable();
                this.interactionState = 'idle';
                return;
            }
        }, this);

        this.app.on('left_left_click', () => {
            if (this.interactionState == 'objectPanelOpen') {
                object.nextOperation(-1);
            }
        }, this);

        this.app.on('left_right_click', () => {
            if (this.interactionState == 'objectPanelOpen') {
                object.nextOperation(1);
            }
        }, this);

        this.app.on('right_trigger_click', (inputSource: pc.XrInputSource) => {
            const ray = new pc.Ray().set(inputSource.getOrigin(), inputSource.getDirection());
            const entity = getIntersectElementContainer(this.app, ray);
            if (!entity) return;
            const right = this.playerController.getControllerEntity('right');
            const container = ElementContainer.createElementByEntity(entity);
            const position = container.getPosition();
            const rotation = container.getEulerAngles();
            if (this.interactionState == 'objectManipulating') {
                right.addChild(container.entity as pc.Entity);
                container.setPosition(position);
                container.setEulerAngles(rotation);
                container.showBoundbox(true);
                container.setSelected(true)

                this.objectProxy.setObject(container.entity as pc.Entity);
                this.interactionState = 'objectSelecting';
                return;
            }
            if (this.interactionState == 'objectSelecting') {
                right.removeChild(container.entity as pc.Entity);
                container.addworld(this.app);
                container.setPosition(position);
                container.setEulerAngles(rotation);
                container.showBoundbox(false);
                container.setSelected(false);
                this.interactionState = 'objectManipulating';
                return;
            }
        }, this)
    }

    destroy(): void {

    }
}