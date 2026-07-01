import { Injectable } from '@nestjs/common';

import { AddCardDto } from './dto/add-card.dto';
// import { UpdateCardDto } from './dto/update-card.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { MazoService } from 'src/mazo/mazo.service';

@Injectable()
export class CardsService {
  constructor(
    private prismaService: PrismaService,
    private mazoService: MazoService,
  ) {}

  async createPlayerCard(playerId: number, userId: number, rarity: string) {
    if (!playerId) throw new Error('playerId es requerido');
    const player = await this.prismaService.player.findUnique({
      where: { id: playerId },
    });
    if (!player) throw new Error('Jugador no existe');
    return this.prismaService.playerCard.create({
      data: { playerId, userId, rarity },
    });
  }

  async addCardToMazo(mazoId: number, cardId: number) {
    if (!cardId) {
      throw new Error('cardId es requerido');
    }
    if (!mazoId) {
      throw new Error('mazoId es requerido');
    }

    const mazo = await this.prismaService.mazo.findUnique({
      where: { id: mazoId },
      include: { cards: true },
    });
    if (!mazo) {
      throw new Error('Mazo no encontrado');
    }
    if (mazo.cards.length >= 5) {
      throw new Error('El mazo solo puede tener un máximo de 5 cartas');
    }

    return this.prismaService.playerCard.update({
      where: { id: cardId },
      data: { mazoId },
    });
  }

  findAll() {
    return this.prismaService.playerCard.findMany({
      include: { player: true },
    });
  }

  // Todas las cartas que posee un usuario (con datos del jugador).
  findByUser(userId: number) {
    return this.prismaService.playerCard.findMany({
      where: { userId },
      include: { player: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prismaService.playerCard.findUnique({
      where: { id },
      include: { player: true },
    });
  }

  // update(id: number, updateCardDto: UpdateCardDto) {
  //   return `This action updates a #${id} card`;
  // }

  remove(id: number) {
    return this.prismaService.playerCard.delete({ where: { id } });
  }
}
