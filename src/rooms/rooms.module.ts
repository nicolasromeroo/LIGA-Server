import { Module, forwardRef } from '@nestjs/common';
import { RoomService } from './rooms.service';
import { RoomGateway } from './rooms.gateway';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: 'tu_clave_secreta', // Reemplaza esto con tu clave secreta real
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [RoomGateway, RoomService],
})
export class RoomsModule {}
