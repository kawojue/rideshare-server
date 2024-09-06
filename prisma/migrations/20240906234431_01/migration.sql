-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DRIVER', 'PASSENGER', 'MODERATOR');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('Local', 'Google');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('DEPOSIT', 'PAYMENT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "CacheType" AS ENUM ('QOREID', 'TOKEN_REFRESHER');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('GRANTED', 'PENDING', 'DECLINED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('FAILED', 'PENDING', 'SUCCESS', 'REVERSED', 'RECEIVED', 'COMPLETED', 'SUCCESSFUL');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('INITIATED', 'ANSWERED', 'REJECTED', 'RECEIVED', 'MISSED', 'ENDED');

-- CreateEnum
CREATE TYPE "IDType" AS ENUM ('NIN', 'VOTER', 'PASSPORT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERAL', 'WEBHOOK', 'ACTIVITY', 'TRANSACTION', 'ANNOUNCEMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "middlename" TEXT,
    "customer_code" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "email" TEXT,
    "phone" TEXT,
    "significant" TEXT,
    "region_code" TEXT,
    "country_code" TEXT,
    "provider_id" TEXT,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_used_biometric_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "avatar" JSONB,
    "gender" "Gender" NOT NULL,
    "biometric" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_devices" (
    "id" UUID NOT NULL,
    "device_id" TEXT,
    "model" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "vendor" TEXT,
    "last_logged_in_at" TIMESTAMP(3),
    "notification_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "mobile_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "id_number" TEXT,
    "id_type" "IDType",
    "id_verified" BOOLEAN NOT NULL DEFAULT false,
    "id_verified_at" TIMESTAMP(3),
    "id_verification_data" JSONB,
    "driver_license" TEXT,
    "driver_license_data" JSONB,
    "driver_license_verified" BOOLEAN DEFAULT false,
    "proof_of_address" JSONB,
    "address_verified" BOOLEAN DEFAULT false,
    "driver_id" UUID NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" UUID NOT NULL,
    "fullname" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "profile_id" UUID NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "year" TEXT,
    "image_url" TEXT,
    "color" TEXT NOT NULL,
    "seat_number" INTEGER NOT NULL,
    "vin" TEXT,
    "plate_number" TEXT NOT NULL,
    "is_ownwer" BOOLEAN NOT NULL,
    "agreement_document" JSONB,
    "owner_name" TEXT,
    "owner_phone_number" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "driver_id" UUID NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_amenities" (
    "id" UUID NOT NULL,
    "wifi" BOOLEAN NOT NULL DEFAULT false,
    "music" BOOLEAN NOT NULL DEFAULT false,
    "phone_charger" BOOLEAN NOT NULL DEFAULT false,
    "temperature_control" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "vehicle_id" UUID NOT NULL,

    CONSTRAINT "vehicle_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cache" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" INTEGER,
    "expires_in" TEXT,
    "scope" TEXT,
    "token_type" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "type" "CacheType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" UUID,
    "modmin_id" UUID,

    CONSTRAINT "cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "topic" "NotificationType" NOT NULL,
    "body" TEXT NOT NULL,
    "title" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" UUID,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otps" (
    "id" UUID NOT NULL,
    "key" TEXT,
    "totp" TEXT,
    "totp_expiry" TIMESTAMP(3),
    "counter" INTEGER,
    "max" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" UUID,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tx_histories" (
    "id" UUID NOT NULL,
    "ip" TEXT,
    "status" "TransferStatus" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "type" "TxType" NOT NULL,
    "description" TEXT,
    "channel" TEXT,
    "reference" TEXT NOT NULL,
    "transfer_code" TEXT,
    "recipient_code" TEXT,
    "authorization_code" TEXT,
    "total_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "paystack_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "processing_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "destination_bank_code" TEXT,
    "destination_bank_name" TEXT,
    "destination_account_name" TEXT,
    "destination_account_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "tx_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "account_name" TEXT,
    "account_number" TEXT,
    "dva_id" TEXT,
    "currency" TEXT,
    "bank_name" TEXT,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "last_approved_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "last_deposited_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "last_deposited_at" TIMESTAMP(3),
    "last_approved_at" TIMESTAMP(3),
    "last_requested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "wallet_id" UUID NOT NULL,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modmins" (
    "id" UUID NOT NULL,
    "fullname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatar" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modmins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" UUID NOT NULL,
    "point" DOUBLE PRECISION NOT NULL,
    "review" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "target_user_id" UUID NOT NULL,
    "rater_user_id" UUID NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inboxes" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "modmin_id" UUID,
    "user_id" UUID,

    CONSTRAINT "inboxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "content" TEXT,
    "file" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "inbox_id" UUID NOT NULL,
    "user_sender_id" UUID,
    "modmin_sender_id" UUID,
    "user_receiver_id" UUID,
    "modmin_receiver_id" UUID,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_logs" (
    "id" UUID NOT NULL,
    "end_time" TIMESTAMP(3),
    "start_time" TIMESTAMP(3),
    "call_status" "CallStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "caller_id" UUID NOT NULL,
    "receiver_id" UUID NOT NULL,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_significant_key" ON "users"("significant");

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_id_key" ON "users"("provider_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_firstname_lastname_idx" ON "users"("firstname", "lastname");

-- CreateIndex
CREATE INDEX "users_created_at_updated_at_idx" ON "users"("created_at", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "profiles_gender_idx" ON "profiles"("gender");

-- CreateIndex
CREATE INDEX "profiles_address_idx" ON "profiles"("address");

-- CreateIndex
CREATE INDEX "profiles_created_at_updated_at_idx" ON "profiles"("created_at", "updated_at");

-- CreateIndex
CREATE INDEX "mobile_devices_created_at_updated_at_idx" ON "mobile_devices"("created_at", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_devices_user_id_device_id_key" ON "mobile_devices"("user_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_id_number_key" ON "verification"("id_number");

-- CreateIndex
CREATE UNIQUE INDEX "verification_driver_license_key" ON "verification"("driver_license");

-- CreateIndex
CREATE UNIQUE INDEX "verification_driver_id_key" ON "verification"("driver_id");

-- CreateIndex
CREATE INDEX "verification_created_at_updated_at_idx" ON "verification"("created_at", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_contacts_profile_id_key" ON "emergency_contacts"("profile_id");

-- CreateIndex
CREATE INDEX "emergency_contacts_fullname_idx" ON "emergency_contacts"("fullname");

-- CreateIndex
CREATE INDEX "emergency_contacts_created_at_updated_at_idx" ON "emergency_contacts"("created_at", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_number_key" ON "vehicles"("plate_number");

-- CreateIndex
CREATE INDEX "vehicles_brand_model_idx" ON "vehicles"("brand", "model");

-- CreateIndex
CREATE INDEX "vehicles_created_at_updated_at_idx" ON "vehicles"("created_at", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_amenities_vehicle_id_key" ON "vehicle_amenities"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_amenities_created_at_updated_at_idx" ON "vehicle_amenities"("created_at", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "cache_key_key" ON "cache"("key");

-- CreateIndex
CREATE INDEX "cache_access_token_idx" ON "cache"("access_token");

-- CreateIndex
CREATE INDEX "cache_refresh_token_idx" ON "cache"("refresh_token");

-- CreateIndex
CREATE INDEX "cache_created_at_updated_at_idx" ON "cache"("created_at", "updated_at");

-- CreateIndex
CREATE INDEX "notifications_topic_idx" ON "notifications"("topic");

-- CreateIndex
CREATE INDEX "notifications_created_at_updated_at_idx" ON "notifications"("created_at", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "otps_key_key" ON "otps"("key");

-- CreateIndex
CREATE UNIQUE INDEX "otps_user_id_key" ON "otps"("user_id");

-- CreateIndex
CREATE INDEX "otps_created_at_updated_at_idx" ON "otps"("created_at", "updated_at");

-- CreateIndex
CREATE INDEX "otps_totp_idx" ON "otps"("totp");

-- CreateIndex
CREATE UNIQUE INDEX "tx_histories_reference_key" ON "tx_histories"("reference");

-- CreateIndex
CREATE INDEX "tx_histories_status_idx" ON "tx_histories"("status");

-- CreateIndex
CREATE INDEX "tx_histories_created_at_updated_at_idx" ON "tx_histories"("created_at", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "wallets_created_at_updated_at_idx" ON "wallets"("created_at", "updated_at");

-- CreateIndex
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests"("status");

-- CreateIndex
CREATE INDEX "withdrawal_requests_created_at_updated_at_idx" ON "withdrawal_requests"("created_at", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "modmins_email_key" ON "modmins"("email");

-- CreateIndex
CREATE INDEX "modmins_role_idx" ON "modmins"("role");

-- CreateIndex
CREATE INDEX "modmins_status_idx" ON "modmins"("status");

-- CreateIndex
CREATE INDEX "modmins_fullname_idx" ON "modmins"("fullname");

-- CreateIndex
CREATE INDEX "modmins_created_at_updated_at_idx" ON "modmins"("created_at", "updated_at");

-- CreateIndex
CREATE INDEX "ratings_point_idx" ON "ratings"("point");

-- CreateIndex
CREATE INDEX "ratings_created_at_updated_at_idx" ON "ratings"("created_at", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "inboxes_modmin_id_key" ON "inboxes"("modmin_id");

-- CreateIndex
CREATE UNIQUE INDEX "inboxes_user_id_key" ON "inboxes"("user_id");

-- CreateIndex
CREATE INDEX "inboxes_created_at_updated_at_idx" ON "inboxes"("created_at", "updated_at");

-- CreateIndex
CREATE INDEX "messages_created_at_updated_at_idx" ON "messages"("created_at", "updated_at");

-- CreateIndex
CREATE INDEX "call_logs_call_status_idx" ON "call_logs"("call_status");

-- CreateIndex
CREATE INDEX "call_logs_created_at_updated_at_idx" ON "call_logs"("created_at", "updated_at");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_devices" ADD CONSTRAINT "mobile_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification" ADD CONSTRAINT "verification_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_amenities" ADD CONSTRAINT "vehicle_amenities_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cache" ADD CONSTRAINT "cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cache" ADD CONSTRAINT "cache_modmin_id_fkey" FOREIGN KEY ("modmin_id") REFERENCES "modmins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otps" ADD CONSTRAINT "otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tx_histories" ADD CONSTRAINT "tx_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rater_user_id_fkey" FOREIGN KEY ("rater_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_modmin_id_fkey" FOREIGN KEY ("modmin_id") REFERENCES "modmins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_inbox_id_fkey" FOREIGN KEY ("inbox_id") REFERENCES "inboxes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_sender_id_fkey" FOREIGN KEY ("user_sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_modmin_sender_id_fkey" FOREIGN KEY ("modmin_sender_id") REFERENCES "modmins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_receiver_id_fkey" FOREIGN KEY ("user_receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_modmin_receiver_id_fkey" FOREIGN KEY ("modmin_receiver_id") REFERENCES "modmins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_caller_id_fkey" FOREIGN KEY ("caller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
