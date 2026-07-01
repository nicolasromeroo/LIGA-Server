import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { MazoService } from './mazo.service';
import { CreateMazoDto } from './dto/create-mazo.dto';
import { UpdateMazoDto } from './dto/update-mazo.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('mazo')
export class MazoController {
  constructor(private readonly mazoService: MazoService) {}

  // @UseGuards(JwtAuthGuard)
  @Post('create')
  create(@Body() createMazoDto: CreateMazoDto) {
    return this.mazoService.create(createMazoDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-mazos')
  findAll(@Body('userId') userId: number) {
    return this.mazoService.myMazos(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mazoService.findMazo(+id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateMazoDto: UpdateMazoDto) {
  //   return this.mazoService.update(+id, updateMazoDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.mazoService.remove(+id);
  // }
}
