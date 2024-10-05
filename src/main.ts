import * as express from 'express';
import * as passport from 'passport';
import * as session from 'express-session';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import * as cookieParser from 'cookie-parser';
import { CustomValidationPipe } from 'helpers/validations';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const PORT: number = parseInt(process.env.PORT, 10) || 3001;
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      `http://localhost:${PORT}`,
      'https://api.rideshareng.com',
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: 'GET,POST,DELETE,PATCH,PUT,OPTIONS',
  });

  app.use(express.json({ limit: 7 << 20 }));
  app.use(cookieParser());
  app.use(
    session({
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET!,
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
    .addServer(`https://api.rideshareng.com`, 'Staging')
    .addServer(`http://localhost:${PORT}`, 'Local')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerOptions);
  SwaggerModule.setup('docs', app, swaggerDocument);

  try {
    await app.listen(PORT);
    console.log(`http://localhost:${PORT}`);
  } catch (err) {
    console.error(err);
  }
}
bootstrap();
