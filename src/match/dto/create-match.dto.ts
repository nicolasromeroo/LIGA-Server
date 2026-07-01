import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateMatchDto {
  @IsOptional()
  @IsString()
  roomId?: string;

  @IsString()
  teamA: string; // Nombre del equipo real (ej: "Real Madrid")

  @IsString()
  teamB: string; // Nombre del equipo real (ej: "Barcelona")

  @IsDateString()
  scheduledAt: string; // Fecha del partido real (ej: "2026-01-08T20:00:00Z")
}
