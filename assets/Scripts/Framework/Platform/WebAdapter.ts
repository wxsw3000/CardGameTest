import { BaseAdapter } from './BaseAdapter';
import { PlatformType } from './PlatformTypes';

export class WebAdapter extends BaseAdapter {
    public getPlatformType(): PlatformType {
        return PlatformType.Web;
    }

    public vibrateShort(): void {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(15);
        }
    }

    public vibrateLong(): void {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(400);
        }
    }
}
