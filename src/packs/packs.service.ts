import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type Rarity = 'COMUN' | 'RARA' | 'EPICA' | 'LEGENDARIA';

const RARITY_ORDER: Rarity[] = ['COMUN', 'RARA', 'EPICA', 'LEGENDARIA'];

// El admin guarda la rareza del jugador en inglés ("epic") y las cartas se
// guardaban en español ("EPICA"): normalizamos cualquier variante al bucket
// en español que usan los pesos de los sobres.
const RARITY_BUCKET: Record<string, Rarity> = {
  comun: 'COMUN',
  common: 'COMUN',
  rara: 'RARA',
  raro: 'RARA',
  rare: 'RARA',
  epica: 'EPICA',
  epico: 'EPICA',
  epic: 'EPICA',
  legendaria: 'LEGENDARIA',
  legendario: 'LEGENDARIA',
  legendary: 'LEGENDARIA',
};

export const normalizeRarity = (r: string | null | undefined): Rarity =>
  RARITY_BUCKET[String(r ?? '').toLowerCase().trim()] ?? 'COMUN';

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

  private rollRarity(weights: PackTier['weights']): Rarity {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (const [rarity, weight] of Object.entries(weights)) {
      r -= weight;
      if (r <= 0) return rarity as Rarity;
    }
    return 'COMUN';
  }

  // Agrupa el catálogo por rareza normalizada.
  private groupByRarity<T extends { rarity: string }>(
    jugadores: T[],
  ): Map<Rarity, T[]> {
    const map = new Map<Rarity, T[]>();
    for (const jugador of jugadores) {
      const bucket = normalizeRarity(jugador.rarity);
      const pool = map.get(bucket);
      if (pool) pool.push(jugador);
      else map.set(bucket, [jugador]);
    }
    return map;
  }

  // Sortea una rareza con los pesos del sobre y elige un jugador de ESA
  // rareza: la rareza de la carta siempre es la del jugador del catálogo.
  // Si no hay jugadores de la rareza sorteada, cae al tier más cercano
  // (primero hacia abajo, después hacia arriba).
  private pickCard(
    byRarity: Map<Rarity, { id: number }[]>,
    weights: PackTier['weights'],
  ): { playerId: number; rarity: Rarity } | null {
    const rolled = this.rollRarity(weights);
    const idx = RARITY_ORDER.indexOf(rolled);
    const fallback: Rarity[] = [
      rolled,
      ...RARITY_ORDER.slice(0, idx).reverse(),
      ...RARITY_ORDER.slice(idx + 1),
    ];
    for (const rarity of fallback) {
      const pool = byRarity.get(rarity);
      if (pool?.length) {
        const jugador = pool[Math.floor(Math.random() * pool.length)];
        return { playerId: jugador.id, rarity };
      }
    }
    return null;
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

    const byRarity = this.groupByRarity(jugadores);
    const seleccion = Array.from({ length: tier.cards }, () =>
      this.pickCard(byRarity, tier.weights),
    ).filter((c): c is { playerId: number; rarity: Rarity } => c !== null);

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

    // Generar 3 cartas aleatorias (misma lógica que buyAndOpen: la rareza
    // de la carta es siempre la rareza del jugador del catálogo).
    const byRarity = this.groupByRarity(jugadores);
    const weights = { COMUN: 60, RARA: 25, EPICA: 15, LEGENDARIA: 0 };
    const cartasGeneradas: Array<{ playerId: number; rarity: Rarity }> = [];
    for (let i = 0; i < 3; i++) {
      const carta = this.pickCard(byRarity, weights);
      if (!carta) {
        throw new Error('Jugador inválido encontrado');
      }
      cartasGeneradas.push(carta);
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
