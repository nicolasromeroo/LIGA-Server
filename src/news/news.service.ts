import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

type NewsCreateInput = {
  title: string;
  description: string;
  image?: string;
  category?: string;
  displayMode?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  priority?: number;
};

type NewsUpdateInput = Partial<NewsCreateInput>;

@Injectable()
export class NewsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

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
              displayMode: 'hero-large',
              isPublished: true,
              isFeatured: true,
              priority: 100,
            },
            {
              title: 'Torneo de Verano 2026',
              description:
                'Inscripciones abiertas para el torneo 5 vs 5 con grandes premios en puntos.',
              category: 'Evento',
              displayMode: 'hero-small',
              isPublished: true,
              priority: 90,
            },
            {
              title: 'Actualización de equilibrio',
              description:
                'Ajustamos las estadísticas de varios jugadores para mejorar la experiencia competitiva.',
              category: 'Update',
              displayMode: 'card',
              isPublished: true,
              priority: 80,
            },
            {
              title: 'Prode: pronosticá y ganá puntos',
              description:
                'Acertá los resultados de los partidos reales y canjeá tus puntos por sobres.',
              category: 'Novedad',
              displayMode: 'compact',
              isPublished: true,
              priority: 70,
            },
          ],
        });
      }
    } catch (err) {
      console.error('No se pudo sembrar noticias:', err?.message);
    }
  }

  findAll() {
    return this.prisma.news.findMany({
      where: { isPublished: true },
      orderBy: [
        { isFeatured: 'desc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  findAllAdmin() {
    return this.prisma.news.findMany({
      orderBy: [
        { isFeatured: 'desc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  create(data: NewsCreateInput) {
    return this.prisma.news.create({ data });
  }

  update(id: number, data: NewsUpdateInput) {
    return this.prisma.news.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.news.delete({ where: { id } });
  }
}
