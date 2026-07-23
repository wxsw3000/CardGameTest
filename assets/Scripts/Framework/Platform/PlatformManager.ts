import { sys } from 'cc';
import { IPlatformAdapter } from './IPlatformAdapter';
import { WebAdapter } from './WebAdapter';
import { WeChatAdapter } from './WeChatAdapter';
import { DouyinAdapter } from './DouyinAdapter';
import { NativeAdapter } from './NativeAdapter';
import { PlatformType, SafeAreaRect, MenuButtonRect, SystemInfo, LoginResult } from './PlatformTypes';

export class PlatformManager {
    private static _instance: PlatformManager | null = null;
    private _adapter: IPlatformAdapter;

    private constructor() {
        this._adapter = this.autoDetectAdapter();
        console.log(`[PlatformManager] Initialized with platform: ${this._adapter.getPlatformType()}`);
    }

    public static get instance(): PlatformManager {
        if (!this._instance) {
            this._instance = new PlatformManager();
        }
        return this._instance;
    }

    private autoDetectAdapter(): IPlatformAdapter {
        // 1. 微信小游戏平台检测
        if (sys.platform === sys.Platform.WECHAT_GAME || (typeof window !== 'undefined' && (window as any).wx && (window as any).wx.getSystemInfoSync)) {
            return new WeChatAdapter();
        }

        // 2. 抖音/字节小游戏平台检测
        if (sys.platform === sys.Platform.BYTEDANCE_MINI_GAME || (typeof window !== 'undefined' && (window as any).tt && (window as any).tt.getSystemInfoSync)) {
            return new DouyinAdapter();
        }

        // 3. 原生 App 平台检测 (iOS / Android / 鸿蒙)
        if (sys.isNative) {
            return new NativeAdapter();
        }

        // 4. Web 浏览器 / 编辑器预览默认回退
        return new WebAdapter();
    }

    public get adapter(): IPlatformAdapter {
        return this._adapter;
    }

    public getPlatformType(): PlatformType {
        return this._adapter.getPlatformType();
    }

    public isMiniGame(): boolean {
        return this._adapter.isMiniGame();
    }

    public isNative(): boolean {
        return this._adapter.isNative();
    }

    public getSystemInfo(): SystemInfo {
        return this._adapter.getSystemInfo();
    }

    public getSafeArea(): SafeAreaRect {
        return this._adapter.getSafeArea();
    }

    public getMenuButtonBoundingClientRect(): MenuButtonRect | null {
        return this._adapter.getMenuButtonBoundingClientRect();
    }

    public vibrateShort(): void {
        this._adapter.vibrateShort();
    }

    public vibrateLong(): void {
        this._adapter.vibrateLong();
    }

    public login(): Promise<LoginResult> {
        return this._adapter.login();
    }

    public setKeepScreenOn(keep: boolean): Promise<boolean> {
        return this._adapter.setKeepScreenOn(keep);
    }

    public shareAppMessage(options?: { title?: string; imageUrl?: string; query?: string }): void {
        this._adapter.shareAppMessage(options);
    }
}
