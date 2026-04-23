import './style.css';
import {
    Application,
    FILLMODE_FILL_WINDOW,
    RESOLUTION_AUTO,
    Mouse,
    TouchDevice,
    GSplatHandler,
    Vec3
} from 'playcanvas';
import { App } from './app';

/**
 * 初始化AIVR应用
 */
async function initApp() {
    // 获取canvas
    const canvas = document.getElementById('application-canvas') as HTMLCanvasElement;
    if (!canvas) {
        throw new Error('Canvas not found');
    }

    // 创建应用（使用Application而非AppBase，它会正确初始化XR）
    const app = new Application(canvas, {
        mouse: new Mouse(canvas),
        touch: new TouchDevice(canvas)
    });

    // 注册gsplat处理器（确保splat加载功能可用）
    app.loader.addHandler('gsplat', new GSplatHandler(app));

    // 设置canvas填充模式
    app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(RESOLUTION_AUTO);

    // 窗口大小变化时调整canvas
    const resize = () => app.resizeCanvas();
    window.addEventListener('resize', resize);
    app.once('destroy', () => {
        window.removeEventListener('resize', resize);
    });

    // 创建AIVR应用实例
    const aivrApp = new App(app, {
        xrCompatible: true,
        debug: true
    });

    // 初始化应用
    await aivrApp.init();

    // 启动应用
    app.start();

    // 每帧更新
    app.on('update', (dt: number) => {
        aivrApp.update(dt);
    });

    console.log('AIVR 应用已启动');

    // 测试：加载示例splat文件
    setTimeout(async () => {
        try {
            // 文件位于 D:\Study\project\playcanvas\AIVR\public\canonical.ply
            await aivrApp.loadSplat(
                '/canonical.ply',
                new Vec3(0, 2, 2),
                new Vec3(1, 1, -1)
            );
            await aivrApp.loadSplat(
                '/room.ply',
                new Vec3(0, 4, 0),
                new Vec3(1, -1, 1)
            );

            console.log('Splat加载成功');
        } catch (e) {
            console.error('Splat加载失败:', e);
        }
    }, 1000);
}

// 启动应用
initApp().catch(console.error);
