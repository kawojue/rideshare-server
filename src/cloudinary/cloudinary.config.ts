import { registerAs } from '@nestjs/config'
import { config } from 'configs/env.config'

export default registerAs('cloudinary', () => (config.cloudinary))