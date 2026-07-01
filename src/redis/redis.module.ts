import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT, RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('Redis');
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';

        const client = new Redis(url, {
          // El cache es opcional: si Redis no está, la app degrada sola.
          enableOfflineQueue: false, // los comandos fallan rápido si no hay conexión
          maxRetriesPerRequest: 1,
          // Reintenta reconectar con backoff creciente y silencioso (sin spamear).
          retryStrategy: (times) => Math.min(times * 2000, 30_000),
          reconnectOnError: () => false,
        });

        // Sin este listener, ioredis loguea "Unhandled error event" en cada
        // intento fallido. Avisamos una sola vez y dejamos que reconecte solo.
        let warned = false;
        client.on('error', (err: any) => {
          if (!warned) {
            warned = true;
            logger.warn(
              `Redis no disponible (${err?.code || err?.message}). El cache queda deshabilitado; la app sigue funcionando. Levantá Redis para habilitarlo.`,
            );
          }
        });
        client.on('ready', () => {
          warned = false;
          logger.log('Conectado a Redis: cache habilitado.');
        });

        return client;
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
