import { Module } from '@nestjs/common';
import { MazoService } from './mazo.service';
import { MazoController } from './mazo.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MazoController],
  providers: [MazoService, PrismaService],
})
export class MazoModule {}
