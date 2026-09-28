import { AuthService } from './auth.service';
import { LoginDto, WechatLoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        token: string;
        user: {
            id: string;
            username: string;
            nickname: string;
            avatar: string;
            phone: string;
            role: string;
        };
    }>;
    wechatLogin(dto: WechatLoginDto): Promise<{
        token: string;
        user: {
            id: string;
            nickname: string;
            avatar: string;
            phone: string;
            role: string;
        };
    }>;
    getProfile(userId: string): Promise<{
        id: string;
        createdAt: Date;
        username: string;
        nickname: string;
        avatar: string;
        phone: string;
        role: string;
    }>;
}
