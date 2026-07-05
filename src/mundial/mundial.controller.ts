import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MundialService } from './mundial.service';

@ApiTags('mundial')
@Controller('mundial')
export class MundialController {
  constructor(private readonly mundial: MundialService) {}

  /** Nombre y fechas del torneo. */
  @Get('info')
  getInfo() {
    return this.mundial.getInfo();
  }

  /** Fixture completo: en vivo (minuto/goles reales) + resultados + próximos. */
  @Get('matches')
  getMatches() {
    return this.mundial.getMatches();
  }

  /** Tablas de posiciones de la fase de grupos. */
  @Get('standings')
  getStandings() {
    return this.mundial.getStandings();
  }
}
