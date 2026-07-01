import { Response } from 'express';

interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  stack?: string;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
  meta?: ApiSuccessResponse<T>['meta']
): Response => {
  const response: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
    ...(meta && { meta }),
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  errors?: Record<string, string[]>
): Response => {
  const response: ApiErrorResponse = {
    success: false,
    message,
    ...(errors && { errors }),
  };
  return res.status(statusCode).json(response);
};
