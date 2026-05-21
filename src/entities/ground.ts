import * as pc from 'playcanvas';

/**
 * 地面配置
 */
export interface GroundConfig {
    /** 地面大小（缩放值） */
    size?: number;
    /** 地面颜色 */
    color?: pc.Color;
    /** 是否接收阴影 */
    receiveShadows?: boolean;
}

/**
 * 地面类
 * 创建一个平面地面，带有颜色材质
 */
export class Ground {
    readonly entity: pc.Entity;
    private material: pc.StandardMaterial;

    constructor(app: pc.Application, config: GroundConfig = {}) {
        const {
            size = 100,
            color = new pc.Color(0.35, 0.35, 0.4),
            receiveShadows = true
        } = config;

        // 创建材质
        this.material = new pc.StandardMaterial();
        this.material.diffuse = color;
        this.material.update();

        // 创建地面实体
        this.entity = new pc.Entity('ground');

        // 设置位置和缩放
        this.entity.setPosition(0, 0, 0);
        this.entity.setLocalScale(size, 1, size);

        // 添加渲染组件
        this.entity.addComponent('render', {
            type: 'plane',
            material: this.material,
            receiveShadows: receiveShadows
        });

        // 添加到场景
        app.root.addChild(this.entity);
    }

    /**
     * 设置地面颜色
     */
    setColor(color: pc.Color): void {
        this.material.diffuse = color;
        this.material.update();
    }

    /**
     * 获取地面颜色
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
    setSize(size: number): void {
        this.entity.setLocalScale(size, 1, size);
    }

    /**
     * 销毁
     */
    destroy(): void {
        this.material.destroy();
        this.entity.destroy();
    }
}
