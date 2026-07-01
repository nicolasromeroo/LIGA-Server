import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProdeService } from './prode.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('prode')
@ApiBearerAuth()
@Controller('prode')
export class ProdeController {
  constructor(private readonly prodeService: ProdeService) {}

  // Partidos sobre los que se puede pronosticar.
  @Get('matches')
  matches() {
    return this.prodeService.availableMatches();
  }

  // Pronósticos del usuario autenticado.
  @UseGuards(JwtAuthGuard)
  @Get('my')
  my(@Req() req: any) {
    return this.prodeService.myPredictions(req.user.sub);
  }

  // Crear / actualizar un pronóstico.
  @UseGuards(JwtAuthGuard)
  @Post('predict')
  predict(
    @Req() req: any,
    @Body() body: { matchId: number; scoreA: number; scoreB: number },
  ) {
    return this.prodeService.predict(req.user.sub, {
      matchId: Number(body.matchId),
      scoreA: Number(body.scoreA),
      scoreB: Number(body.scoreB),
    });
  }
}
