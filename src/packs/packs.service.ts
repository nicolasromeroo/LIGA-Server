import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type Rarity = 'COMUN' | 'RARA' | 'EPICA' | 'LEGENDARIA';

// Configuración de cada tipo de sobre: costo en puntos y pesos de rareza.
type PackTier = {
  cost: number;
  cards: number;
  weights: { COMUN: number; RARA: number; EPICA: number; LEGENDARIA: number };
};

const PACK_TIERS: Record<string, PackTier> = {
  free: { cost: 0, cards: 3, weights: { COMUN: 70, RARA: 25, EPICA: 5, LEGENDARIA: 0 } },
  gold: { cost: 100, cards: 3, weights: { COMUN: 45, RARA: 40, EPICA: 13, LEGENDARIA: 2 } },
  elite: { cost: 500, cards: 3, weights: { COMUN: 10, RARA: 45, EPICA: 40, LEGENDARIA: 5 } },
  legendary: { cost: 1000, cards: 3, weights: { COMUN: 0, RARA: 30, EPICA: 50, LEGENDARIA: 20 } },
};

@Injectable()
export class PacksService {
  constructor(private prisma: PrismaService) {}

  private determinarRareza(): Rarity {
    const random = Math.random();
    if (random < 0.6) return 'COMUN';
    if (random < 0.85) return 'RARA';
    return 'EPICA';
  }

  private rollRarity(weights: PackTier['weights']): Rarity {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (const [rarity, weight] of Object.entries(weights)) {
      r -= weight;
      if (r <= 0) return rarity as Rarity;
    }
    return 'COMUN';
  }

  // Compra y abre un sobre: descuenta puntos y entrega cartas con datos del jugador.
  async buyAndOpen(userId: number, type: string) {
    const tier = PACK_TIERS[type];
    if (!tier) {
      throw new BadRequestException('Tipo de sobre inválido');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.points < tier.cost) {
      throw new BadRequestException('No tenés suficientes puntos para este sobre');
    }

    const jugadores = await this.prisma.player.findMany();
    if (!jugadores.length) {
      throw new BadRequestException('No hay jugadores disponibles todavía');
    }

    const seleccion = Array.from({ length: tier.cards }, () => {
      const jugador = jugadores[Math.floor(Math.random() * jugadores.length)];
      return { playerId: jugador.id, rarity: this.rollRarity(tier.weights) };
    });

    const result = await this.prisma.$transaction(async (tx) => {
      if (tier.cost > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { points: { decrement: tier.cost } },
        });
      }
      const cards = await Promise.all(
        seleccion.map((c) =>
          tx.playerCard.create({
            data: { playerId: c.playerId, userId, rarity: c.rarity },
            include: { player: true },
          }),
        ),
      );
      const updated = await tx.user.findUnique({ where: { id: userId } });
      return { cards, points: updated?.points ?? user.points };
    });

    return result;
  }

  async openPack(packId: number) {
    const pack = await this.prisma.pack.findUnique({
      where: { id: packId },
    });

    if (!pack) {
      throw new NotFoundException('Pack no encontrado');
    }

    if (pack.opened) {
      throw new Error('El pack ya ha sido abierto');
    }

    // Obtener jugadores disponibles
    const jugadores = await this.prisma.player.findMany();

    if (!jugadores || !jugadores.length) {
      throw new Error('No hay jugadores disponibles');
    }

    // Generar 3 cartas aleatorias
    const cartasGeneradas: Array<{ playerId: number; rarity: Rarity }> = [];
    for (let i = 0; i < 3; i++) {
      const jugador = jugadores[Math.floor(Math.random() * jugadores.length)];
      if (!jugador || !jugador.id) {
        throw new Error('Jugador inválido encontrado');
      }
      cartasGeneradas.push({
        playerId: jugador.id,
        rarity: this.determinarRareza(),
      });
    }

    // Crear las cartas en la base de datos usando una transacción
    const cartasCreadas = await this.prisma.$transaction(async (prisma) => {
      // Crear las cartas
      const cartas = await Promise.all(
        cartasGeneradas.map((carta) =>
          prisma.playerCard.create({
            data: {
              playerId: carta.playerId,
              userId: pack.userId,
              rarity: carta.rarity,
            },
          }),
        ),
      );

      // Marcar el pack como abierto
      await prisma.pack.update({
        where: { id: packId },
        data: { opened: true },
      });

      return cartas;
    });

    return cartasCreadas;
  }

  async findAllPacks() {
    return this.prisma.pack.findMany();
  }

  findOne(id: number) {
    return this.prisma.pack.findUnique({ where: { id } });
  }

  remove(id: number) {
    return this.prisma.pack.delete({ where: { id } });
  }
}
