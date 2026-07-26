import * as pc from 'playcanvas';
import { FontManager } from '../manager/font';

export class ToolsWheel {
    private app: pc.Application;
    private screen: pc.Entity;
    private wheel: pc.Entity | undefined;
    private toolsname: pc.Entity | undefined;

    private Width = 200;
    private Height = 200;

    ToolsList: string[] = ['语音输入', '物体控制', '定向移动'];

    currentTool: number = 1;
    currentWheelIndex: number = 1;

    private currentAngle = 0; // 轮盘的初始旋转角度

    private fontManager: FontManager;
    private font: pc.CanvasFont | undefined;

    constructor(app: pc.Application) {
        this.app = app;
        this.screen = new pc.Entity('toosWheel');
        this.fontManager = FontManager.getInstance();
        this.font = this.fontManager.getFont('SimHei');

        this.createScreen();
        this.setToolsName(this.ToolsList[this.currentWheelIndex]);
        this.screen.enabled = false;
    }

    private createScreen() {
        this.app.root.addChild(this.screen);
        this.screen.addComponent('screen', {
            resolution: new pc.Vec2(this.Width, this.Height),
            screenSpace: false
        });
        this.screen.setLocalScale(0.0016, 0.0016, 0.002);

        this.wheel = new pc.Entity('wheel');
        this.screen.addChild(this.wheel);
        this.wheel.addComponent('element', {
            type: 'image',
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),  // 填满父容器
            pivot: new pc.Vec2(0.5, 0.5),
            width: this.Width,
            height: this.Height,
            texture: this.app.assets.find('texture:toolsWheel')?.resource
        });

        this.toolsname = new pc.Entity('toolsname');
        this.screen.addChild(this.toolsname);
        this.toolsname.addComponent('element', {
            type: 'text',
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
            pivot: new pc.Vec2(0.5, 0.5),
            width: this.Width,
            height: this.Height,
            text: '工具名称',
            font: this.font,
            fontSize: 8,
            color: new pc.Color(0.5, 0.4, 0.8, 1),
        });

        const checkbox = new pc.Entity('checkbox');
        this.screen.addChild(checkbox);
        checkbox.addComponent('element', {
            type: 'image',
            anchor: new pc.Vec4(0.5, 0.875, 0.5, 0.875),
            pivot: new pc.Vec2(0.5, 1),
            width: (this.Width * 5) / 18,  //checkbox的图片比例为5：4
            height: (this.Height * 4) / 18,
            texture: this.app.assets.find('texture:wheel_Checkbox')?.resource
        });
    }

    // order = 1 or -1
    spinning_wheel(order: number) {
        if (!this.wheel) return;
        this.changeCurrentToolIndex(order)
        const angle = this.currentAngle + order * 60; // 每次旋转60度
        if (angle < 90 && angle > -90) {
            this.wheel.setLocalEulerAngles(0, 0, angle)
            this.currentAngle = angle;
        }
        this.setToolsName(this.ToolsList[this.currentWheelIndex]);
    }

    private changeCurrentToolIndex(Variable: number) {
        const index = this.currentWheelIndex + Variable;
        if (index < 0) this.currentWheelIndex = 0;
        else if (index > this.ToolsList.length - 1) this.currentWheelIndex = this.ToolsList.length - 1;
        else this.currentWheelIndex = index;
    }

    private setToolsName(text: string) {
        if (this.toolsname && this.toolsname.element)
            this.toolsname.element.text = text;
    }

    updateCurrentTool() {
        this.currentTool = this.currentWheelIndex;
    }

    getScreenEntity(): pc.Entity {
        return this.screen;
    }

    changeScreenEnable(): void {
        this.screen.enabled = !this.screen.enabled;
    }

    isScreenEnable(): boolean {
        return this.screen.enabled;
    }
}