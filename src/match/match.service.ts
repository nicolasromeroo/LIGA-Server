import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto, MatchStatus } from './dto/update-match.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MatchService {
  constructor(private prismaService: PrismaService) {}

  // Cron que progresa el estado de los partidos MANUALES (creados a mano).
  // Los partidos reales (externalId) los maneja la sincronización con la API.
  @Cron(CronExpression.EVERY_MINUTE)
  async updateMatchStatuses() {
    const now = new Date();

    // iniciar partidos manuales programados cuya hora ya llegó
    await this.prismaService.match.updateMany({
      where: {
        status: 'scheduled',
        externalId: null,
        scheduledAt: {
          lte: now,
        },
      },
      data: {
        status: 'live',
        startedAt: now,
      },
    });

    // finalizar partidos manuales que llevan más de 105 minutos
    const matchDuration = 105 * 60 * 1000;
    const cutoffTime = new Date(now.getTime() - matchDuration);

    await this.prismaService.match.updateMany({
      where: {
        status: 'live',
        externalId: null,
        startedAt: {
          lte: cutoffTime,
        },
      },
      data: {
        status: 'finished',
        finishedAt: now,
      },
    });
  }

  // crear partido REAL programado
  async create(createMatchDto: CreateMatchDto) {
    return await this.prismaService.match.create({
      data: {
        teamA: createMatchDto.teamA, // "Real Madrid"
        teamB: createMatchDto.teamB, // "Barcelona"
        scheduledAt: new Date(createMatchDto.scheduledAt), // "2026-01-08 20:00"
        status: 'scheduled',
        // SIN roomId (esto es partido real no PvP)
      },
    });
  }

  // próximos partidos
  async findUpcoming() {
    return await this.prismaService.match.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });
  }

  // partidos en vivo
  async findLive() {
    return await this.prismaService.match.findMany({
      where: {
        status: 'live',
      },
    });
  }

  // historial de partidos
  async findHistory() {
    return await this.prismaService.match.findMany({
      where: {
        status: 'finished',
      },
      orderBy: {
        finishedAt: 'desc',
      },
      include: {
        matchResults: true,
      },
    });
  }

  // Cancelar partido
  async cancelMatch(matchId: number) {
    return await this.prismaService.match.update({
      where: { id: matchId },
      data: {
        status: 'cancelled',
      },
    });
  }

  findAll() {
    return this.prismaService.match.findMany();
  }

  findOne(id: number) {
    return this.prismaService.match.findUnique({
      where: { id },
      include: {
        matchResults: true,
      },
    });
  }

  update(id: number, updateMatchDto: UpdateMatchDto) {
    return this.prismaService.match.update({
      where: { id },
      data: updateMatchDto,
    });
  }

  remove(id: number) {
    return this.prismaService.match.delete({
      where: { id },
    });
  }
}
// MANUAL, POR AHORA SE USA EL CRON AUTOMATICO -------------------------

// // Iniciar partido
// async startMatch(matchId: number) {
//   const match = await this.prismaService.match.findUnique({
//     where: { id: matchId },
//   });

//   if (!match) {
//     throw new NotFoundException('Partido no encontrado');
//   }

//   return await this.prismaService.match.update({
//     where: { id: matchId },
//     data: {
//       status: 'live',
//       startedAt: new Date(),
//     },
//   });
// }

// // Finalizar partido con resultado
// async finishMatch(matchId: number, result: string) {
//   return await this.prismaService.match.update({
//     where: { id: matchId },
//     data: {
//       status: 'finished',
//       result: result,
//       finishedAt: new Date(),
//     },
//   });
// }
