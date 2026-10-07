import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Request, Response } from 'express';

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errors?: string[];
  path: string;
  timestamp: string;
}

interface NormalizedError {
  statusCode: number;
  message: string;
  errors?: string[];
}

/** One place that turns every thrown error into the same JSON shape. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, errors } = this.normalize(exception);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      ...(errors ? { errors } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    };
    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') return { statusCode, message: res };

      const { message } = res as { message?: string | string[] };
      // class-validator errors arrive as string[] -> expose them as `errors`.
      if (Array.isArray(message)) {
        return { statusCode, message: 'Validation failed', errors: message };
      }
      return { statusCode, message: message ?? exception.message };
    }

    if (exception instanceof PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return { statusCode: HttpStatus.CONFLICT, message: 'A record with these values already exists' };
        case 'P2003':
          return { statusCode: HttpStatus.CONFLICT, message: 'Record is referenced by other data or references missing data' };
        case 'P2025':
          return { statusCode: HttpStatus.NOT_FOUND, message: 'Record not found' };
        default:
          break;
      }
    }

    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}
