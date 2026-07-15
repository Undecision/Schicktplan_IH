import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { PinoLogger } from "nestjs-pino";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : undefined;

    const message =
      typeof exceptionResponse === "string"
        ? exceptionResponse
        : ((exceptionResponse as { message?: string | string[] })?.message ??
          (exception as Error)?.message ??
          "Interner Serverfehler");

    const requestId = (request.headers["x-request-id"] as string) ?? undefined;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({ err: exception, requestId, path: request.url }, "Unbehandelte Ausnahme");
    } else {
      this.logger.warn({ requestId, path: request.url, status }, "Client-Fehler");
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: isHttpException ? exception.name : "InternalServerError",
      requestId,
    });
  }
}
