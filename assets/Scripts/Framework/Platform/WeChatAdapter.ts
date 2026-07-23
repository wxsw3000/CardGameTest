import { view } from 'cc';
import { BaseAdapter } from './BaseAdapter';
import { PlatformType, SafeAreaRect, MenuButtonRect, SystemInfo, LoginResult } from './PlatformTypes';

export class WeChatAdapter extends BaseAdapter {
    private get wx(): any {
        return (window as any).wx;
    }

    public getPlatformType(): PlatformType {
        return PlatformType.WeChat;
    }

    public isMiniGame(): boolean {
        return true;
    }

    public getSystemInfo(): SystemInfo {
        const base = super.getSystemInfo();
        if (this.wx && this.wx.getSystemInfoSync) {
            try {
                const info = this.wx.getSystemInfoSync();
                base.brand = info.brand || base.brand;
                base.model = info.model || base.model;
                base.pixelRatio = info.pixelRatio || base.pixelRatio;
                base.screenWidth = info.screenWidth || base.screenWidth;
                base.screenHeight = info.screenHeight || base.screenHeight;
                base.windowWidth = info.windowWidth || base.windowWidth;
                base.windowHeight = info.windowHeight || base.windowHeight;
                base.statusBarHeight = info.statusBarHeight || 0;
                base.language = info.language || base.language;
                base.system = info.system || base.system;
            } catch (e) {
                console.warn('[WeChatAdapter] getSystemInfoSync failed', e);
            }
        }
        return base;
    }

    public getSafeArea(): SafeAreaRect {
        if (this.wx && this.wx.getSystemInfoSync) {
            try {
                const info = this.wx.getSystemInfoSync();
                if (info.safeArea) {
                    const sa = info.safeArea;
                    return {
                        top: sa.top,
                        bottom: info.screenHeight - sa.bottom,
                        left: sa.left,
                        right: info.screenWidth - sa.right,
                        width: sa.width,
                        height: sa.height
                    };
                }
            } catch (e) {
                console.warn('[WeChatAdapter] safeArea query error:', e);
            }
        }
        return super.getSafeArea();
    }

    public getMenuButtonBoundingClientRect(): MenuButtonRect | null {
        if (this.wx && this.wx.getMenuButtonBoundingClientRect) {
            try {
                const rect = this.wx.getMenuButtonBoundingClientRect();
                if (rect) {
                    return {
                        top: rect.top,
                        bottom: rect.bottom,
                        left: rect.left,
                        right: rect.right,
                        width: rect.width,
                        height: rect.height
                    };
                }
            } catch (e) {
                console.warn('[WeChatAdapter] getMenuButtonBoundingClientRect error:', e);
            }
        }
        return null;
    }

    public vibrateShort(): void {
        if (this.wx && this.wx.vibrateShort) {
            this.wx.vibrateShort({ type: 'light' });
        }
    }

    public vibrateLong(): void {
        if (this.wx && this.wx.vibrateLong) {
            this.wx.vibrateLong();
        }
    }

    public login(): Promise<LoginResult> {
        return new Promise((resolve) => {
            if (!this.wx || !this.wx.login) {
                resolve({ success: false, errMsg: 'wx.login unavailable' });
                return;
            }
            this.wx.login({
                success: (res: any) => {
                    if (res && res.code) {
                        resolve({ success: true, code: res.code });
                    } else {
                        resolve({ success: false, errMsg: 'No code returned' });
                    }
                },
                fail: (err: any) => {
                    resolve({ success: false, errMsg: err ? err.errMsg : 'wx.login failed' });
                }
            });
        });
    }

    public async setKeepScreenOn(keep: boolean): Promise<boolean> {
        if (this.wx && this.wx.setKeepScreenOn) {
            return new Promise((resolve) => {
                this.wx.setKeepScreenOn({
                    keepScreenOn: keep,
                    success: () => resolve(true),
                    fail: () => resolve(false)
                });
            });
        }
        return false;
    }

    public shareAppMessage(options?: { title?: string; imageUrl?: string; query?: string }): void {
        if (this.wx && this.wx.shareAppMessage) {
            this.wx.shareAppMessage({
                title: options?.title || '一起来战斗吧！',
                imageUrl: options?.imageUrl || '',
                query: options?.query || ''
            });
        }
    }
}
