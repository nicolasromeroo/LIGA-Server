import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class AddCardDto {
  @ApiProperty({
    description: 'ID de la carta',
    example: 1,
  })
  @IsNumber()
  cardId: number;
  @ApiProperty({
    description: 'ID del mazo al que se agregará la carta',
    example: 1,
  })
  @IsNumber()
  mazoId: number;
}
