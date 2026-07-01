import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const authHeader = client.handshake.headers.authorization;
      
      console.log('Handshake headers:', client.handshake.headers);
      console.log('Auth header:', authHeader);

      if (!authHeader) {
        console.log('No authorization header found');
        return false;
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        console.log('No token found in auth header');
        return false;
      }

      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET
        });
        console.log('Token verified, payload:', payload);
        client['user'] = payload;
        return true;
      } catch (jwtError) {
        console.log('JWT verification failed:', jwtError);
        return false;
      }
    } catch (error) {
      console.error('Guard error:', error);
      return false;
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    const [type, token] = client.handshake.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}