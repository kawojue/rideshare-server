import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({
    path: path.resolve(process.cwd(), './.env'),
})

export const config = {
    isProd: process.env.NODE_ENV === "production",
    jwt: {
        secret: process.env.JWT_SECRET,
    },
    encryption: {
        key: process.env.ENCRYPTION_KEY
    },
    session: {
        secret: process.env.SESSION_SECRET
    },
    cloudinary: {
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
    google: {
        email: process.env.EMAIL,
        emailPassword: process.env.EMAIL_PSWD,
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
        senderId: process.env.SEND_CHAMP_SENDER_ID
    },
    qoreId: {
        clientId: process.env.QOREID_CLIENT_ID,
        secret: process.env.QOREID_CLIENT_SECRET
    }
}