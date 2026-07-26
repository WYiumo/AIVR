import * as pc from 'playcanvas';
import { PAD, JoySTICK, IsPadButtonPressed } from '../utils';


export class XrInputDetector {
    private app: pc.Application;
    private preState: Map<string, boolean> = new Map();
    private THRESHOLD: number = 0.8;

    constructor(app: pc.Application) {
        this.app = app;
        for (const button of Object.keys(PAD)) {
            this.preState.set(button.toString(), false);
        }
        for (const stick of Object.keys(JoySTICK)) {
            this.preState.set(stick.toString(), false);
        }
    }

    update(_dt: number): void {
        const inputSources = this.app.xr?.input?.inputSources ?? [];
        for (const inputSource of inputSources) {
            switch (inputSource.handedness) {
                case 'left': {
                    this.ButtonDetectorFn(inputSource, PAD.L_Trigger, 'L_Trigger', 'left_trigger_click');
                    this.ButtonDetectorFn(inputSource, PAD.L_Grip, 'L_Grip', 'left_grip_click');
                    this.ButtonDetectorFn(inputSource, PAD.L_X, 'L_X', 'left_x_click');
                    this.ButtonDetectorFn(inputSource, PAD.L_Y, 'L_Y', 'left_y_click');

                    this.AaxesExceedDetectorFn(inputSource, pc.XRPAD_STICK_X, this.THRESHOLD, JoySTICK.L_LEFT, 'L_LEFT', 'left_left_click');
                    this.AaxesExceedDetectorFn(inputSource, pc.XRPAD_STICK_X, this.THRESHOLD, JoySTICK.L_RIGHT, 'L_RIGHT', 'left_right_click');
                    this.AaxesExceedDetectorFn(inputSource, pc.XRPAD_STICK_Y, this.THRESHOLD, JoySTICK.L_UP, 'L_UP', 'left_up_click');
                    this.AaxesExceedDetectorFn(inputSource, pc.XRPAD_STICK_Y, this.THRESHOLD, JoySTICK.L_DOWN, 'L_DOWN', 'left_down_click');
                    break;
                }
                case 'right': {
                    this.ButtonDetectorFn(inputSource, PAD.R_Trigger, 'R_Trigger', 'right_trigger_click');
                    this.ButtonDetectorFn(inputSource, PAD.R_Grip, 'R_Grip', 'right_grip_click');
                    this.ButtonDetectorFn(inputSource, PAD.R_A, 'R_A', 'right_a_click');
                    this.ButtonDetectorFn(inputSource, PAD.R_B, 'R_B', 'right_b_click');

                    this.AaxesExceedDetectorFn(inputSource, pc.XRPAD_STICK_X, this.THRESHOLD, JoySTICK.R_LEFT, 'R_LEFT', 'right_left_click');
                    this.AaxesExceedDetectorFn(inputSource, pc.XRPAD_STICK_X, this.THRESHOLD, JoySTICK.R_RIGHT, 'R_RIGHT', 'right_right_click');
                    this.AaxesExceedDetectorFn(inputSource, pc.XRPAD_STICK_Y, this.THRESHOLD, JoySTICK.R_UP, 'R_UP', 'right_up_click');
                    this.AaxesExceedDetectorFn(inputSource, pc.XRPAD_STICK_Y, this.THRESHOLD, JoySTICK.R_DOWN, 'R_DOWN', 'right_down_click');
                    break;
                }
                default: break;
            }
        }
    }

    private ButtonDetectorFn(inputSource: pc.XrInputSource, button: number, buttonName: string, eventName: string) {
        const pressed = IsPadButtonPressed(inputSource, button);
        if (pressed && !this.preState.get(buttonName)) {
            this.app.fire(eventName, inputSource);
            // console.log(eventName);
        }
        this.preState.set(buttonName, pressed);
    }

    //Gets the values from analog axes present on the GamePad. Values are between -1 and 1.
    //axes[2]=stick X, axes[3]=stick Y
    private AaxesExceedDetectorFn(inputSource: pc.XrInputSource, axis: number, threshold: number, stickDirection: number, stickName: string, eventName: string) {
        const gamepad = inputSource.gamepad;
        if (!gamepad?.axes) return;
        const stick = gamepad.axes[axis];
        const exceed = stickDirection == 1
            ? stick > threshold
            : stick < -threshold;
        if (exceed && !this.preState.get(stickName)) {
            this.app.fire(eventName, inputSource);
            // console.log(eventName);
        }
        this.preState.set(stickName, exceed);
    }
}