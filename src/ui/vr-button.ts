import * as pc from 'playcanvas';
import { VrManager } from '../app/vr-manager';

/**
 * 创建VR入口按钮
 */
export function createVrButton(vrManager: VrManager, cameraEntity: pc.Entity): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = 'vr-button';
    btn.textContent = '进入VR';
    btn.style.cssText = `
        position: absolute;
        bottom: 20%;
        left: 50%;
        transform: translateX(-50%);
        padding: 16px 32px;
        font-size: 20px;
        font-weight: bold;
        color: white;
        background: #4a90d9;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        z-index: 1000;
        transition: background 0.2s;
    `;

    // 悬停效果
    btn.onmouseover = () => {
        btn.style.background = '#5aa0e9';
    };
    btn.onmouseout = () => {
        btn.style.background = '#4a90d9';
    };

    // 点击事件
    btn.onclick = async () => {
        try {
            // 先检查XR是否支持
            if (!vrManager.isSupported()) {
                alert('WebXR不支持此浏览器。请使用支持的浏览器（如Meta Quest浏览器、Chrome等）');
                return;
            }

            // 再检查VR是否可用
            if (!vrManager.isAvailable()) {
                alert('VR不可用，请确保已连接VR设备');
                return;
            }

            // 启动VR
            await vrManager.startVr(cameraEntity);
        } catch (e) {
            console.error('启动VR失败:', e);
            alert('无法启动VR: ' + (e as Error).message);
        }
    };

    document.body.appendChild(btn);
    return btn;
}
