<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# FootSport API

API para juego de cartas deportivas desarrollada con NestJS

## Características

- Autenticación JWT
- WebSockets para juego en tiempo real
- Sistema de mazos y cartas
- Documentación con Swagger
- Tests unitarios y E2E

## Tecnologías

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Socket.io
- Docker
- Kubernetes

## Prerrequisitos

- Node.js 18+
- npm/pnpm
- Docker (opcional)
- kubectl (opcional)

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/footsport.git

# Instalar dependencias
npm install

# Crear archivo .env basado en .env.example
cp .env.example .env

# Ejecutar migraciones de Prisma
npx prisma migrate dev
```

## Ejecución

```bash
# Desarrollo
npm run start:dev

# Producción
npm run start:prod

# Docker
docker-compose up
```

## Tests

```bash
# Tests unitarios
npm run test

# Tests E2E
npm run test:e2e
```

## Despliegue

### Docker
El proyecto incluye Dockerfile y docker-compose.yml para facilitar el despliegue:

```bash
docker-compose up -d
```

### Kubernetes
Los archivos de configuración están en la carpeta /k8s:

```bash
kubectl apply -f k8s/
```

## Documentación

- Swagger UI: http://localhost:3000/api
- Documentación detallada en /docs

#MIT
