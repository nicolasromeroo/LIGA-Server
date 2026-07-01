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
import { CardsService } from './cards.service';
// import { CreateCardDto } from './dto/create-card.dto';
// import { UpdateCardDto } from './dto/update-card.dto';
import { AddCardDto } from './dto/add-card.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  // @UseGuards(JwtAuthGuard)
  @Post('create-card')
  createPlayerCard(
    @Body() body: { playerId: number; userId: number; rarity: string },
  ) {
    if (!body.playerId) throw new Error('playerId es requerido');
    if (!body.userId) throw new Error('userId es requerido');
    if (!body.rarity) throw new Error('rarity es requerido');
    return this.cardsService.createPlayerCard(
      body.playerId,
      body.userId,
      body.rarity,
    );
  }

  // @UseGuards(JwtAuthGuard)
  @Post('add-to-mazo')
  create(@Body() addCardDto: AddCardDto) {
    return this.cardsService.addCardToMazo(
      addCardDto.mazoId,
      addCardDto.cardId,
    );
  }

  @Get()
  findAll() {
    return this.cardsService.findAll();
  }

  // Cartas del usuario autenticado.
  @UseGuards(JwtAuthGuard)
  @Get('my')
  findMine(@Req() req: any) {
    return this.cardsService.findByUser(req.user.sub);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.cardsService.findByUser(+userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cardsService.findOne(+id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateCardDto: UpdateCardDto) {
  //   return this.cardsService.update(+id, updateCardDto);
  // }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cardsService.remove(+id);
  }
}
