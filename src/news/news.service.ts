import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NewsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  // Si no hay noticias cargadas, sembramos algunas de ejemplo.
  async onModuleInit() {
    try {
      const count = await this.prisma.news.count();
      if (count === 0) {
        await this.prisma.news.createMany({
          data: [
            {
              title: 'Nuevas cartas legendarias disponibles',
              description:
                'Llegaron las cartas legendarias a los sobres. Probá tu suerte y sumalas a tu colección.',
              category: 'Novedad',
            },
            {
              title: 'Torneo de Verano 2026',
              description:
                'Inscripciones abiertas para el torneo 5 vs 5 con grandes premios en puntos.',
              category: 'Evento',
            },
            {
              title: 'Actualización de equilibrio',
              description:
                'Ajustamos las estadísticas de varios jugadores para mejorar la experiencia competitiva.',
              category: 'Update',
            },
            {
              title: 'Prode: pronosticá y ganá puntos',
              description:
                'Acertá los resultados de los partidos reales y canjeá tus puntos por sobres.',
              category: 'Novedad',
            },
          ],
        });
      }
    } catch (err) {
      // No bloquear el arranque si la DB todavía no está lista.
      console.error('No se pudo sembrar noticias:', err?.message);
    }
  }

  findAll() {
    return this.prisma.news.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(data: {
    title: string;
    description: string;
    image?: string;
    category?: string;
  }) {
    return this.prisma.news.create({ data });
  }

  remove(id: number) {
    return this.prisma.news.delete({ where: { id } });
  }
}
