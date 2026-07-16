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

    // Multer-Fehler (z.B. Upload überschreitet das Größenlimit) sind keine
    // HttpException – hier als saubere 4xx-Antwort abbilden statt als 500.
    const multer = asMulterError(exception);

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : (multer?.status ?? HttpStatus.INTERNAL_SERVER_ERROR);
    const exceptionResponse = isHttpException ? exception.getResponse() : undefined;

    const message =
      typeof exceptionResponse === "string"
        ? exceptionResponse
        : (multer?.message ??
          (exceptionResponse as { message?: string | string[] })?.message ??
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
      error: isHttpException ? exception.name : multer ? "PayloadTooLarge" : "InternalServerError",
      requestId,
    });
  }
}

/** Erkennt multer-Fehler (Uploads) und bildet die relevanten Codes auf HTTP ab. */
function asMulterError(exception: unknown): { status: number; message: string } | undefined {
  if (
    typeof exception !== "object" ||
    exception === null ||
    (exception as { name?: string }).name !== "MulterError"
  ) {
    return undefined;
  }
  const code = (exception as { code?: string }).code;
  if (code === "LIMIT_FILE_SIZE") {
    return { status: HttpStatus.PAYLOAD_TOO_LARGE, message: "Datei zu groß." };
  }
  return { status: HttpStatus.BAD_REQUEST, message: "Upload fehlgeschlagen." };
}
