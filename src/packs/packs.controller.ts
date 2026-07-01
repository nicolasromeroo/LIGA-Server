import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PacksService } from './packs.service';
import { OpenPackDto } from './dto/open-pack.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
// import { UpdatePackDto } from './dto/update-pack.dto';

@Controller('packs')
export class PacksController {
  constructor(private readonly packsService: PacksService) {}

  // Comprar y abrir un sobre por tipo (free, gold, elite, legendary).
  @UseGuards(JwtAuthGuard)
  @Post('buy')
  buy(@Req() req: any, @Body('type') type: string) {
    return this.packsService.buyAndOpen(req.user.sub, type);
  }

  @Post('open/:id')
  open(@Param('id') id: string) {
    return this.packsService.openPack(parseInt(id));
  }

  @Get('all')
  findAll() {
    return this.packsService.findAllPacks();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.packsService.findOne(+id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updatePackDto: UpdatePackDto) {
  //   return this.packsService.update(+id, updatePackDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.packsService.remove(+id);
  }
}
