import helmet from "helmet";
import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { AppConfig } from "./config/configuration";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService<AppConfig, true>);
  app.useLogger(app.get(Logger));

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: configService.get("cors", { infer: true }).origin,
    credentials: true,
  });

  const globalPrefix = configService.get("api", { infer: true }).globalPrefix;
  app.setGlobalPrefix(globalPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Schichtbuch API")
    .setDescription("Cloudbasiertes Instandhaltungsschichtbuch – REST-API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document);

  const { port, host } = configService.get("api", { infer: true });
  await app.listen(port, host);
}

bootstrap();
