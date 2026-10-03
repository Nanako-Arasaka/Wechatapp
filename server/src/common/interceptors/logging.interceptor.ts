import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    // 注意：绝不在日志中记录 request.body，防止密码、手机号、核销码等敏感信息泄露
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = ctx.getResponse();
          const statusCode = response.statusCode;
          const delay = Date.now() - now;
          this.logger.log(`[${method}] ${url} ${statusCode} +${delay}ms`);
        },
        error: (err) => {
          const delay = Date.now() - now;
          this.logger.error(`[${method}] ${url} Failed: ${err.message} +${delay}ms`);
        },
      }),
    );
  }
}
