import { sys, view } from 'cc';
import { IPlatformAdapter } from './IPlatformAdapter';
import { PlatformType, SafeAreaRect, MenuButtonRect, SystemInfo, LoginResult } from './PlatformTypes';

export abstract class BaseAdapter implements IPlatformAdapter {
    abstract getPlatformType(): PlatformType;

    public isMiniGame(): boolean {
        return false;
    }

    public isNative(): boolean {
        return sys.isNative;
    }

    public getSystemInfo(): SystemInfo {
        const visibleSize = view.getVisibleSize();
        return {
            platform: this.getPlatformType(),
            brand: 'Generic',
            model: 'Generic',
            pixelRatio: window.devicePixelRatio || 1,
            screenWidth: visibleSize.width,
            screenHeight: visibleSize.height,
            windowWidth: visibleSize.width,
            windowHeight: visibleSize.height,
            statusBarHeight: 0,
            language: sys.language || 'zh',
            system: sys.os || 'Unknown'
        };
    }

    public getSafeArea(): SafeAreaRect {
        // Cocos Creator 提供了 sys.getSafeAreaRect() 方法返回 Rect (x, y, width, height)
        const safeRect = sys.getSafeAreaRect();
        const visibleSize = view.getVisibleSize();
        
        if (safeRect && safeRect.width > 0 && safeRect.height > 0) {
            const left = safeRect.x;
            const bottom = safeRect.y;
            const width = safeRect.width;
            const height = safeRect.height;
            const right = visibleSize.width - (left + width);
            const top = visibleSize.height - (bottom + height);

            return { top, bottom, left, right, width, height };
        }

        // 默认全屏无边距
        return {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            width: visibleSize.width,
            height: visibleSize.height
        };
    }

    public getMenuButtonBoundingClientRect(): MenuButtonRect | null {
        // 非小程序平台默认无微信/抖音胶囊按钮
        return null;
    }

    public vibrateShort(): void {
        console.log('[BaseAdapter] vibrateShort fallback');
    }

    public vibrateLong(): void {
        console.log('[BaseAdapter] vibrateLong fallback');
    }

    public async login(): Promise<LoginResult> {
        console.log('[BaseAdapter] mock login success');
        return { success: true, code: 'mock_guest_token_' + Date.now() };
    }

    public async setKeepScreenOn(keep: boolean): Promise<boolean> {
        return true;
    }

    public shareAppMessage(options?: { title?: string; imageUrl?: string; query?: string }): void {
        console.log('[BaseAdapter] shareAppMessage:', options);
    }
}
