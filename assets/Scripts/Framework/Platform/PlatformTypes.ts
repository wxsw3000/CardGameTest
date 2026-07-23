export enum PlatformType {
    Web = 'Web',
    WeChat = 'WeChat',
    Douyin = 'Douyin',
    iOS = 'iOS',
    Android = 'Android',
    HarmonyOS = 'HarmonyOS',
    Unknown = 'Unknown'
}

export interface SafeAreaRect {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
}

export interface MenuButtonRect {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
}

export interface SystemInfo {
    platform: PlatformType;
    brand: string;
    model: string;
    pixelRatio: number;
    screenWidth: number;
    screenHeight: number;
    windowWidth: number;
    windowHeight: number;
    statusBarHeight: number;
    language: string;
    system: string;
}

export interface LoginResult {
    success: boolean;
    code?: string;
    errMsg?: string;
}
