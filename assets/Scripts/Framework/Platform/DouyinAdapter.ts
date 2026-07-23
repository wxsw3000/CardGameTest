import { BaseAdapter } from './BaseAdapter';
import { PlatformType, SafeAreaRect, MenuButtonRect, SystemInfo, LoginResult } from './PlatformTypes';

export class DouyinAdapter extends BaseAdapter {
    private get tt(): any {
        return (window as any).tt;
    }

    public getPlatformType(): PlatformType {
        return PlatformType.Douyin;
    }

    public isMiniGame(): boolean {
        return true;
    }

    public getSystemInfo(): SystemInfo {
        const base = super.getSystemInfo();
        if (this.tt && this.tt.getSystemInfoSync) {
            try {
                const info = this.tt.getSystemInfoSync();
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
                console.warn('[DouyinAdapter] getSystemInfoSync failed', e);
            }
        }
        return base;
    }

    public getSafeArea(): SafeAreaRect {
        if (this.tt && this.tt.getSystemInfoSync) {
            try {
                const info = this.tt.getSystemInfoSync();
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
                console.warn('[DouyinAdapter] safeArea query error:', e);
            }
        }
        return super.getSafeArea();
    }

    public getMenuButtonBoundingClientRect(): MenuButtonRect | null {
        if (this.tt && this.tt.getMenuButtonBoundingClientRect) {
            try {
                const rect = this.tt.getMenuButtonBoundingClientRect();
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
                console.warn('[DouyinAdapter] getMenuButtonBoundingClientRect error:', e);
            }
        }
        return null;
    }

    public vibrateShort(): void {
        if (this.tt && this.tt.vibrateShort) {
            this.tt.vibrateShort();
        }
    }

    public vibrateLong(): void {
        if (this.tt && this.tt.vibrateLong) {
            this.tt.vibrateLong();
        }
    }

    public login(): Promise<LoginResult> {
        return new Promise((resolve) => {
            if (!this.tt || !this.tt.login) {
                resolve({ success: false, errMsg: 'tt.login unavailable' });
                return;
            }
            this.tt.login({
                force: false,
                success: (res: any) => {
                    if (res && res.code) {
                        resolve({ success: true, code: res.code });
                    } else {
                        resolve({ success: false, errMsg: 'No code returned' });
                    }
                },
                fail: (err: any) => {
                    resolve({ success: false, errMsg: err ? err.errMsg : 'tt.login failed' });
                }
            });
        });
    }

    public async setKeepScreenOn(keep: boolean): Promise<boolean> {
        if (this.tt && this.tt.setKeepScreenOn) {
            return new Promise((resolve) => {
                this.tt.setKeepScreenOn({
                    keepScreenOn: keep,
                    success: () => resolve(true),
                    fail: () => resolve(false)
                });
            });
        }
        return false;
    }
}
