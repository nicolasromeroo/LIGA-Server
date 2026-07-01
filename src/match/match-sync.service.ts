import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { SportdbService } from 'src/sportdb/sportdb.service';

/**
 * Sincroniza los partidos REALES de la API de fútbol (sportdb) hacia la tabla
 * Match local. Así el Prode usa partidos reales y los pronósticos se resuelven
 * solos cuando llega el resultado real.
 */
@Injectable()
export class MatchSyncService implements OnModuleInit {
  private readonly logger = new Logger(MatchSyncService.name);

  constructor(
    private readonly sportdb: SportdbService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Sincronización inicial al arrancar (sin bloquear el boot).
    this.sync().catch((e) => this.logger.warn(`Sync inicial falló: ${e?.message}`));
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sync() {
    let matches: any[];
    try {
      matches = await this.sportdb.getMatches(); // liga argentina por defecto
    } catch (err) {
      this.logger.warn(`No se pudieron traer partidos para sync: ${err?.message}`);
      return;
    }

    let upserted = 0;
    for (const m of matches) {
      if (!m?.id) continue;

      const status =
        m.status === 'ft' ? 'finished' : m.status === 'live' ? 'live' : 'scheduled';
      const hasScore = m.homeScore != null && m.awayScore != null;
      const result = status === 'finished' && hasScore ? `${m.homeScore}-${m.awayScore}` : null;
      const scheduledAt = m.startTime ? new Date(m.startTime) : new Date();
      const startedAt = status !== 'scheduled' ? scheduledAt : null;
      const finishedAt = status === 'finished' ? scheduledAt : null;

      const data = {
        teamA: m.home,
        teamB: m.away,
        scheduledAt,
        startedAt,
        finishedAt,
        status,
        result,
      };

      try {
        await this.prisma.match.upsert({
          where: { externalId: String(m.id) },
          update: data,
          create: { externalId: String(m.id), ...data },
        });
        upserted++;
      } catch (err) {
        this.logger.warn(`Upsert de partido ${m.id} falló: ${err?.message}`);
      }
    }

    if (upserted) this.logger.log(`Partidos reales sincronizados: ${upserted}`);
  }
}
