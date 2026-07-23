export enum NetworkEnv {
    Dev = 'Dev',
    Staging = 'Staging',
    Production = 'Production'
}

export interface NetworkConfig {
    httpBaseUrl: string;
    wsBaseUrl: string;
    timeoutMs: number;
}

export class NetworkManager {
    private static _instance: NetworkManager | null = null;
    private _env: NetworkEnv = NetworkEnv.Dev;
    private _ws: WebSocket | null = null;

    private readonly envConfigs: Record<NetworkEnv, NetworkConfig> = {
        [NetworkEnv.Dev]: {
            httpBaseUrl: 'http://127.0.0.1:8080/api',
            wsBaseUrl: 'ws://127.0.0.1:8080/ws',
            timeoutMs: 10000
        },
        [NetworkEnv.Staging]: {
            httpBaseUrl: 'https://staging-api.cardgame.com/api',
            wsBaseUrl: 'wss://staging-api.cardgame.com/ws',
            timeoutMs: 10000
        },
        [NetworkEnv.Production]: {
            httpBaseUrl: 'https://api.cardgame.com/api',
            wsBaseUrl: 'wss://api.cardgame.com/ws',
            timeoutMs: 8000
        }
    };

    private constructor() {}

    public static get instance(): NetworkManager {
        if (!this._instance) {
            this._instance = new NetworkManager();
        }
        return this._instance;
    }

    public setEnvironment(env: NetworkEnv): void {
        this._env = env;
        console.log(`[NetworkManager] Environment switched to: ${env}`);
    }

    public get currentConfig(): NetworkConfig {
        return this.envConfigs[this._env];
    }

    public async request<T>(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<T> {
        const url = `${this.currentConfig.httpBaseUrl}${endpoint}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.currentConfig.timeoutMs);

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: data ? JSON.stringify(data) : undefined,
                signal: controller.signal
            });
            clearTimeout(timer);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json() as T;
        } catch (error) {
            clearTimeout(timer);
            console.error(`[NetworkManager] Request failed (${url}):`, error);
            throw error;
        }
    }
}
