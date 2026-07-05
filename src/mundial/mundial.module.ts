import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MundialController } from './mundial.controller';
import { MundialService } from './mundial.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 10_000,
      maxRedirects: 3,
    }),
  ],
  controllers: [MundialController],
  providers: [MundialService],
  exports: [MundialService],
})
export class MundialModule {}
