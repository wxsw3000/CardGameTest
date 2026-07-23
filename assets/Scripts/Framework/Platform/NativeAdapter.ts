import { sys, native } from 'cc';
import { BaseAdapter } from './BaseAdapter';
import { PlatformType } from './PlatformTypes';

export class NativeAdapter extends BaseAdapter {
    private platformType: PlatformType = PlatformType.Unknown;

    constructor() {
        super();
        if (sys.os === sys.OS.IOS) {
            this.platformType = PlatformType.iOS;
        } else if (sys.os === sys.OS.ANDROID) {
            this.platformType = PlatformType.Android;
        } else if (sys.os === sys.OS.OPENHARMONY) {
            this.platformType = PlatformType.HarmonyOS;
        } else {
            this.platformType = PlatformType.Unknown;
        }
    }

    public getPlatformType(): PlatformType {
        return this.platformType;
    }

    public isNative(): boolean {
        return true;
    }

    public vibrateShort(): void {
        // 在 Native 端可通过 JSB (native.reflection) 调用原生 Java / Objective-C / ArkTS 方法
        console.log(`[NativeAdapter:${this.platformType}] vibrateShort via native bridge`);
    }

    public vibrateLong(): void {
        console.log(`[NativeAdapter:${this.platformType}] vibrateLong via native bridge`);
    }
}
