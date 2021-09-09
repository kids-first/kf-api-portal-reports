import { Client } from '@elastic/elasticsearch';
import { Request, Response, NextFunction } from 'express';

const NOT_FOUND_STATUS_CODE = 404;
const INTERNAL_ERROR_STATUS_CODE = 500;

export class ApplicationError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode

        this.name = this.constructor.name;

        Error.captureStackTrace(this, this.constructor);
    }
}

export const reportGenerationErrorHandler = (err: any, es: Client): void => {
    console.error(`An error occurs while generating the report`, err);
    es && es.close();
    throw new ApplicationError(err.message || err.details || 'An unknown error occurred.', INTERNAL_ERROR_STATUS_CODE);
};

export const unknownEndpointHandler = (_req: Request, _res: Response): void => {
    const notFoundErr = new ApplicationError('Not Found', NOT_FOUND_STATUS_CODE);
    throw notFoundErr;
};

export const globalErrorHandler = (
    err: Error | ApplicationError,
    req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    const statusCode = err instanceof ApplicationError ? err.statusCode : INTERNAL_ERROR_STATUS_CODE;
    res.status(statusCode);
    res.send({
        message: req.app.get('env') === 'development' ? err.message : {},
    });
};

export const globalErrorLogger = (
    err: Error | ApplicationError,
    _req: Request,
    _res: Response,
    next: NextFunction,
): void => {
    console.error(err.stack);
    next(err);
};
