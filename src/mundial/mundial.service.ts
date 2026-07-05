import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '../redis/redis.service';

/**
 * Datos REALES del Mundial vía la API pública de FIFA (api.fifa.com).
 * No requiere API key. idCompetition 17 = Copa Mundial FIFA;
 * idSeason 285023 = Mundial 2026 (configurable por .env para futuras ediciones).
 */
const FIFA_BASE = 'https://api.fifa.com/api/v3';

/** TTLs de cache en segundos según qué tan viva es cada data. */
const TTL = {
  calendar: 60, // fixture completo (los partidos en vivo se pisan con /live)
  live: 15, // partidos en curso: minuto y goles casi en tiempo real
  standings: 120, // tablas de grupos
  stages: 60 * 60 * 6, // estructura del torneo, casi no cambia
} as const;

// MatchStatus de FIFA: 0 = finalizado, 1 = programado, 3 = en vivo.
const FIFA_STATUS = { finished: 0, scheduled: 1, live: 3 } as const;

@Injectable()
export class MundialService {
  private readonly logger = new Logger(MundialService.name);
  private readonly idCompetition: string;
  private readonly idSeason: string;

  // Última respuesta buena en memoria (fallback si la API falla).
  private lastMatches: any[] | null = null;
  private lastStandings: any[] | null = null;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.idCompetition = this.config.get<string>('FIFA_COMPETITION') || '17';
    this.idSeason = this.config.get<string>('FIFA_SEASON') || '285023';
  }

  /** Nombre y fechas del torneo (para el hero de la sección). */
  async getInfo(): Promise<any> {
    return this.redis.wrap('mundial:info', TTL.stages, async () => {
      const data = await this.request<any>(
        `/seasons/${this.idSeason}?language=es`,
      );
      return {
        id: this.idSeason,
        name: this.text(data?.Name) ?? 'Copa Mundial de la FIFA',
        abbreviation: data?.Abbreviation ?? null,
        startDate: data?.StartDate ?? null,
        endDate: data?.EndDate ?? null,
      };
    });
  }

  /**
   * Todos los partidos del Mundial (fixture completo + resultados) con los
   * que están EN VIVO pisados por el feed live de FIFA (goles y minuto
   * actualizados cada ~15s).
   */
  async getMatches(): Promise<any[]> {
    try {
      const [calendar, live] = await Promise.all([
        this.redis.wrap('mundial:calendar', TTL.calendar, () =>
          this.request<any>(
            `/calendar/matches?idCompetition=${this.idCompetition}&idSeason=${this.idSeason}&language=es&count=500`,
          ),
        ),
        this.getLiveRaw(),
      ]);

      const liveById = new Map<string, any>(
        live.map((m: any) => [String(m.IdMatch), m]),
      );

      const matches = (calendar?.Results ?? [])
        .map((m: any) => this.normalizeMatch(m, liveById.get(String(m.IdMatch))))
        .filter(Boolean)
        .sort((a: any, b: any) => (a.startTime ?? 0) - (b.startTime ?? 0));

      if (matches.length) {
        this.lastMatches = matches;
        return matches;
      }
      return this.lastMatches ?? [];
    } catch (err) {
      this.logger.warn(`getMatches falló: ${String(err)}`);
      return this.lastMatches ?? [];
    }
  }

  /** Tablas de posiciones de la fase de grupos, agrupadas por grupo. */
  async getStandings(): Promise<any[]> {
    try {
      const stageId = await this.getGroupStageId();
      if (!stageId) return this.lastStandings ?? [];

      const data = await this.redis.wrap(
        'mundial:standings',
        TTL.standings,
        () =>
          this.request<any>(
            `/calendar/${this.idCompetition}/${this.idSeason}/${stageId}/standing?language=es`,
          ),
      );

      const byGroup = new Map<string, any[]>();
      for (const row of data?.Results ?? []) {
        const group = this.text(row?.Group) ?? 'Grupo';
        if (!byGroup.has(group)) byGroup.set(group, []);
        byGroup.get(group)!.push({
          position: row?.Position ?? 0,
          team: this.text(row?.Team?.Name) ?? row?.Team?.Abbreviation ?? '—',
          abbr: row?.Team?.Abbreviation ?? '',
          flag: this.flag(row?.Team?.PictureUrl),
          played: row?.Played ?? 0,
          won: row?.Won ?? 0,
          drawn: row?.Drawn ?? 0,
          lost: row?.Lost ?? 0,
          goalsFor: row?.For ?? 0,
          goalsAgainst: row?.Against ?? 0,
          goalDiff: row?.GoalsDiference ?? 0,
          points: row?.Points ?? 0,
          // "ConfirmedQualified" | "Eliminated" | null según avance el torneo
          qualification: row?.QualificationStatus ?? null,
        });
      }

      const groups = [...byGroup.entries()]
        .map(([group, rows]) => ({
          group,
          rows: rows.sort((a, b) => a.position - b.position),
        }))
        .sort((a, b) => a.group.localeCompare(b.group, 'es'));

      if (groups.length) {
        this.lastStandings = groups;
        return groups;
      }
      return this.lastStandings ?? [];
    } catch (err) {
      this.logger.warn(`getStandings falló: ${String(err)}`);
      return this.lastStandings ?? [];
    }
  }

  // ------------------------------------------------------------------
  //  Helpers
  // ------------------------------------------------------------------

  /** Partidos en vivo del feed global de FIFA, filtrados a este torneo. */
  private async getLiveRaw(): Promise<any[]> {
    try {
      const data = await this.redis.wrap('mundial:live', TTL.live, () =>
        this.request<any>('/live/football/now?language=es'),
      );
      return (data?.Results ?? []).filter(
        (m: any) =>
          String(m?.IdCompetition) === this.idCompetition &&
          String(m?.IdSeason) === this.idSeason,
      );
    } catch (err) {
      this.logger.warn(`No se pudo traer el feed live: ${String(err)}`);
      return [];
    }
  }

  /** Id de la etapa "Primera fase" (grupos), descubierto una sola vez. */
  private async getGroupStageId(): Promise<string | null> {
    const stages = await this.redis.wrap('mundial:stages', TTL.stages, () =>
      this.request<any>(
        `/stages?idCompetition=${this.idCompetition}&idSeason=${this.idSeason}&language=es&count=50`,
      ),
    );
    const list: any[] = stages?.Results ?? [];
    // La fase de grupos es la de menor SequenceOrder.
    const first = list
      .filter((s) => s?.IdStage)
      .sort((a, b) => (a?.SequenceOrder ?? 99) - (b?.SequenceOrder ?? 99))[0];
    return first?.IdStage ?? null;
  }

  /** Mapea un partido FIFA (+ su versión live si está en juego) al formato del front. */
  private normalizeMatch(m: any, liveM?: any) {
    if (!m) return null;

    // El feed live usa HomeTeam/AwayTeam; el calendario usa Home/Away.
    const home = liveM?.HomeTeam ?? m?.Home;
    const away = liveM?.AwayTeam ?? m?.Away;

    const rawStatus = liveM ? FIFA_STATUS.live : m?.MatchStatus;
    const status =
      rawStatus === FIFA_STATUS.live
        ? 'live'
        : rawStatus === FIFA_STATUS.finished
          ? 'ft'
          : 'scheduled';

    const minute = this.parseMinute(liveM?.MatchTime ?? m?.MatchTime);
    const startMs = m?.Date ? Date.parse(m.Date) : null;

    // Etiqueta de fecha/hora para programados (hora de Argentina).
    const TZ = 'America/Argentina/Buenos_Aires';
    let timeLabel: string | null = null;
    if (status === 'scheduled' && startMs) {
      const d = new Date(startMs);
      const dateStr = d.toLocaleDateString('es-AR', {
        timeZone: TZ,
        day: '2-digit',
        month: 'short',
      });
      const hhmm = d.toLocaleTimeString('es-AR', {
        timeZone: TZ,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      timeLabel = `${dateStr} ${hhmm}`;
    }

    const score = (team: any, calendarScore: any) => {
      if (status === 'scheduled') return null;
      const n = Number(team?.Score ?? calendarScore);
      return Number.isNaN(n) ? null : n;
    };

    return {
      id: String(m.IdMatch),
      league: 'Mundial 2026',
      country: '🏆',
      stage: this.text(m?.StageName) ?? '',
      group: this.text(m?.GroupName) ?? null,
      // Para armar el cuadro de eliminatorias: nº de partido y de dónde
      // vienen los cruces ("W91" = ganador del partido 91, "1A" = 1º grupo A).
      matchNumber: m?.MatchNumber ?? null,
      placeholderA: m?.PlaceHolderA ?? null,
      placeholderB: m?.PlaceHolderB ?? null,
      home: this.text(home?.TeamName) ?? m?.PlaceHolderA ?? '—',
      away: this.text(away?.TeamName) ?? m?.PlaceHolderB ?? '—',
      homeAbbr: home?.Abbreviation ?? null,
      awayAbbr: away?.Abbreviation ?? null,
      homeFlag: this.flag(home?.PictureUrl),
      awayFlag: this.flag(away?.PictureUrl),
      homeScore: score(home, m?.HomeTeamScore),
      awayScore: score(away, m?.AwayTeamScore),
      homePenalties: m?.HomeTeamPenaltyScore ?? null,
      awayPenalties: m?.AwayTeamPenaltyScore ?? null,
      winner: m?.Winner ?? null,
      winnerIsHome: m?.Winner ? m.Winner === home?.IdTeam : null,
      status,
      minute: status === 'live' ? minute : null,
      time: timeLabel,
      startTime: startMs,
      stadium: this.text(m?.Stadium?.Name) ?? null,
      city: this.text(m?.Stadium?.CityName) ?? null,
      events: [],
    };
  }

  /** FIFA localiza los textos como [{Locale, Description}]. */
  private text(field: any): string | null {
    if (Array.isArray(field)) return field[0]?.Description ?? null;
    return typeof field === 'string' ? field : null;
  }

  /** "43'" | "45'+2'" → 43 | 45 */
  private parseMinute(matchTime: any): number | null {
    if (!matchTime) return null;
    const n = parseInt(String(matchTime), 10);
    return Number.isNaN(n) ? null : n;
  }

  /** URL de bandera lista para <img> (PNG cuadrado oficial de FIFA). */
  private flag(pictureUrl?: string): string | null {
    if (!pictureUrl) return null;
    return pictureUrl.replace('{format}', 'sq').replace('{size}', '4');
  }

  /** GET crudo contra api.fifa.com con reintentos ante errores transitorios. */
  private async request<T>(path: string, attempt = 1): Promise<T> {
    const url = `${FIFA_BASE}${path}`;
    try {
      const { data } = await firstValueFrom(
        this.http.get<T>(url, { timeout: 12_000 }),
      );
      return data;
    } catch (err) {
      const ax = err as AxiosError;
      const status = ax.response?.status;
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
      throw new ServiceUnavailableException(
        `No se pudo contactar la API de FIFA: ${ax.message}`,
      );
    }
  }
}
