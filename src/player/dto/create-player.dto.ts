import { IsNumber, IsString } from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  name: string;
  @IsString()
  team: string;
  @IsString()
  position: string;
  @IsString()
  nationality: string;
  @IsString()
  club: string;
  @IsString()
  rarity: string;
  @IsNumber()
  rating: number;
  @IsNumber()
  overall: number;
  @IsNumber()
  vision: number;
  @IsNumber()
  dribble: number;
  @IsNumber()
  pass: number;
  @IsNumber()
  attack: number;
  @IsNumber()
  defense: number;
  @IsNumber()
  speed: number;
}
