import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = BusinessErrorCode.COMMON_ERROR;
    let message = '服务器内部异常，请稍后重试';

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      code = exception.getErrorCode();
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = Array.isArray(resObj.message) ? resObj.message.join(', ') : resObj.message || exception.message;
        code = resObj.code || (status === HttpStatus.UNAUTHORIZED ? BusinessErrorCode.UNAUTHORIZED : (status === HttpStatus.FORBIDDEN ? BusinessErrorCode.FORBIDDEN : BusinessErrorCode.PARAM_INVALID));
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      // 未捕获异常：生产环境绝不把原始错误消息（可能含数据库结构/文件路径）返回给客户端
      const isProduction = process.env.NODE_ENV === 'production';
      message = isProduction ? '服务器内部异常，请稍后重试' : exception.message;
      this.logger.error(`Unhandled Exception at ${request.method} ${request.url}: ${exception.stack}`);
    }

    response.status(status).json({
      code,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
