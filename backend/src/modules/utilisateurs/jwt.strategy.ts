import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UtilisateursService } from './utilisateurs.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private utilisateursService: UtilisateursService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret || jwtSecret.trim().length === 0) {
      throw new Error(
        'FATAL SECURITY CONFIGURATION ERROR: JWT_SECRET environment variable is not defined or is empty! ' +
        'Cannot start application with insecure authentication.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Support SSE EventSource : l'API EventSource du navigateur ne permet pas de définir de headers Authorization.
        // Sécurité ANSSI/OWASP : restreint strictement aux flux SSE pour éviter toute fuite sur les endpoints REST.
        (req: any) => {
          if (req?.query?.token && (req.path?.includes('sse') || req.url?.includes('sse'))) {
            return req.query.token;
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    const user = await this.utilisateursService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
