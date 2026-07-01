import { Injectable } from '@nestjs/common';
import { CreateMazoDto } from './dto/create-mazo.dto';
import { UpdateMazoDto } from './dto/update-mazo.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MazoService {
  constructor(private prisma: PrismaService) {}

  async create(createMazoDto: CreateMazoDto) {
    if (createMazoDto.cards && createMazoDto.cards.length > 5) {
      throw new Error('El mazo solo puede tener un máximo de 5 cartas');
    }
    return this.prisma.mazo.create({
      data: {
        nombre: createMazoDto.nombre,
        userId: createMazoDto.userId,
        cards: createMazoDto.cards
          ? { connect: createMazoDto.cards.map((id) => ({ id })) }
          : undefined,
      },
    });
  }

  async myMazos(userId: number) {
    return this.prisma.mazo.findMany({
      where: { userId: userId },
      include: {
        cards: true,
      },
    });
  }

  async findMazo(mazoId: number) {
    return this.prisma.mazo.findUnique({
      where: { id: mazoId },
      include: {
        cards: true,
      },
    });
  }
  async update(mazoId: number, updateMazoDto: UpdateMazoDto) {
    // Actualiza el mazo con los datos recibidos
    return await this.prisma.mazo.update({
      where: { id: mazoId },
      data: {
        nombre: updateMazoDto.nombre,
        cards: updateMazoDto.cards
          ? {
              set: updateMazoDto.cards.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        cards: true,
      },
    });
  }

  // remove(id: number) {
  //   return `This action removes a #${id} mazo`;
  // }
}
