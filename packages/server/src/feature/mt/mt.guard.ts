import { ExecutionContext, Injectable } from '@nestjs/common';
import { IUser } from '@scspace-depot/types/user';
import { UserUtils } from '@scspace-depot/utils/user.utils';
import { MT_ALLOW_GUEST } from '@scspace-depot/consts/mt.const';
import { OptionalJwtAuthGuard } from '@scspace-server/feature/auth/jwt/jwt.guard';

/**
 * Manager/Admin check, except while MT_ALLOW_GUEST is on: then everyone passes and `?mtGuest=<n>`
 * turns the request into guest player -n (negative so it never collides with a real user id).
 */
abstract class MtGuard extends OptionalJwtAuthGuard {
    protected abstract allowed(type: number): boolean;

    async canActivate(context: ExecutionContext): Promise<boolean> {
        await super.canActivate(context);
        const request = context.switchToHttp().getRequest();
        if (!MT_ALLOW_GUEST) return !!request.user && this.allowed((request.user as IUser).type);

        const guest = Number(request.query?.mtGuest);
        if (Number.isInteger(guest) && guest > 0 && guest <= 1e9) {
            request.user = { id: -guest, nameKr: `게스트${guest}` } as IUser;
        }
        return true;
    }
}

@Injectable()
export class MtPlayerGuard extends MtGuard {
    protected allowed(type: number) {
        return UserUtils.isManager(type);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // players need an identity even in guest mode
        return (await super.canActivate(context)) && !!context.switchToHttp().getRequest().user;
    }
}

@Injectable()
export class MtAdminGuard extends MtGuard {
    protected allowed(type: number) {
        return UserUtils.isAdmin(type);
    }
}
