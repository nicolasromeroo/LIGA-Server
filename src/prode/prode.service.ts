import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Reglas de puntaje del Prode:
 *  - Resultado EXACTO ............ +3
 *  - Acertar ganador/empate ...... +1
 *  - Ninguna ..................... 0
 *
 * El resultado considerado es el de los 90' + 30' de tiempo suplementario.
 * NO se cuentan los penales: el score que sincronizamos desde la API (sportdb)
 * es el marcador previo a la tanda, por lo que un partido que se define por
 * penales cuenta como empate a efectos del prode.
 */
const POINTS_EXACT = 3;
const POINTS_OUTCOME = 1;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos

@Injectable()
export class ProdeService implements OnModuleInit {
  private readonly logger = new Logger(ProdeService.name);

  constructor(private prisma: PrismaService) {}

  // Garantiza que exista el torneo público oficial donde cualquiera puede jugar.
  async onModuleInit() {
    try {
      await this.prisma.torneo.upsert({
        where: { codigo: 'LIGA' },
        update: {},
        create: {
          nombre: 'Prode Liga Argentina',
          descripcion:
            'Torneo oficial abierto. Pronosticá la fecha y competí contra toda la comunidad.',
          codigo: 'LIGA',
          isPublic: true,
          ownerId: null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`No se pudo asegurar el torneo oficial: ${err?.message}`);
    }
  }

  /* ============================================================
     Fixture (partidos reales)
     ============================================================ */

  // Partidos disponibles para pronosticar (programados o en vivo).
  // Prioriza los partidos REALES (con externalId) si los hay.
  async availableMatches() {
    const real = await this.prisma.match.findMany({
      where: {
        status: { in: ['scheduled', 'live'] },
        externalId: { not: null },
      },
      orderBy: { scheduledAt: 'asc' },
    });
    if (real.length) return real;

    return this.prisma.match.findMany({
      where: { status: { in: ['scheduled', 'live'] } },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  // Fixture completo (incluye finalizados recientes) para mostrar en el torneo.
  async fixture() {
    const upcoming = await this.availableMatches();
    const finished = await this.prisma.match.findMany({
      where: { status: 'finished', externalId: { not: null } },
      orderBy: { finishedAt: 'desc' },
      take: 12,
    });
    return [...upcoming, ...finished];
  }

  /* ============================================================
     Prode global (sin torneo)
     ============================================================ */

  async predict(
    userId: number,
    dto: { matchId: number; scoreA: number; scoreB: number },
  ) {
    return this.upsertPrediction(userId, null, dto);
  }

  myPredictions(userId: number) {
    return this.prisma.prediction.findMany({
      where: { userId, torneoId: null },
      include: { match: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /* ============================================================
     Torneos
     ============================================================ */

  private genCode(len = 6) {
    let out = '';
    for (let i = 0; i < len; i++) {
      out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return out;
  }

  private async uniqueCode(): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const code = this.genCode();
      const exists = await this.prisma.torneo.findUnique({
        where: { codigo: code },
      });
      if (!exists) return code;
    }
    return this.genCode(8);
  }

  // Crea un torneo y suma al creador como primer miembro.
  async createTorneo(
    userId: number,
    dto: { nombre: string; descripcion?: string; isPublic?: boolean },
  ) {
    const nombre = (dto.nombre || '').trim();
    if (nombre.length < 3) {
      throw new BadRequestException('El nombre debe tener al menos 3 caracteres');
    }

    const codigo = await this.uniqueCode();
    const torneo = await this.prisma.torneo.create({
      data: {
        nombre,
        descripcion: (dto.descripcion || '').trim(),
        codigo,
        isPublic: !!dto.isPublic,
        ownerId: userId,
        members: { create: { userId } },
      },
      include: { _count: { select: { members: true } } },
    });
    return this.decorateTorneo(torneo);
  }

  // Unirse mediante código de invitación.
  async joinByCode(userId: number, codigoRaw: string) {
    const codigo = (codigoRaw || '').trim().toUpperCase();
    if (!codigo) throw new BadRequestException('Ingresá un código');

    const torneo = await this.prisma.torneo.findUnique({ where: { codigo } });
    if (!torneo) throw new NotFoundException('No existe un torneo con ese código');

    await this.prisma.torneoMember.upsert({
      where: { torneoId_userId: { torneoId: torneo.id, userId } },
      update: {},
      create: { torneoId: torneo.id, userId },
    });

    return { id: torneo.id, nombre: torneo.nombre };
  }

  async joinPublic(userId: number, torneoId: number) {
    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
    });
    if (!torneo) throw new NotFoundException('Torneo no encontrado');
    if (!torneo.isPublic) {
      throw new ForbiddenException('Este torneo es privado, necesitás el código');
    }
    await this.prisma.torneoMember.upsert({
      where: { torneoId_userId: { torneoId, userId } },
      update: {},
      create: { torneoId, userId },
    });
    return { id: torneo.id, nombre: torneo.nombre };
  }

  // Lista de torneos: los del usuario + públicos a los que puede sumarse.
  async listTorneos(userId: number) {
    const [memberships, publicos] = await Promise.all([
      this.prisma.torneoMember.findMany({
        where: { userId },
        include: {
          torneo: { include: { _count: { select: { members: true } } } },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      this.prisma.torneo.findMany({
        where: { isPublic: true },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const mineIds = new Set(memberships.map((m) => m.torneoId));

    const mine = memberships.map((m) =>
      this.decorateTorneo(m.torneo, {
        puntos: m.puntos,
        aciertos: m.aciertos,
        isOwner: m.torneo.ownerId === userId,
      }),
    );

    const descubrir = publicos
      .filter((t) => !mineIds.has(t.id))
      .map((t) => this.decorateTorneo(t));

    return { mine, descubrir };
  }

  // Detalle de un torneo: info + tabla + fixture + mis pronósticos.
  async getTorneo(userId: number, torneoId: number) {
    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
      include: {
        _count: { select: { members: true } },
        owner: { select: { id: true, name: true } },
      },
    });
    if (!torneo) throw new NotFoundException('Torneo no encontrado');

    const membership = await this.prisma.torneoMember.findUnique({
      where: { torneoId_userId: { torneoId, userId } },
    });
    const isMember = !!membership;
    if (!isMember && !torneo.isPublic) {
      throw new ForbiddenException('No sos miembro de este torneo');
    }

    const members = await this.prisma.torneoMember.findMany({
      where: { torneoId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ puntos: 'desc' }, { aciertos: 'desc' }, { joinedAt: 'asc' }],
    });

    const leaderboard = members.map((m, i) => ({
      rank: i + 1,
      userId: m.userId,
      name: m.user?.name || 'Jugador',
      puntos: m.puntos,
      aciertos: m.aciertos,
      isMe: m.userId === userId,
    }));

    const [fixture, misPronosticos] = await Promise.all([
      this.fixture(),
      isMember
        ? this.prisma.prediction.findMany({
            where: { userId, torneoId },
            include: { match: true },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    return {
      torneo: {
        id: torneo.id,
        nombre: torneo.nombre,
        descripcion: torneo.descripcion,
        codigo: torneo.codigo,
        isPublic: torneo.isPublic,
        isOwner: torneo.ownerId === userId,
        ownerName: torneo.owner?.name || 'Oficial',
        memberCount: torneo._count.members,
      },
      isMember,
      leaderboard,
      fixture,
      misPronosticos,
    };
  }

  // Pronosticar dentro de un torneo (requiere ser miembro).
  async predictTorneo(
    userId: number,
    torneoId: number,
    dto: { matchId: number; scoreA: number; scoreB: number },
  ) {
    const membership = await this.prisma.torneoMember.findUnique({
      where: { torneoId_userId: { torneoId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('Uníte al torneo para pronosticar');
    }
    return this.upsertPrediction(userId, torneoId, dto);
  }

  async leaveTorneo(userId: number, torneoId: number) {
    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
    });
    if (!torneo) throw new NotFoundException('Torneo no encontrado');
    if (torneo.ownerId === userId) {
      throw new BadRequestException(
        'Sos el creador: eliminá el torneo en vez de abandonarlo',
      );
    }
    await this.prisma.torneoMember.deleteMany({ where: { torneoId, userId } });
    return { ok: true };
  }

  async deleteTorneo(userId: number, torneoId: number) {
    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
    });
    if (!torneo) throw new NotFoundException('Torneo no encontrado');
    if (torneo.ownerId !== userId) {
      throw new ForbiddenException('Solo el creador puede eliminar el torneo');
    }
    await this.prisma.torneo.delete({ where: { id: torneoId } });
    return { ok: true };
  }

  /* ============================================================
     Helpers de pronóstico
     ============================================================ */

  private async upsertPrediction(
    userId: number,
    torneoId: number | null,
    dto: { matchId: number; scoreA: number; scoreB: number },
  ) {
    const scoreA = Math.max(0, Math.floor(Number(dto.scoreA)));
    const scoreB = Math.max(0, Math.floor(Number(dto.scoreB)));
    if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) {
      throw new BadRequestException('Marcador inválido');
    }

    const match = await this.prisma.match.findUnique({
      where: { id: dto.matchId },
    });
    if (!match) throw new NotFoundException('Partido no encontrado');
    if (match.status === 'finished' || match.status === 'cancelled') {
      throw new BadRequestException('El partido ya no admite pronósticos');
    }

    const existing = await this.prisma.prediction.findFirst({
      where: { userId, matchId: dto.matchId, torneoId },
    });

    if (existing) {
      return this.prisma.prediction.update({
        where: { id: existing.id },
        data: { scoreA, scoreB, status: 'pending', pointsWon: 0 },
      });
    }

    return this.prisma.prediction.create({
      data: { userId, matchId: dto.matchId, torneoId, scoreA, scoreB },
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

  private scoreFor(
    pred: { scoreA: number; scoreB: number },
    real: { a: number; b: number },
  ): { points: number; exact: boolean } {
    if (pred.scoreA === real.a && pred.scoreB === real.b) {
      return { points: POINTS_EXACT, exact: true };
    }
    if (this.outcome(pred.scoreA, pred.scoreB) === this.outcome(real.a, real.b)) {
      return { points: POINTS_OUTCOME, exact: false };
    }
    return { points: 0, exact: false };
  }

  /* ============================================================
     Resolución automática
     ============================================================ */

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
        const { points, exact } = this.scoreFor(pred, real);
        const status = points > 0 ? 'won' : 'lost';

        // Operaciones atómicas: marcar el pronóstico y, si sumó, acreditar el
        // puntaje en el torneo (o en la cuenta global si no pertenece a uno).
        const ops: any[] = [
          this.prisma.prediction.update({
            where: { id: pred.id },
            data: { status, pointsWon: points },
          }),
        ];

        if (points > 0) {
          if (pred.torneoId != null) {
            ops.push(
              this.prisma.torneoMember.update({
                where: {
                  torneoId_userId: {
                    torneoId: pred.torneoId,
                    userId: pred.userId,
                  },
                },
                data: {
                  puntos: { increment: points },
                  aciertos: { increment: exact ? 1 : 0 },
                },
              }),
            );
          } else {
            ops.push(
              this.prisma.user.update({
                where: { id: pred.userId },
                data: { points: { increment: points } },
              }),
            );
          }
        }

        try {
          await this.prisma.$transaction(ops);
        } catch (err: any) {
          this.logger.warn(
            `No se pudo resolver el pronóstico ${pred.id}: ${err?.message}`,
          );
        }
      }
    }
  }

  /* ============================================================
     Presentación
     ============================================================ */

  private decorateTorneo(
    torneo: any,
    extra?: { puntos?: number; aciertos?: number; isOwner?: boolean },
  ) {
    return {
      id: torneo.id,
      nombre: torneo.nombre,
      descripcion: torneo.descripcion,
      codigo: torneo.codigo,
      isPublic: torneo.isPublic,
      oficial: torneo.ownerId == null,
      memberCount: torneo._count?.members ?? 0,
      createdAt: torneo.createdAt,
      ...(extra || {}),
    };
  }
}
