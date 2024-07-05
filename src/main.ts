import * as express from 'express'
import * as passport from 'passport'
import { AppModule } from './app.module'
import * as session from 'express-session'
import { NestFactory } from '@nestjs/core'
import * as cookieParser from 'cookie-parser'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const PORT: number = parseInt(process.env.PORT, 10) || 3001
  const app = await NestFactory.create(AppModule)
  const expressApp = app.getHttpAdapter().getInstance()

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      `http://localhost:${PORT}`,
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: 'GET,POST,DELETE,PATCH,PUT,OPTIONS',
  })

  expressApp.set('trust proxy', true)
  app.use(express.json({ limit: 7 << 20 }))
  app.use(cookieParser())
  app.use(
    session({
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET!,
    }),
  )
  app.use(passport.session())
  app.use(passport.initialize())
  app.useGlobalPipes(new ValidationPipe({ transform: true }))

  const swaggerOptions = new DocumentBuilder()
    .setTitle('RideShare API')
    .setVersion('1.7.2')
    .addServer(`http://localhost:${PORT}`, 'Local')
    .addBearerAuth()
    .build()

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerOptions)
  SwaggerModule.setup('docs', app, swaggerDocument)

  try {
    await app.listen(PORT)
    console.log(`http://localhost:${PORT}`)
  } catch (err) {
    console.error(err.message)
  }
}
bootstrap()