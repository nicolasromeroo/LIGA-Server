import { PartialType } from '@nestjs/swagger';
import { CreateMatchDto } from './create-match.dto';
import { IsEnum, IsOptional } from 'class-validator';

export enum MatchStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

export class UpdateMatchDto extends PartialType(CreateMatchDto) {
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}
