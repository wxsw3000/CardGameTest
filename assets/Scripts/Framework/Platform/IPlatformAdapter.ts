import { PlatformType, SafeAreaRect, MenuButtonRect, SystemInfo, LoginResult } from './PlatformTypes';

export interface IPlatformAdapter {
    getPlatformType(): PlatformType;
    isMiniGame(): boolean;
    isNative(): boolean;

    getSystemInfo(): SystemInfo;
    getSafeArea(): SafeAreaRect;
    getMenuButtonBoundingClientRect(): MenuButtonRect | null;

    vibrateShort(): void;
    vibrateLong(): void;

    login(): Promise<LoginResult>;
    setKeepScreenOn(keep: boolean): Promise<boolean>;

    shareAppMessage(options?: { title?: string; imageUrl?: string; query?: string }): void;
}
