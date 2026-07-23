import { _decorator, Component, Widget, UITransform, view } from 'cc';
import { PlatformManager } from '../Platform/PlatformManager';
const { ccclass, property } = _decorator;

@ccclass('SafeAreaAdapter')
export class SafeAreaAdapter extends Component {
    @property({ tooltip: '是否避让顶部系统安全区 (如 iOS 刘海/挖孔屏)' })
    public adaptTop: boolean = true;

    @property({ tooltip: '是否避让微信/抖音小程序右上角胶囊按钮' })
    public adaptMenuButton: boolean = true;

    @property({ tooltip: '是否避让底部全面屏手势条' })
    public adaptBottom: boolean = true;

    @property({ tooltip: '额外给顶部追加的外边距 (像素)' })
    public extraTopMargin: number = 0;

    start() {
        this.applySafeArea();
    }

    onEnable() {
        this.applySafeArea();
    }

    public applySafeArea(): void {
        const platform = PlatformManager.instance;
        const sysInfo = platform.getSystemInfo();
        const safeArea = platform.getSafeArea();
        const menuButton = platform.getMenuButtonBoundingClientRect();

        const visibleSize = view.getVisibleSize();
        // 计算屏幕物理像素到 Cocos 设计分辨率的转换缩放因子
        const scaleY = sysInfo.screenHeight > 0 ? visibleSize.height / sysInfo.screenHeight : 1;
        const scaleX = sysInfo.screenWidth > 0 ? visibleSize.width / sysInfo.screenWidth : 1;

        let topPadding = 0;
        let bottomPadding = 0;

        // 1. 系统顶部安全区 (刘海/挖孔屏/状态栏)
        if (this.adaptTop && safeArea.top > 0) {
            topPadding = Math.max(topPadding, safeArea.top * scaleY);
        }

        // 2. 小程序胶囊避让
        if (this.adaptMenuButton && menuButton) {
            // 胶囊按钮底部到屏幕顶部的距离转换到 UI 坐标系
            const menuButtonBottomPadding = menuButton.bottom * scaleY;
            topPadding = Math.max(topPadding, menuButtonBottomPadding);
        }

        // 3. 底部手势条避让
        if (this.adaptBottom && safeArea.bottom > 0) {
            bottomPadding = Math.max(bottomPadding, safeArea.bottom * scaleY);
        }

        topPadding += this.extraTopMargin;

        // 优先更新 Component 上的 Widget
        const widget = this.getComponent(Widget);
        if (widget) {
            if (this.adaptTop && topPadding > 0) {
                widget.top += topPadding;
                widget.isAbsoluteTop = true;
                widget.isAlignTop = true;
            }
            if (this.adaptBottom && bottomPadding > 0) {
                widget.bottom += bottomPadding;
                widget.isAbsoluteBottom = true;
                widget.isAlignBottom = true;
            }
            widget.updateAlignment();
        } else {
            // 调整节点 Y 坐标
            const transform = this.getComponent(UITransform);
            if (transform) {
                const currentPos = this.node.getPosition();
                this.node.setPosition(currentPos.x, currentPos.y - topPadding + bottomPadding, currentPos.z);
            }
        }

        console.log(`[SafeAreaAdapter] Applied topPadding: ${topPadding.toFixed(1)}px, bottomPadding: ${bottomPadding.toFixed(1)}px`);
    }
}
