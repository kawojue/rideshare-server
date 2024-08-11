import { Request } from 'express'
import { Profile } from 'passport'
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, VerifyCallback } from 'passport-google-oauth20'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor() {
        super({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: 'http://localhost:3001/auth/google/callback',
            scope: ['email', 'profile'],
            passReqToCallback: true,
        })
    }

    async validate(
        request: Request,
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback
    ) {
        const { emails } = profile
        const user = {
            email: emails[0].value,
            providerId: String(profile.id),
        }
        const payload = {
            user,
            accessToken,
            refreshToken,
        }

        done(null, payload)
    }
}