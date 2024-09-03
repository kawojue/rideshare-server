import * as bcrypt from 'bcrypt'
import * as core from 'decrypt-core'
import { Injectable } from '@nestjs/common'
import { config } from 'configs/env.config'

@Injectable()
export class EncryptionService {
    async hash(password: string, saltRounds: number = 10): Promise<string> {
        const salt = await bcrypt.genSalt(saltRounds)
        return await bcrypt.hash(password, salt)
    }

    async compare(plain: string | Buffer, hashed: string): Promise<boolean> {
        return await bcrypt.compare(plain, hashed)
    }

    cipherSync(plain: string): string {
        return core.encrypt(plain, config.encryption.key)
    }

    decipherSync(encryted: string): string {
        return core.decrypt(encryted, config.encryption.key)
    }
}