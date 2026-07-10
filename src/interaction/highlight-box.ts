import * as pc from 'playcanvas';

/**
 * HighlightBox - 白色线框正方体，用于标记当前抓取的物体。
 * 边长 = AABB 最长轴的全长。
 * 作为子节点附加到目标实体，自动跟随 transform。
 */
export class HighlightBox {
    readonly entity: pc.Entity;
    private material: pc.StandardMaterial;
    private size: number = 1;

    constructor(_app: pc.Application) {
        // 白色不发光材质，启用 wireframe 渲染
        this.material = new pc.StandardMaterial();
        this.material.diffuse = new pc.Color(1, 1, 1);
        this.material.emissive = new pc.Color(1, 1, 1);  // 不受光照影响
        this.material.update();

        this.entity = new pc.Entity('HighlightBox');
        this.entity.addComponent('render', {
            type: 'box',
            material: this.material,
            castShadows: false,
            receiveShadows: false
        });

        // 关键：线框渲染样式
        const render = this.entity.render;
        if (render) {
            render.renderStyle = pc.RENDERSTYLE_WIREFRAME;
        }
    }

    /**
     * 设置边长（正方体所有边等长 = 最长轴）
     */
    setSize(size: number): void {
        if (Math.abs(this.size - size) < 1e-5) return;
        this.size = size;
        // render 组件的 box 原语大小通过 entity.setLocalScale 设置
        this.entity.setLocalScale(size, size, size);
    }

    /**
     * 销毁资源
     */
    destroy(): void {
        this.material.destroy();
        this.entity.destroy();
    }
}
