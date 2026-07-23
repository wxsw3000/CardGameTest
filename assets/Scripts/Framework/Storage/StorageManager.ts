import { sys } from 'cc';
import { PlatformManager } from '../Platform/PlatformManager';

export class StorageManager {
    private static _instance: StorageManager | null = null;
    private static readonly KEY_PREFIX = 'cardgame_';

    private constructor() {}

    public static get instance(): StorageManager {
        if (!this._instance) {
            this._instance = new StorageManager();
        }
        return this._instance;
    }

    private getFullKey(key: string): string {
        return StorageManager.KEY_PREFIX + key;
    }

    public setItem(key: string, value: any): boolean {
        const fullKey = this.getFullKey(key);
        try {
            const dataStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
            sys.localStorage.setItem(fullKey, dataStr);
            return true;
        } catch (e) {
            console.error(`[StorageManager] Failed to setItem (${key}):`, e);
            return false;
        }
    }

    public getItem<T>(key: string, defaultValue: T | null = null): T | null {
        const fullKey = this.getFullKey(key);
        try {
            const str = sys.localStorage.getItem(fullKey);
            if (str === null || str === undefined || str === '') {
                return defaultValue;
            }
            try {
                return JSON.parse(str) as T;
            } catch {
                return str as unknown as T;
            }
        } catch (e) {
            console.error(`[StorageManager] Failed to getItem (${key}):`, e);
            return defaultValue;
        }
    }

    public removeItem(key: string): void {
        const fullKey = this.getFullKey(key);
        try {
            sys.localStorage.removeItem(fullKey);
        } catch (e) {
            console.error(`[StorageManager] Failed to removeItem (${key}):`, e);
        }
    }

    public clearAll(): void {
        try {
            sys.localStorage.clear();
        } catch (e) {
            console.error('[StorageManager] Failed to clear localStorage:', e);
        }
    }
}
