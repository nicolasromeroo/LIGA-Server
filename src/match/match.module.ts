import { Module } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { MatchSyncService } from './match-sync.service';
import { SportdbModule } from 'src/sportdb/sportdb.module';

@Module({
  imports: [SportdbModule],
  controllers: [MatchController],
  providers: [MatchService, MatchSyncService],
})
export class MatchModule {}
