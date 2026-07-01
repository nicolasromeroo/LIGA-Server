import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Room, BattleResult } from './interfaces/room';

@Injectable()
export class RoomService {
  private rooms: Record<string, Room> = {};
  private playerRooms: Record<string, string> = {}; // socketId -> roomId

  constructor(private readonly prisma: PrismaService) {}

  generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  createPrivateRoom(
    socketId: string,
    username: string,
    userId: number | undefined,
    pointsInGame: number,
  ): Room {
    const roomCode = this.generateRoomCode();
    const room: Room = {
      id: `private-${roomCode}`,
      isPrivate: true,
      roomCode,
      playersUsernames: [username],
      players: [{ socketId, username, userId }],
      playersSelected: {},
      maxPlayers: 2,
      pointsInGame: pointsInGame || 100,
      status: 'waiting',
    };

    this.rooms[room.id] = room;
    this.playerRooms[socketId] = room.id;
    return room;
  }

  joinPrivateRoom(
    socketId: string,
    username: string,
    userId: number | undefined,
    roomCode: string,
  ): Room | null {
    const room = Object.values(this.rooms).find((r) => r.roomCode === roomCode);

    if (!room || room.players.length >= room.maxPlayers) {
      return null;
    }

    room.playersUsernames.push(username);
    room.players.push({ socketId, username, userId });
    this.playerRooms[socketId] = room.id;

    if (room.players.length === room.maxPlayers) {
      room.status = 'selecting';
    }

    return room;
  }

  selectPlayers(
    roomId: string,
    socketId: string,
    selectedPlayers: string[],
  ): Room | null {
    const room = this.rooms[roomId];
    if (!room || selectedPlayers.length !== 5) {
      return null;
    }

    room.playersSelected[socketId] = selectedPlayers;

    if (Object.keys(room.playersSelected).length === room.maxPlayers) {
      room.status = 'playing';
    }

    return room;
  }

  // Suma el "overall" de las cartas seleccionadas (potencia del equipo).
  private async teamPower(cardIds: string[]): Promise<number> {
    const ids = cardIds.map((id) => Number(id)).filter((n) => !Number.isNaN(n));
    if (!ids.length) return 0;
    const cards = await this.prisma.playerCard.findMany({
      where: { id: { in: ids } },
      include: { player: true },
    });
    return cards.reduce((sum, c) => sum + (c.player?.overall ?? 50), 0);
  }

  // Resuelve la batalla: calcula potencias, define ganador y otorga puntos.
  async resolveBattle(roomId: string): Promise<BattleResult | null> {
    const room = this.rooms[roomId];
    if (!room) return null;

    const [a, b] = room.players;
    const powerA = await this.teamPower(room.playersSelected[a?.socketId] ?? []);
    const powerB = await this.teamPower(room.playersSelected[b?.socketId] ?? []);

    // Goles proporcionales a la potencia, con un poco de azar.
    const total = powerA + powerB || 1;
    let scoreA = Math.round((powerA / total) * 4 + Math.random());
    let scoreB = Math.round((powerB / total) * 4 + Math.random());

    let winnerInfo: (typeof room.players)[number] | null = null;
    if (powerA > powerB) {
      winnerInfo = a;
      if (scoreA <= scoreB) scoreA = scoreB + 1;
    } else if (powerB > powerA) {
      winnerInfo = b;
      if (scoreB <= scoreA) scoreB = scoreA + 1;
    } else {
      scoreA = scoreB; // empate exacto
    }

    const pointsWon = winnerInfo ? room.pointsInGame : 0;

    // Acreditar puntos al ganador en la base de datos.
    if (winnerInfo?.userId && pointsWon > 0) {
      try {
        await this.prisma.user.update({
          where: { id: winnerInfo.userId },
          data: { points: { increment: pointsWon } },
        });
      } catch (err) {
        console.error('No se pudieron acreditar puntos PvP:', err?.message);
      }
    }

    const result: BattleResult = {
      winner: winnerInfo ? winnerInfo.username : 'Empate',
      score: `${scoreA}-${scoreB}`,
      scoreA,
      scoreB,
      powerA,
      powerB,
      pointsWon,
    };

    room.status = 'finished';
    room.winner = result.winner;
    room.result = result;
    return result;
  }

  finishGame(roomId: string, winner: string): Room | null {
    const room = this.rooms[roomId];
    if (!room) {
      return null;
    }
    room.status = 'finished';
    room.winner = winner;
    return room;
  }

  onPlayerDisconnected(socketId: string) {
    const roomId = this.playerRooms[socketId];
    if (roomId) {
      const room = this.rooms[roomId];
      if (room) {
        room.players = room.players.filter((p) => p.socketId !== socketId);
        room.playersUsernames = room.players.map((p) => p.username);
        delete room.playersSelected[socketId];
        if (room.players.length === 0) {
          delete this.rooms[roomId];
        }
      }
      delete this.playerRooms[socketId];
    }
  }

  getRoomByCode(roomCode: string): Room | null {
    return (
      Object.values(this.rooms).find((room) => room.roomCode === roomCode) ||
      null
    );
  }

  getRoomById(roomId: string): Room | null {
    return this.rooms[roomId] || null;
  }
}
