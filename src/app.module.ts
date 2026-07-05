import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { SportdbModule } from './sportdb/sportdb.module';
import { MundialModule } from './mundial/mundial.module';
// import { PlayersModule } from './players/players.module';
import { PacksModule } from './packs/packs.module';
import { PrismaModule } from './prisma/prisma.module';
import { MazoModule } from './mazo/mazo.module';
import { RoomsModule } from './rooms/rooms.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TestGateway } from './test.gateway';
import { MatchModule } from './match/match.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PlayerModule } from './player/player.module';
import { CardsModule } from './cards/cards.module';
import { UsersModule } from './users/users.module';
import { NewsModule } from './news/news.module';
import { ProdeModule } from './prode/prode.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    RedisModule,
    SportdbModule,
    MundialModule,
    PrismaModule,
    AuthModule,
    // PlayersModule,
    PacksModule,
    MazoModule,
    RoomsModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    MatchModule,
    PlayerModule,
    CardsModule,
    UsersModule,
    NewsModule,
    ProdeModule,
  ],
  controllers: [AppController],
  providers: [AppService, TestGateway],
})
export class AppModule {}
