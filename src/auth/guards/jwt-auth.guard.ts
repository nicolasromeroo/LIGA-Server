import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }
}

// ejemplo de uso en controlador :
// @Controller('users')
// export class UsersController {
//     @UseGuards(JwtAuthGuard)
//     @Get('profile')
//     getProfile() {
//         return 'Protected route';    
//     }
// }