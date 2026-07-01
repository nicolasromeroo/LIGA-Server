import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

// Puntos otorgados por acierto.
const POINTS_EXACT = 50; // resultado exacto
const POINTS_OUTCOME = 20; // acertó ganador/empate

@Injectable()
export class ProdeService {
  constructor(private prisma: PrismaService) {}

  // Partidos disponibles para pronosticar (programados o en vivo).
  // Prioriza los partidos REALES (con externalId) si los hay.
  async availableMatches() {
    const real = await this.prisma.match.findMany({
      where: { status: { in: ['scheduled', 'live'] }, externalId: { not: null } },
      orderBy: { scheduledAt: 'asc' },
    });
    if (real.length) return real;

    return this.prisma.match.findMany({
      where: { status: { in: ['scheduled', 'live'] } },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  // Crea o actualiza el pronóstico del usuario para un partido.
  async predict(
    userId: number,
    dto: { matchId: number; scoreA: number; scoreB: number },
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: dto.matchId },
    });
    if (!match) throw new NotFoundException('Partido no encontrado');
    if (match.status === 'finished' || match.status === 'cancelled') {
      throw new BadRequestException('El partido ya no admite pronósticos');
    }

    return this.prisma.prediction.upsert({
      where: { userId_matchId: { userId, matchId: dto.matchId } },
      update: { scoreA: dto.scoreA, scoreB: dto.scoreB, status: 'pending' },
      create: {
        userId,
        matchId: dto.matchId,
        scoreA: dto.scoreA,
        scoreB: dto.scoreB,
      },
    });
  }

  // Pronósticos del usuario, con el partido asociado.
  myPredictions(userId: number) {
    return this.prisma.prediction.findMany({
      where: { userId },
      include: { match: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private parseResult(result: string | null): { a: number; b: number } | null {
    if (!result) return null;
    const m = result.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (!m) return null;
    return { a: parseInt(m[1], 10), b: parseInt(m[2], 10) };
  }

  private outcome(a: number, b: number) {
    return a > b ? 'A' : a < b ? 'B' : 'D';
  }

  // Cada minuto resuelve los pronósticos de partidos finalizados con resultado.
  @Cron(CronExpression.EVERY_MINUTE)
  async resolvePredictions() {
    const finished = await this.prisma.match.findMany({
      where: { status: 'finished', result: { not: null } },
      include: { predictions: { where: { status: 'pending' } } },
    });

    for (const match of finished) {
      const real = this.parseResult(match.result);
      if (!real) continue;

      for (const pred of match.predictions) {
        let points = 0;
        if (pred.scoreA === real.a && pred.scoreB === real.b) {
          points = POINTS_EXACT;
        } else if (
          this.outcome(pred.scoreA, pred.scoreB) === this.outcome(real.a, real.b)
        ) {
          points = POINTS_OUTCOME;
        }

        await this.prisma.$transaction([
          this.prisma.prediction.update({
            where: { id: pred.id },
            data: { status: points > 0 ? 'won' : 'lost', pointsWon: points },
          }),
          ...(points > 0
            ? [
                this.prisma.user.update({
                  where: { id: pred.userId },
                  data: { points: { increment: points } },
                }),
              ]
            : []),
        ]);
      }
    }
  }
}
