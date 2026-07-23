import { assetManager, Asset, AssetManager, Prefab, SpriteFrame, AudioClip } from 'cc';

export class ResManager {
    private static _instance: ResManager | null = null;
    private _loadedBundles: Map<string, AssetManager.Bundle> = new Map();

    private constructor() {}

    public static get instance(): ResManager {
        if (!this._instance) {
            this._instance = new ResManager();
        }
        return this._instance;
    }

    /**
     * 动态预加载 / 加载 Asset Bundle
     */
    public loadBundle(bundleName: string): Promise<AssetManager.Bundle> {
        return new Promise((resolve, reject) => {
            if (this._loadedBundles.has(bundleName)) {
                resolve(this._loadedBundles.get(bundleName)!);
                return;
            }

            assetManager.loadBundle(bundleName, (err, bundle) => {
                if (err) {
                    console.error(`[ResManager] Load bundle failed (${bundleName}):`, err);
                    reject(err);
                    return;
                }
                this._loadedBundles.set(bundleName, bundle);
                console.log(`[ResManager] Bundle loaded: ${bundleName}`);
                resolve(bundle);
            });
        });
    }

    /**
     * 从指定 Bundle 加载单个资源 (当 bundleName 为 'resources' 时自动使用默认 resources 路径)
     */
    public loadAsset<T extends Asset>(bundleName: string, path: string, type: new (...args: any[]) => T): Promise<T> {
        return new Promise(async (resolve, reject) => {
            try {
                if (bundleName === 'resources') {
                    resources.load(path, type, (err, asset) => {
                        if (err) {
                            console.error(`[ResManager] Load from resources failed (${path}):`, err);
                            reject(err);
                            return;
                        }
                        resolve(asset as T);
                    });
                    return;
                }
                const bundle = await this.loadBundle(bundleName);
                bundle.load(path, type, (err, asset) => {
                    if (err) {
                        console.error(`[ResManager] Load asset failed (${bundleName}/${path}):`, err);
                        reject(err);
                        return;
                    }
                    resolve(asset as T);
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * 显式释放资源与降低小程序/App内存占用
     */
    public releaseAsset(asset: Asset): void {
        if (asset) {
            assetManager.releaseAsset(asset);
        }
    }

    /**
     * 卸载 Asset Bundle
     */
    public removeBundle(bundleName: string): void {
        const bundle = this._loadedBundles.get(bundleName);
        if (bundle) {
            bundle.releaseAll();
            assetManager.removeBundle(bundle);
            this._loadedBundles.delete(bundleName);
            console.log(`[ResManager] Bundle removed: ${bundleName}`);
        }
    }
}
