-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DRIVER', 'PASSENGER', 'MODERATOR');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('Local', 'Google');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('DEPOSIT', 'PAYMENT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "CacheType" AS ENUM ('PIN');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('FAILED', 'PENDING', 'SUCCESS', 'REVERSED', 'RECEIVED', 'COMPLETED', 'SUCCESSFUL');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "fullname" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "provider" "Provider" NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "provider_id" TEXT,
    "password" TEXT,
    "role" "Role" NOT NULL,
    "refresh_token" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedBiometricAt" TIMESTAMP(3),
    "lastUsedCredentialAt" TIMESTAMP(3),
    "lastLoggedInAt" TIMESTAMP(3),
    "lastPasswordChanged" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "avatar" JSONB,
    "gender" "Gender" NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "pin" TEXT,
    "lastPinChanged" TIMESTAMP(3),
    "biometric" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" UUID NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "nationalId" TEXT NOT NULL,
    "driverLicense" TEXT NOT NULL,
    "proofOfAddress" JSONB NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "driverId" UUID NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "profileId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "year" TEXT,
    "color" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "vin" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL,
    "agreementDocument" JSONB,
    "ownerName" TEXT,
    "ownerPhoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "driverId" UUID NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" UUID NOT NULL,
    "wifi" BOOLEAN NOT NULL DEFAULT false,
    "music" BOOLEAN NOT NULL DEFAULT false,
    "phoneCharger" BOOLEAN NOT NULL DEFAULT false,
    "temperatureControl" BOOLEAN NOT NULL DEFAULT false,
    "vehicleId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cache" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" INTEGER,
    "expires_in" INTEGER,
    "scope" TEXT,
    "token_type" TEXT,
    "access_token" TEXT,
    "type" "CacheType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Totp" (
    "id" UUID NOT NULL,
    "totp" TEXT,
    "totp_expiry" TIMESTAMP(3),
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Totp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkedBank" (
    "id" UUID NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "LinkedBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TxHistory" (
    "id" UUID NOT NULL,
    "ip" TEXT,
    "status" "TransferStatus" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "type" "TxType" NOT NULL,
    "description" TEXT,
    "channel" TEXT,
    "reference" TEXT NOT NULL,
    "transfer_code" TEXT,
    "recipient_code" TEXT,
    "authorization_code" TEXT,
    "totalFee" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "paystackFee" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "processingFee" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "destinationBankCode" TEXT,
    "destinationBankName" TEXT,
    "destinationAccountName" TEXT,
    "destinationAccountNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "TxHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" UUID NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lastDepositedAt" TIMESTAMP(3),
    "lastWithdrawnAt" TIMESTAMP(3),
    "lastAmountDeposited" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "lastAmountWithDrawn" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modmin" (
    "id" UUID NOT NULL,
    "fullname" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Modmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" UUID NOT NULL,
    "point" DOUBLE PRECISION NOT NULL,
    "review" TEXT,
    "targetUserId" UUID NOT NULL,
    "raterUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_provider_id_key" ON "User"("provider_id");

-- CreateIndex
CREATE INDEX "User_refresh_token_idx" ON "User"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_nationalId_key" ON "Verification"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_driverLicense_key" ON "Verification"("driverLicense");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_driverId_key" ON "Verification"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyContact_profileId_key" ON "EmergencyContact"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_vehicleId_key" ON "Amenity"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Cache_key_key" ON "Cache"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Totp_userId_key" ON "Totp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TxHistory_reference_key" ON "TxHistory"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amenity" ADD CONSTRAINT "Amenity_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Totp" ADD CONSTRAINT "Totp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedBank" ADD CONSTRAINT "LinkedBank_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TxHistory" ADD CONSTRAINT "TxHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_raterUserId_fkey" FOREIGN KEY ("raterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;