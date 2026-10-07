import {Redis} from "ioredis";
import {ICacheProvider} from "./ICacheProvider.js";
import {getErrorMessage} from "../../../utils/error.js";

const enum EventType {
    CONNECT = "connect",
    READY = "ready",
    ERROR = "error",
}

const enum StatusType {
    WAIT = "wait",
    CLOSE = "close",
    END = "end",
}

export class RedisCacheProvider extends ICacheProvider {
    constructor(private readonly client: Redis) {
        super();
        this.setupEvents();
    }

    private setupEvents(): void {
        this.client.on(EventType.CONNECT, () => {
            console.log("[Redis] Connected.");
        });

        this.client.on(EventType.READY, () => {
            console.log("[Redis] Ready to process commands.");
        });

        this.client.on(EventType.ERROR, (err) => {
            console.error(`[Redis] Error: ${err.message}`);
        });
    }

    override async connect(): Promise<void> {
        if (this.client.status === StatusType.WAIT || this.client.status === StatusType.CLOSE) {
            await this.client.connect();
        }
    }

    override async disconnect(): Promise<void> {
        if (this.client.status !== StatusType.END) {
            await this.client.quit();
            console.log("[Redis] Disconnected.");
        }
    }

    override async get<T = unknown>(key: string): Promise<T | null> {
        try {
            const data = await this.client.get(key);
            if (!data) return null;

            return JSON.parse(data) as T;
        } catch (error: unknown) {
            console.warn(`[Redis] GET failed for key "${key}":`, getErrorMessage(error));
            return null;
        }
    }

    override async set(key: string, value: any, ttl?: number): Promise<void> {
        try {
            const data = JSON.stringify(value);
            if (ttl) {
                await this.client.set(key, data, "EX", ttl);
            }
            else {
                await this.client.set(key, data);
            }
        }
        catch (error: unknown) {
            console.error(`[Redis] SET failed for key "${key}":`, getErrorMessage(error));
        }
    }

    override async delete(key: string): Promise<void> {
        try {
            await this.client.del(key);
        }
        catch (error: unknown) {
            console.error(`[Redis DEL failed for key "${key}":]`, getErrorMessage(error));
        }
    }
}