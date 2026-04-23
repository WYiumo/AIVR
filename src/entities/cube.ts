import * as pc from 'playcanvas';

/**
 * 立方体配置
 */
export interface CubeConfig {
    /** 位置 */
    position: pc.Vec3;
    /** 缩放 */
    scale: pc.Vec3;
    /** 颜色 */
    color: pc.Color;
}

/**
 * 蓝色立方体
 * 使用StandardMaterial实现简单的蓝色立方体
 */
export class Cube {
    readonly entity: pc.Entity;
    private material: pc.StandardMaterial;

    constructor(
        app: pc.Application,
        config: Partial<CubeConfig> = {}
    ) {
        const {
            position = new pc.Vec3(0, 0.5, 0),
            scale = new pc.Vec3(1, 1, 1),
            color = new pc.Color(0.0, 0.3, 1.0)  // 蓝色
        } = config;

        // 创建实体
        this.entity = new pc.Entity('cube');
        this.entity.setPosition(position);
        this.entity.setLocalScale(scale);

        // 创建材质
        this.material = new pc.StandardMaterial();
        this.material.diffuse = color;
        this.material.update();

        // 添加渲染组件
        this.entity.addComponent('render', {
            type: 'box',
            material: this.material
        });

        app.root.addChild(this.entity);
    }

    /**
     * 设置颜色
     */
    setColor(color: pc.Color): void {
        this.material.diffuse = color;
        this.material.update();
    }

    /**
     * 获取颜色
     */
    getColor(): pc.Color {
        return this.material.diffuse.clone();
    }

    /**
     * 设置位置
     */
    setPosition(position: pc.Vec3): void {
        this.entity.setPosition(position);
    }

    /**
     * 设置缩放
     */
    setScale(scale: pc.Vec3): void {
        this.entity.setLocalScale(scale);
    }

    /**
     * 获取位置
     */
    getPosition(): pc.Vec3 {
        return this.entity.getPosition().clone();
    }

    /**
     * 获取缩放
     */
    getScale(): pc.Vec3 {
        return this.entity.getLocalScale().clone();
    }

    /**
     * 销毁
     */
    destroy(): void {
        this.material.destroy();
        this.entity.destroy();
    }
}
