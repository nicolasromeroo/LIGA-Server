import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';

import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

import { RoomService } from './rooms.service';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true
  },
  namespace: '/',
  transports: ['websocket', 'polling']
})
export class RoomGateway implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  public server: Server;

  constructor(private readonly roomService: RoomService) {}

  onModuleInit() {
    this.server.on('connection', (socket: Socket) => {
      console.log(`Cliente conectado en onModuleInit: ${socket.id}`);
    });
  }

  async handleConnection(client: Socket) {
    console.log(`handleConnection - Cliente: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
    this.roomService.onPlayerDisconnected(client.id);
  }

  @SubscribeMessage('createPrivateRoom')
  createPrivateRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody('pointsInGame') pointsInGame: number,
  ) {
    const { name, userId } = socket.handshake.auth;
    const room = this.roomService.createPrivateRoom(
      socket.id,
      name,
      userId ? Number(userId) : undefined,
      pointsInGame,
    );

    socket.join(room.id);
    this.server.to(room.id).emit('roomUpdated', room);
    return { status: 'ok', room };
  }

  @SubscribeMessage('joinPrivateRoom')
  joinPrivateRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody('roomCode') roomCode: string,
  ) {
    const { name, userId } = socket.handshake.auth;
    const room = this.roomService.joinPrivateRoom(
      socket.id,
      name,
      userId ? Number(userId) : undefined,
      roomCode,
    );

    if (!room) {
      return { status: 'error', message: 'Sala no encontrada o llena' };
    }

    socket.join(room.id);
    this.server.to(room.id).emit('roomUpdated', room);

    if (room.status === 'selecting') {
      this.server.to(room.id).emit('selectionPhase');
    }

    return { status: 'ok', room };
  }

  @SubscribeMessage('selectPlayers')
  async selectPlayers(
    @ConnectedSocket() socket: Socket,
    @MessageBody('roomId') roomId: string,
    @MessageBody('selectedPlayers') selectedPlayers: string[],
  ) {
    const room = this.roomService.selectPlayers(
      roomId,
      socket.id,
      selectedPlayers,
    );

    if (!room) {
      return { status: 'error', message: 'Error al seleccionar jugadores' };
    }

    this.server.to(room.id).emit('roomUpdated', room);

    // Cuando ambos seleccionaron: arranca la batalla y se resuelve en el server.
    if (room.status === 'playing') {
      this.server.to(room.id).emit('gameStarted', room);
      const result = await this.roomService.resolveBattle(room.id);
      if (result) {
        this.server.to(room.id).emit('gameFinished', {
          room,
          winner: result.winner,
          score: result.score,
          pointsWon: result.pointsWon,
          result,
        });
      }
    }

    return { status: 'ok', room };
  }

  @SubscribeMessage('finishGame')
  finishGame(
    @ConnectedSocket() socket: Socket,
    @MessageBody('roomId') roomId: string,
    @MessageBody('winner') winner: string,
  ) {
    const room = this.roomService.finishGame(roomId, winner);
    
    if (!room) {
      return { status: 'error', message: 'Error al finalizar el juego' };
    }

    this.server.to(room.id).emit('gameFinished', {
      room,
      winner,
      pointsWon: room.pointsInGame
    });

    return { status: 'ok', room };
  }
}