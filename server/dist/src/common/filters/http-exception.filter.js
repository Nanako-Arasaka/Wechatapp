"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const business_exception_1 = require("../exceptions/business.exception");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    constructor() {
        this.logger = new common_1.Logger(AllExceptionsFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let code = business_exception_1.BusinessErrorCode.COMMON_ERROR;
        let message = '服务器内部异常，请稍后重试';
        if (exception instanceof business_exception_1.BusinessException) {
            status = exception.getStatus();
            code = exception.getErrorCode();
            message = exception.message;
        }
        else if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            if (typeof res === 'object' && res !== null) {
                const resObj = res;
                message = Array.isArray(resObj.message) ? resObj.message.join(', ') : resObj.message || exception.message;
                code = resObj.code || (status === common_1.HttpStatus.UNAUTHORIZED ? business_exception_1.BusinessErrorCode.UNAUTHORIZED : (status === common_1.HttpStatus.FORBIDDEN ? business_exception_1.BusinessErrorCode.FORBIDDEN : business_exception_1.BusinessErrorCode.PARAM_INVALID));
            }
            else {
                message = exception.message;
            }
        }
        else if (exception instanceof Error) {
            message = exception.message;
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
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=http-exception.filter.js.map