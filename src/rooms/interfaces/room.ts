export interface PlayerInfo {
    socketId: string;
    username: string;
    userId?: number;
}

export interface BattleResult {
    winner: string; // username del ganador o 'Empate'
    score: string; // "a-b"
    scoreA: number;
    scoreB: number;
    powerA: number;
    powerB: number;
    pointsWon: number;
}

export interface Room {
    id: string;
    isPrivate: boolean;
    roomCode?: string;
    playersUsernames: string[];
    players: PlayerInfo[]; // info por socket (incluye userId para otorgar puntos)
    playersSelected: { [socketId: string]: string[] };
    maxPlayers: number;
    pointsInGame: number;
    status: 'waiting' | 'selecting' | 'playing' | 'finished';
    winner?: string;
    result?: BattleResult;
}
