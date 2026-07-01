// agrega cartas al mazo, pero no permite agregar más de 5 cartas
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMazoDto {
  @ApiProperty({
    description: 'Nombre del mazo',
    example: 'Mi Mazo de Fútbol',
    required: false,
  })
  nombre?: string;

  @ApiProperty({
    description: 'IDs de las cartas que pertenecen al mazo',
    example: [1, 2, 3],
    required: false,
  })
  cards?: number[];
}
