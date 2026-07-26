import * as pc from 'playcanvas'
import { FontManager } from '../manager/font';

export class ObjectPanel {
    private app: pc.Application;
    private screen: pc.Entity;
    private checkbox: pc.Entity | undefined;
    private operationName: pc.Entity | undefined;

    private Width = 600;
    private Height = 100;

    OperationList: string[] = ['移动', '旋转', '缩放', '组合', '复制', '删除'];

    currentOperation: number = 0;
    currentOperationIndex: number = 0;

    private checkboxpos: number = 0;
    posInitial: number = (9 * this.Width) / 2048;
    posIncrement: number = (338 * this.Width) / 2048;
    posMaximum: number = this.posInitial + this.posIncrement * (this.OperationList.length - 1);

    private fontManager: FontManager;
    private font: pc.CanvasFont | undefined;

    constructor(app: pc.Application) {
        this.app = app;
        this.screen = new pc.Entity('ObjectPanel');
        this.fontManager = FontManager.getInstance();
        this.font = this.fontManager.getFont('SimHei');

        this.createScreen();
        this.setOperationName(this.OperationList[this.currentOperationIndex])
        this.screen.enabled = false;
    }

    private createScreen() {
        this.app.root.addChild(this.screen);
        this.screen.addComponent('screen', {
            resolution: new pc.Vec2(this.Width, this.Height),
            screenSpace: false
        });
        this.screen.setLocalScale(0.0012, 0.0012, 0.1);

        const panel = new pc.Entity('Panel');
        this.screen.addChild(panel);
        panel.addComponent('element', {
            type: 'image',
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
            pivot: new pc.Vec2(0.5, 0.5),
            width: this.Width,
            height: this.Height,
            texture: this.app.assets.find('texture:object_control_panel')?.resource
        });

        this.checkbox = new pc.Entity('Checkbox');
        this.screen.addChild(this.checkbox);
        this.checkbox.addComponent('element', {
            type: 'image',
            anchor: new pc.Vec4(0, 0.5, 0, 0.5),
            pivot: new pc.Vec2(0, 0.5),
            width: this.Width / 6,
            height: this.Height,
            texture: this.app.assets.find('texture:object_control_checkbox')?.resource
        });
        this.checkbox.setLocalPosition(this.posInitial, 0, 0);

        this.operationName = new pc.Entity('OperationName');
        this.screen.addChild(this.operationName);
        this.operationName.addComponent('element', {
            type: 'text',
            anchor: new pc.Vec4(0.5, 1, 0.5, 1),
            pivot: new pc.Vec2(0.5, 0),
            autoWidth: true,
            autoHeight: false,
            height: this.Height / 2,
            text: '操作名称',
            font: this.font,
            fontSize: 20,
            color: new pc.Color(0.5, 0.4, 0.8, 1),
        });
    }

    private setOperationName(text: string): void {
        if (this.operationName && this.operationName.element) {
            this.operationName.element.text = text;
        }
    }

    // order = 1 or -1;
    nextOperation(order: number) {
        if (!this.checkbox) return;
        this.changeCurrentOperationIndex(order);

        const pos = this.checkboxpos + order * this.posIncrement;
        if (pos < 0) this.checkboxpos = this.posMaximum;
        else if (pos > this.posMaximum) this.checkboxpos = this.posInitial;
        else this.checkboxpos = pos;

        this.checkbox.setLocalPosition(this.checkboxpos, 0, 0);
        this.setOperationName(this.OperationList[this.currentOperationIndex]);
    }

    private changeCurrentOperationIndex(variable: number) {
        const index = this.currentOperationIndex + variable;
        if (index < 0) this.currentOperationIndex = this.OperationList.length - 1;
        else if (index >= this.OperationList.length) this.currentOperationIndex = 0;
        else this.currentOperationIndex = index;
    }

    updatecurrentOperation() {
        this.currentOperation = this.currentOperationIndex;
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