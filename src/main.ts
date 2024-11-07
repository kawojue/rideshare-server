import { v4 as uuid } from 'uuid';
import * as express from 'express';
import * as passport from 'passport';
import * as session from 'express-session';
import { NestFactory } from '@nestjs/core';
import { config } from 'configs/env.config';
import { AppModule } from './app/app.module';
import * as cookieParser from 'cookie-parser';
import { CustomValidationPipe } from 'helpers/validations';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

let PORT: number;
async function bootstrap() {
  PORT = config.port;
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      `http://localhost:${PORT}`,
      'https://mobileapi.rideshareng.com',
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: 'GET,POST,DELETE,PATCH,PUT,OPTIONS',
  });

  app.use(express.json({ limit: 7 << 20 }));
  app.use(cookieParser());
  app.use(
    session({
      genid: function (req) {
        return uuid();
      },
      resave: false,
      saveUninitialized: false,
      secret: config.session.secret,
      cookie: { secure: config.isProd },
    }),
  );
  app.use(passport.session());
  app.use(passport.initialize());
  app.useGlobalPipes(
    new CustomValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerOptions = new DocumentBuilder()
    .setTitle('RideShare API')
    .setVersion('1.7.2')
    .addServer(`https://mobileapi.rideshareng.com`, 'Staging')
    .addServer(`http://localhost:${PORT}`, 'Local')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerOptions);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(PORT);
}

bootstrap()
  .then(() => console.info(`http://localhost:${PORT}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
