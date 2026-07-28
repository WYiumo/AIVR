import * as pc from 'playcanvas';
import { getWorldAabb } from '../utils';

export class ElementContainer {
    private elemententity: pc.Entity | undefined;
    private box: pc.Entity | undefined;
    static boxmaterial = new pc.StandardMaterial();

    constructor() { }

    static createElement(app: pc.Application): ElementContainer {
        const Container = new ElementContainer();
        Container.elemententity = new pc.Entity('elementContainer');
        Container.elemententity.tags.add('ElementContainer');
        Container.box = new pc.Entity('boundbox');
        Container.elemententity.addChild(Container.box);

        ElementContainer.boxmaterial.diffuse = new pc.Color(1, 1, 1);
        ElementContainer.boxmaterial.emissive = new pc.Color(1, 1, 1);
        ElementContainer.boxmaterial.update();

        Container.box.addComponent('render', {
            type: 'box',
            material: ElementContainer.boxmaterial,
            castShadows: false,
            receiveShadows: false
        });

        if (Container.box.render) Container.box.render.renderStyle = pc.RENDERSTYLE_WIREFRAME
        Container.box.enabled = false;

        const world = app.root.findByName('world') as pc.Entity;
        world.addChild(Container.elemententity);
        return Container;
    }

    static createElementByEntity(Entity: pc.Entity): ElementContainer {
        const Container = new ElementContainer();
        Container.elemententity = Entity;
        Container.box = Entity.findByName('boundbox') as pc.Entity;

        return Container;
    }

    get entity(): pc.Entity | undefined {
        if (this.elemententity)
            return this.elemententity;
    }

    addworld(app: pc.Application): void {
        const world = app.root.findByName('world') as pc.Entity;
        if (this.elemententity)
            world.addChild(this.elemententity);
    }

    addElement(element: pc.Entity): void {
        if (this.elemententity)
            this.elemententity.addChild(element);
        element.setLocalPosition(0, 0, 0);
        const aabb = getWorldAabb(element);
        if (aabb) this.setboundboxSize(aabb);
    }

    moveElement(element: pc.Entity): void {
        if (this.elemententity)
            this.elemententity.removeChild(element);
    }

    getPosition(){
        if (this.elemententity)
            return this.elemententity.getPosition();
        return new pc.Vec3(0, 0, 0);
    }

    getEulerAngles(){
        if (this.elemententity)
            return this.elemententity.getEulerAngles();
        return new pc.Vec3(0, 0, 0);
    }

    setPosition(position: pc.Vec3): void {
        if (this.elemententity)
            this.elemententity.setPosition(position);
    }
    setEulerAngles(eulerAngles: pc.Vec3): void {
        if (this.elemententity)
            this.elemententity.setEulerAngles(eulerAngles);
    }

    isSelected(): boolean{
        if (this.elemententity)
            return this.elemententity.tags.has('Selected');
        return false;
    }

    setSelected(flag: boolean): void {
        if (this.elemententity){
            if (flag) this.elemententity.tags.add('Selected');
            else this.elemententity.tags.remove('Selected');
        }
    }

    showBoundbox(flag: boolean): void {
        if (this.box)
            this.box.enabled = flag;
    }

    private setboundboxSize(aabb: pc.BoundingBox): void {
        if (!this.box) return;
        let size = 1;
        if (aabb) {
            const hx = aabb.halfExtents.x * 2;
            const hy = aabb.halfExtents.y * 2;
            const hz = aabb.halfExtents.z * 2;
            size = Math.max(hx, hy, hz);
        }
        this.box.setLocalScale(size, size, size);;
    }
}
