/**
 * Tipos de la API de SportDB.dev (mirror de flashscore).
 *
 * La API es jerárquica:
 *   /api/flashscore/football                 -> SportdbCountry[]  (raíz: países + regiones)
 *   /api/flashscore/football/{slug}:{id}     -> competiciones del país
 *   .../{competicion}                        -> temporadas / fixtures / tabla
 *   .../{partido}                            -> detalle del partido
 *
 * Solo `SportdbCountry` está confirmado contra la data real. Los niveles
 * más profundos hay que tiparlos cuando se inspeccione su JSON real.
 */

export interface SportdbCountry {
  name: string;
  id: number;
  slug: string;
  sportId: number;
  /** Path relativo al siguiente nivel, ej "/api/flashscore/football/argentina:22". */
  competitions: string;
}

/** Clave de entidad de flashscore, ej "argentina:22". */
export type SportdbEntityKey = `${string}:${number}`;
