type Status = 'ACTIVE' | 'SUSPENDED';
type Roles = 'ADMIN' | 'DRIVER' | 'PASSENGER' | 'MODERATOR';

interface UploadOption {
  file: Express.Multer.File | Buffer;
  folder: string;
  maxSize?: number;
  public_id?: string;
  mimeTypes?: string[];
}

interface IGenOTP {
  max?: number;
  count?: number;
  otp?: string;
  otp_expiry?: Date;
}

interface JwtPayload {
  sub: string;
  role?: Roles;
  status?: Status;
  deviceId?: string;
}

interface JwtDecoded extends JwtPayload {
  iat: number;
  exp: number;

  email: string;
  phone: string;
  lastname: string;
  firstname: string;
  middlename: string;
  regionCode: string;
  countryCode: string;
  customerCode: string;
}

interface Attachment {
  size: number;
  type: string;
  url: string;
  public_id: string;
}

interface Fee {
  totalFee: number;
  paystackFee: number;
  processingFee: number;
}

interface Avatar {
  id: number;
  url: string;
}

interface PushNotification {
  title: string;
  body: string;
  userId?: string;
}

interface EmailAttachment {
  content: string;
  mimeType: string;
  name: string;
}

interface AfricasTalkingResponse {
  Message: string;
  Recipients: {
    statusCode: number;
    number: string;
    status: string;
    cost: string;
    messageId: string;
  }[];
}
