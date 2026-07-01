import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '../redis/redis.service';
import { SportdbCountry, SportdbEntityKey } from './sportdb.types';

/** TTLs de cache en segundos, según qué tan seguido cambia cada recurso. */
const TTL = {
  countries: 60 * 60 * 24, // 24h: el catálogo de países casi nunca cambia
  competitions: 60 * 60 * 6, // 6h
  default: 60 * 60, // 1h para fixtures/tablas
} as const;

@Injectable()
export class SportdbService {
  private readonly logger = new Logger(SportdbService.name);
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.baseUrl = (
      this.config.get<string>('SPORTDB_BASE_URL') ?? ''
    ).replace(/\/$/, '');
    this.apiKey = this.config.get<string>('SPORTDB_API_KEY') || undefined;

    if (!this.baseUrl) {
      this.logger.warn(
        'SPORTDB_BASE_URL no está configurada: las llamadas a SportDB fallarán hasta completarla en .env',
      );
    }
  }

  /** Catálogo raíz: países + regiones. */
  async getCountries(): Promise<SportdbCountry[]> {
    return this.redis.wrap('sportdb:countries', TTL.countries, () =>
      this.request<SportdbCountry[]>('/api/flashscore/football'),
    );
  }

  /**
   * Competiciones de un país/región a partir de su clave "slug:id"
   * (ej "argentina:22"). El tipo de retorno es `unknown` hasta inspeccionar
   * la forma real del JSON de este nivel.
   */
  async getCompetitions(entityKey: SportdbEntityKey): Promise<unknown> {
    return this.redis.wrap(
      `sportdb:competitions:${entityKey}`,
      TTL.competitions,
      () =>
        this.request<unknown>(
          `/api/flashscore/football/${encodeURIComponent(entityKey)}`,
        ),
    );
  }

  /**
   * Fetch genérico cacheado de cualquier path de la API (los `competitions`
   * que vienen en cada item ya son paths relativos listos para usar).
   */
  async getPath<T = unknown>(path: string, ttlSeconds = TTL.default): Promise<T> {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return this.redis.wrap(`sportdb:path:${normalized}`, ttlSeconds, () =>
      this.request<T>(normalized),
    );
  }

  // Competición por defecto para la sección de resultados en vivo.
  private get defaultCompetition(): string {
    return (
      this.config.get<string>('SPORTDB_COMPETITION') ||
      '/api/flashscore/football/argentina:22/liga-profesional:naYhNOaA'
    );
  }

  // Última respuesta válida de partidos, por competición (fallback en memoria
  // cuando la API externa falla o devuelve vacío de forma intermitente).
  private lastMatches: Record<string, any[]> = {};

  /**
   * Trae partidos REALES de una competición (en vivo + últimos resultados +
   * próximos) ya normalizados para la pantalla de resultados del front.
   * Si la API falla intermitentemente, devuelve la última respuesta buena.
   */
  async getMatches(competition?: string): Promise<any[]> {
    const compPath = competition || this.defaultCompetition;

    try {
      // 1) Metadata de la competición: links de live + temporadas.
      const meta = await this.getPath<any>(compPath, TTL.competitions);
      const leagueName: string = meta?.name ?? 'Liga';
      const season = meta?.seasons?.[0] ?? {};

      // 2) Traer en paralelo (cada uno cacheado y tolerante a fallos).
      const safe = async (path?: string) => {
        if (!path) return [];
        try {
          const data = await this.getPath<any[]>(path, 60); // 1 min para data viva
          return Array.isArray(data) ? data : [];
        } catch (err) {
          this.logger.warn(`No se pudo traer ${path}: ${String(err)}`);
          return [];
        }
      };

      const [live, results, fixtures] = await Promise.all([
        safe(meta?.live),
        safe(season?.results),
        safe(season?.fixtures),
      ]);

      const liveM = live.map((e) => this.normalizeEvent(e, leagueName, 'live'));
      const finishedM = results
        .slice(0, 12)
        .map((e) => this.normalizeEvent(e, leagueName));
      const scheduledM = fixtures
        .slice(0, 12)
        .map((e) => this.normalizeEvent(e, leagueName));

      const combined = [...liveM, ...scheduledM, ...finishedM].filter(Boolean);

      // Solo pisamos el cache si vino data; si no, devolvemos la última buena.
      if (combined.length) {
        this.lastMatches[compPath] = combined;
        return combined;
      }
      return this.lastMatches[compPath] ?? [];
    } catch (err) {
      this.logger.warn(`getMatches falló para ${compPath}: ${String(err)}`);
      return this.lastMatches[compPath] ?? [];
    }
  }

  /** Mapea un evento de flashscore al formato de la pantalla de resultados. */
  private normalizeEvent(ev: any, leagueName: string, forceStatus?: string) {
    const stage = String(ev?.eventStage ?? '').toUpperCase();
    const status =
      forceStatus ||
      (stage === 'FINISHED' || stage.startsWith('AFTER')
        ? 'ft'
        : stage === 'SCHEDULED' || stage === 'NOT_STARTED'
          ? 'scheduled'
          : 'live');

    const num = (v: any) => {
      const n = parseInt(v, 10);
      return Number.isNaN(n) ? null : n;
    };

    const startMs = ev?.startTime ? Number(ev.startTime) * 1000 : null;
    const gameTime = num(ev?.gameTime);

    // Etiqueta para partidos programados. La API trae horas placeholder para
    // fixtures sin horario confirmado, por eso mostramos la FECHA (y agregamos
    // la hora sólo cuando el partido es próximo y el horario ya es confiable).
    const TZ = 'America/Argentina/Buenos_Aires';
    let timeLabel: string | null = null;
    if (status === 'scheduled' && startMs) {
      const d = new Date(startMs);
      const dateStr = d.toLocaleDateString('es-AR', {
        timeZone: TZ,
        day: '2-digit',
        month: 'short',
      });
      const soon = startMs - Date.now() < 3 * 24 * 60 * 60 * 1000; // < 3 días
      if (soon) {
        const hhmm = d.toLocaleTimeString('es-AR', {
          timeZone: TZ,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        timeLabel = `${dateStr} ${hhmm}`;
      } else {
        timeLabel = dateStr;
      }
    }

    return {
      id: ev?.eventId ?? `${ev?.homeName}-${ev?.awayName}-${ev?.startTime}`,
      league: leagueName,
      country: '⚽',
      home: ev?.homeName ?? ev?.homeFirstName ?? '—',
      away: ev?.awayName ?? ev?.awayFirstName ?? '—',
      homeScore: status === 'scheduled' ? null : num(ev?.homeScore),
      awayScore: status === 'scheduled' ? null : num(ev?.awayScore),
      status,
      minute: status === 'live' && gameTime && gameTime > 0 ? gameTime : null,
      time: timeLabel,
      startTime: startMs,
      events: [],
    };
  }

  /** GET crudo contra la API (sin cache). Centraliza auth + manejo de errores. */
  private async request<T>(path: string, attempt = 1): Promise<T> {
    if (!this.baseUrl) {
      throw new ServiceUnavailableException('SPORTDB_BASE_URL no configurada');
    }

    const url = `${this.baseUrl}${path}`;
    const cfg: AxiosRequestConfig = {
      timeout: 12_000,
      headers: this.apiKey ? { 'x-api-key': this.apiKey } : {},
    };

    try {
      const { data } = await firstValueFrom(this.http.get<T>(url, cfg));
      return data;
    } catch (err) {
      const ax = err as AxiosError;
      const status = ax.response?.status;

      // Reintentar ante errores transitorios (timeout/red, 429 o 5xx).
      const transient = !status || status === 429 || status >= 500;
      const MAX_ATTEMPTS = 3;
      if (transient && attempt < MAX_ATTEMPTS) {
        const backoff = 400 * attempt;
        this.logger.warn(
          `GET ${url} falló (intento ${attempt}/${MAX_ATTEMPTS}): ${ax.message}. Reintentando en ${backoff}ms`,
        );
        await new Promise((r) => setTimeout(r, backoff));
        return this.request<T>(path, attempt + 1);
      }

      this.logger.error(
        `GET ${url} falló${status ? ` (${status})` : ''}: ${ax.message}`,
      );
      if (status) {
        throw new HttpException(
          `SportDB respondió ${status} para ${path}`,
          status,
        );
      }
      throw new ServiceUnavailableException(
        `No se pudo contactar SportDB: ${ax.message}`,
      );
    }
  }
}
