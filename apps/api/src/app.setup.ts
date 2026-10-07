import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { Env } from './config/env.validation';

/** Shared by main.ts and the e2e tests so tests exercise exactly what production runs. */
export function configureApp(app: INestApplication): OpenAPIObject {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }).split(',').map((o) => o.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // ...and reject requests that send them
      transform: true, // payloads become DTO instances
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('MONEYBOOK API')
      .setDescription('Personal finance management API. Money values are decimal strings.')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document);
  return document;
}
