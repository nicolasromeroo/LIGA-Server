import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  /** Devuelve el valor parseado o null si no existe / está corrupto. */
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      this.logger.warn(`Valor corrupto en cache para "${key}", se ignora`);
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Cache-aside: si la key existe la devuelve; si no, ejecuta `fn`,
   * guarda el resultado con el TTL dado y lo devuelve.
   * Si Redis falla, degrada a ejecutar `fn` sin cachear (no rompe la request).
   */
  async wrap<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      const cached = await this.getJson<T>(key);
      if (cached !== null) return cached;
    } catch (err) {
      this.logger.warn(`Fallo leyendo cache "${key}": ${String(err)}`);
    }

    const fresh = await fn();

    try {
      await this.setJson(key, fresh, ttlSeconds);
    } catch (err) {
      this.logger.warn(`Fallo escribiendo cache "${key}": ${String(err)}`);
    }

    return fresh;
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
