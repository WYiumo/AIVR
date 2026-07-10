import './style.css';
import {
    Application,
    FILLMODE_FILL_WINDOW,
    RESOLUTION_AUTO,
    Mouse,
    TouchDevice,
    ElementInput
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
        touch: new TouchDevice(canvas),
        elementInput: new ElementInput(canvas)
    });

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

    // 3D 模型加载现在由用户在 VR 中通过语音面板的 send 按钮触发
}

// 启动应用
initApp().catch(console.error);
