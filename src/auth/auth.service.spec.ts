import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('Servicio de Autenticación', () => {
  let servicio: AuthService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    servicio = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('debería estar definido', () => {
    expect(servicio).toBeDefined();
  });

  describe('inicio de sesión', () => {
    it('debería devolver un token JWT cuando las credenciales son válidas', async () => {
      const usuarioMock = {
        id: 1,
        email: 'prueba@prueba.com',
        password: await bcrypt.hash('contraseña123', 10),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(usuarioMock);
      mockJwtService.signAsync.mockResolvedValue('token_jwt');

      const resultado = await servicio.login({
        email: 'prueba@prueba.com',
        password: 'contraseña123',
      });

      expect(resultado).toHaveProperty('access_token');
      expect(resultado.access_token).toBe('token_jwt');
    });

    it('debería lanzar un error cuando el usuario no existe', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        servicio.login({
          email: 'noexiste@prueba.com',
          password: 'contraseña123',
        }),
      ).rejects.toThrow();
    });
  });
});