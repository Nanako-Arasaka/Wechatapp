import { Injectable, CanActivate, ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<(Role | string)[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new BusinessException('未登录或登录已失效', BusinessErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }
    
    // 超级管理员拥有所有权限
    if (user.role === 'SUPER_ADMIN' || user.role === Role.SUPER_ADMIN) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new BusinessException('暂无权限访问该资源', BusinessErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN);
    }
    return true;
  }
}
