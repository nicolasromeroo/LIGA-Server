import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { MazoService } from 'src/mazo/mazo.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [CardsController],
  providers: [CardsService, PrismaService, MazoService],
})
export class CardsModule {}
