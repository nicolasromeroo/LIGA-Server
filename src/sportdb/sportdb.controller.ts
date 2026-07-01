import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SportdbService } from './sportdb.service';
import { SportdbEntityKey } from './sportdb.types';

@ApiTags('sportdb')
@Controller('sportdb')
export class SportdbController {
  constructor(private readonly sportdb: SportdbService) {}

  /** Catálogo raíz de países/regiones (cacheado en Redis). */
  @Get('countries')
  getCountries() {
    return this.sportdb.getCountries();
  }

  /**
   * Partidos reales (en vivo + resultados + próximos) ya normalizados para la
   * pantalla de resultados. Opcional: ?competition=/api/flashscore/football/...
   */
  @Get('matches')
  getMatches(@Query('competition') competition?: string) {
    return this.sportdb.getMatches(competition);
  }

  /** Competiciones de un país, ej GET /sportdb/competitions/argentina:22 */
  @Get('competitions/:entityKey')
  getCompetitions(@Param('entityKey') entityKey: string) {
    return this.sportdb.getCompetitions(entityKey as SportdbEntityKey);
  }

  /**
   * Fetch genérico de cualquier path de la API, para explorar niveles
   * profundos. Ej: GET /sportdb/path?path=/api/flashscore/football/argentina:22
   */
  @Get('path')
  getPath(@Query('path') path: string) {
    return this.sportdb.getPath(path);
  }
}
