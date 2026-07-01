import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CreateMazoDto {
  @ApiProperty({
    description: 'Nombre del mazo',
    example: 'Mi Mazo de Fútbol',
  })
  nombre: string;

  @ApiProperty({
    description: 'ID del usuario dueño del mazo',
    example: 1,
  })
  @ApiProperty({
    description: 'ID del usuario dueño del mazo',
    example: 1,
  })
  @IsNumber()
  userId: number;

  @ApiProperty({
    description: 'IDs de las cartas que pertenecen al mazo',
    example: [1, 2, 3],
    required: false,
  })
  cards?: number[];
}
