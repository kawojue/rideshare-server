/*
  Warnings:

  - You are about to drop the column `userId` on the `Verification` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[driverId]` on the table `Verification` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `driverId` to the `Verification` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Verification" DROP CONSTRAINT "Verification_userId_fkey";

-- DropIndex
DROP INDEX "Verification_userId_key";

-- AlterTable
ALTER TABLE "Verification" DROP COLUMN "userId",
ADD COLUMN     "driverId" UUID NOT NULL;

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

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_vehicleId_key" ON "Amenity"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_driverId_key" ON "Verification"("driverId");

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amenity" ADD CONSTRAINT "Amenity_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
