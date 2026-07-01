import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SportdbController } from './sportdb.controller';
import { SportdbService } from './sportdb.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 10_000,
      maxRedirects: 3,
    }),
  ],
  controllers: [SportdbController],
  providers: [SportdbService],
  exports: [SportdbService],
})
export class SportdbModule {}
