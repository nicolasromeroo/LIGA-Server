import { Test, TestingModule } from '@nestjs/testing';
import { RoomGateway } from './rooms.gateway';
import { RoomService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RoomGateway', () => {
  let gateway: RoomGateway;

  const mockRoomService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomGateway,
        {
          provide: RoomService,
          useValue: mockRoomService,
        },
      ],
    }).compile();

    gateway = module.get<RoomGateway>(RoomGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
