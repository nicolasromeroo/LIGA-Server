import { Test, TestingModule } from '@nestjs/testing';
import { RoomService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RoomService', () => {
  let service: RoomService;

  const mockPrismaService = {
    room: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
