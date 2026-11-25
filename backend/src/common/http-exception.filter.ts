import { Catch, HttpException } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class SafeHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const messages: Record<number, string> = {
      400: 'Invalid request',
      401: 'Authentication failed',
      403: 'Forbidden',
      404: 'Not found',
      405: 'Method not allowed',
      413: 'Request too large',
      415: 'Unsupported media type',
      429: 'Too many requests',
    };
    // Do not echo payloads, tokens, URLs, SQL, stack traces, or internal error messages.
    response
      .status(status)
      .json({
        statusCode: status,
        message: messages[status] ?? 'Internal server error',
      });
  }
}
