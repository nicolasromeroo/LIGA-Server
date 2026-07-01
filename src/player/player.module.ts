import { Module } from '@nestjs/common';
import { PlayerService } from './player.service';
import { PlayerController } from './player.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [PlayerController],
  providers: [PlayerService],
  imports: [PrismaModule],
})
export class PlayerModule {}
