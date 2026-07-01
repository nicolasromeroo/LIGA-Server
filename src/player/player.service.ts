import { Injectable } from '@nestjs/common';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PlayerService {
  constructor(private prismaService: PrismaService) {}

  async addToGame(createPlayerDto: CreatePlayerDto) {
    const player = await this.prismaService.player.create({
      data: createPlayerDto,
    });
    return player;
  }

  async findAllPlayers() {
    return await this.prismaService.player.findMany();
  }

  async findPlayer(id: number) {
    return await this.prismaService.player.findUnique({
      where: { id },
    });
  }

  async updatePlayer(id: number, updatePlayerDto: UpdatePlayerDto) {
    return await this.prismaService.player.update({
      where: {
        id,
      },
      data: updatePlayerDto,
    });
  }

  async removePlayer(id: number) {
    return await this.prismaService.player.delete({
      where: {
        id,
      },
    });
  }

  // cartas coleccionables (jugadores) disponibles
  // async findAll() {
  //   return this.prismaService.playerCard.findMany({
  //     where: { mazoId: null },
  //     include: { player: true },
  //   });
  // }
}
