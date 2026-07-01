import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API de FootSport')
    .setDescription('Documentación de la API de FootSport - Sistema de juego de cartas deportivas')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticación y manejo de usuarios')
    .addTag('mazo', 'Gestión de mazos de cartas')
    .addTag('packs', 'Sistema de packs y cartas')
    .addTag('rooms', 'Salas de juego multijugador')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'Authorization'],
    credentials: true,
  });

  const ioAdapter = new IoAdapter(app);
  app.useWebSocketAdapter(ioAdapter);

  // Configure Socket.IO options
  const socketIoOptions = {
    cors: true,
    allowEIO3: true,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  };

  await app.listen(3000, () => {
    console.log('Server running on port 3000');
    console.log('WebSocket server is ready');
  });
}

bootstrap().catch(err => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
