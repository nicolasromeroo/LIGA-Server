import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async register(createAuthDto: CreateAuthDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createAuthDto.email }
    });

    if (existingUser) {
      throw new UnauthorizedException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(createAuthDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: createAuthDto.email,
        password: hashedPassword,
        name: createAuthDto.name,
        role: createAuthDto.role || 'USER',
        points: createAuthDto.role === 'ADMIN' ? 999999 : 1000 // More points for admin
      }
    });

    const payload = { 
      sub: user.id,
      email: user.email,
      role: user.role 
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        points: user.points
      }
    };
  }

  async login(dto: LoginAuthDto) {
    if (!dto.email) {
      throw new UnauthorizedException('Email is required');
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email: dto.email.toLowerCase()
        }
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(dto.password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = { 
        sub: user.id,
        email: user.email,
        role: user.role 
      };

      return {
        access_token: await this.jwtService.signAsync(payload),
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          points: user.points
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('An error occurred during login');
    }
  }

  async profile(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        playerCards: {
          include: {
            player: true
          }
        },
        packs: true
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove sensitive information
    const { password, ...result } = user;
    return result;
  }

  async update(id: number, updateAuthDto: UpdateAuthDto) {
    const user = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let updateData: any = { ...updateAuthDto };

    // If password is being updated, hash it
    if (updateAuthDto.password) {
      updateData.password = await bcrypt.hash(updateAuthDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData
    });

    const { password, ...result } = updatedUser;
    return result;
  }

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id }
    });

    return { message: 'User deleted successfully' };
  }
}
