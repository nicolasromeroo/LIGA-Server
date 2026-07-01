import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { MatchService } from './match.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';

@Controller('match')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Post()
  create(@Body() createMatchDto: CreateMatchDto) {
    return this.matchService.create(createMatchDto);
  }

  @Get()
  findAll() {
    return this.matchService.findAll();
  }

  @Get('upcoming')
  findUpcoming() {
    return this.matchService.findUpcoming();
  }

  @Get('live')
  findLive() {
    return this.matchService.findLive();
  }

  @Get('history')
  findHistory() {
    return this.matchService.findHistory();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.matchService.findOne(+id);
  }

  // @Patch(':id/start')
  // startMatch(@Param('id') id: string) {
  //   return this.matchService.startMatch(+id);
  // }

  // @Patch(':id/finish')
  // finishMatch(@Param('id') id: string, @Body('result') result: string) {
  //   return this.matchService.finishMatch(+id, result);
  // }

  @Patch(':id/cancel')
  cancelMatch(@Param('id') id: string) {
    return this.matchService.cancelMatch(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMatchDto: UpdateMatchDto) {
    return this.matchService.update(+id, updateMatchDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.matchService.remove(+id);
  }
}
