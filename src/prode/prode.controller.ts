import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProdeService } from './prode.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('prode')
@ApiBearerAuth()
@Controller('prode')
export class ProdeController {
  constructor(private readonly prodeService: ProdeService) {}

  /* ---------- Fixture / prode global ---------- */

  // Partidos sobre los que se puede pronosticar.
  @Get('matches')
  matches() {
    return this.prodeService.availableMatches();
  }

  // Pronósticos globales del usuario autenticado.
  @UseGuards(JwtAuthGuard)
  @Get('my')
  my(@Req() req: any) {
    return this.prodeService.myPredictions(req.user.sub);
  }

  // Crear / actualizar un pronóstico global.
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

  /* ---------- Torneos ---------- */

  // Torneos del usuario + públicos para descubrir.
  @UseGuards(JwtAuthGuard)
  @Get('torneos')
  listTorneos(@Req() req: any) {
    return this.prodeService.listTorneos(req.user.sub);
  }

  // Crear un torneo.
  @UseGuards(JwtAuthGuard)
  @Post('torneos')
  createTorneo(
    @Req() req: any,
    @Body() body: { nombre: string; descripcion?: string; isPublic?: boolean },
  ) {
    return this.prodeService.createTorneo(req.user.sub, body);
  }

  // Unirse por código de invitación.
  @UseGuards(JwtAuthGuard)
  @Post('torneos/join')
  joinByCode(@Req() req: any, @Body() body: { codigo: string }) {
    return this.prodeService.joinByCode(req.user.sub, body.codigo);
  }

  // Detalle de un torneo (info + tabla + fixture + mis pronósticos).
  @UseGuards(JwtAuthGuard)
  @Get('torneos/:id')
  getTorneo(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.prodeService.getTorneo(req.user.sub, id);
  }

  // Unirse a un torneo público por id.
  @UseGuards(JwtAuthGuard)
  @Post('torneos/:id/join')
  joinPublic(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.prodeService.joinPublic(req.user.sub, id);
  }

  // Pronosticar dentro de un torneo.
  @UseGuards(JwtAuthGuard)
  @Post('torneos/:id/predict')
  predictTorneo(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { matchId: number; scoreA: number; scoreB: number },
  ) {
    return this.prodeService.predictTorneo(req.user.sub, id, {
      matchId: Number(body.matchId),
      scoreA: Number(body.scoreA),
      scoreB: Number(body.scoreB),
    });
  }

  // Abandonar un torneo.
  @UseGuards(JwtAuthGuard)
  @Post('torneos/:id/leave')
  leaveTorneo(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.prodeService.leaveTorneo(req.user.sub, id);
  }

  // Eliminar un torneo (solo el creador).
  @UseGuards(JwtAuthGuard)
  @Delete('torneos/:id')
  deleteTorneo(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.prodeService.deleteTorneo(req.user.sub, id);
  }
}
