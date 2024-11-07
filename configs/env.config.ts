import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({
  path: path.resolve(process.cwd(), './.env'),
});

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  isProd: process.env.NODE_ENV === 'production',
  env: process.env.ENV as 'test' | 'live',
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
  session: {
    secret: process.env.SESSION_SECRET,
  },
  cloudinary: {
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY,
    email: process.env.GOOGLE_EMAIL,
    emailPassword: process.env.GOOGLE_EMAIL_PASSWORD,
    clientId: {
      ios: process.env.GOOGLE_IOS_CLIENT_ID,
      android: process.env.GOOGLE_ANDROID_CLIENT_ID,
    },
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
  },
  sendChamp: {
    apiKey: process.env.SEND_CHAMP_API_KEY,
    baseUrl: process.env.SEND_CHAMP_BASE_URL,
    senderId: process.env.SEND_CHAMP_SENDER_ID,
  },
  africasTalking: {
    apiKey: process.env.AFRICAS_TALKING_API_KEY,
    baseUrl: process.env.AFRICAS_TALKING_BASE_URL,
    username: process.env.AFRICAS_TALKING_USERNAME,
    shortCode: process.env.AFRICAS_TALKING_SHORT_CODE,
  },
  qoreId: {
    baseUrl: process.env.QOREID_BASE_URL,
    clientId: process.env.QOREID_CLIENT_ID,
    secret: process.env.QOREID_CLIENT_SECRET,
  },
  paystack: {
    testKey: process.env.PAYSTACK_SECRET_TEST_KEY,
    liveKey: process.env.PAYSTACK_SECRET_LIVE_KEY,
  },
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    port: parseInt(process.env.REDIS_PORT, 10),
    database: parseInt(process.env.REDIS_DATABASE, 10) ?? 0,
  },
};
