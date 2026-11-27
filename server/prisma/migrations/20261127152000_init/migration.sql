-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMINISTRATOR', 'COLLECTION_PARTNER', 'WASTE_COLLECTOR', 'RECYCLING_COMPANY', 'LOCATION_MANAGER', 'ENVIRONMENTAL_OFFICER');

-- CreateEnum
CREATE TYPE "PlasticCategory" AS ENUM ('PET', 'HDPE', 'LDPE', 'PP', 'MIXED');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "BinStatus" AS ENUM ('LOW', 'PARTIAL', 'FILLING_UP', 'NEARLY_FULL', 'FULL', 'DAMAGED');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'COLLECTING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecyclingRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'DISPATCHED', 'DELIVERED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "region" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "collectionPartnerId" TEXT,
    "recyclingCompanyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BinLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BinLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartBin" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "category" "PlasticCategory" NOT NULL,
    "fillPercent" INTEGER NOT NULL DEFAULT 0,
    "capacityKg" DOUBLE PRECISION NOT NULL,
    "status" "BinStatus" NOT NULL DEFAULT 'LOW',
    "installedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartBin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "deviceIdentifier" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ONLINE',
    "lastCommunication" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorReading" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "fillPercent" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'SIMULATED',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensorReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionPartner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionTask" (
    "id" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "collectorId" TEXT,
    "assignedToId" TEXT,
    "status" "CollectionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CollectionTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionRecord" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "evidenceUrl" TEXT,
    "completedById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlasticInventory" (
    "id" TEXT NOT NULL,
    "category" "PlasticCategory" NOT NULL,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "availableKg" DOUBLE PRECISION NOT NULL,
    "binId" TEXT NOT NULL,
    "collectionRecordId" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlasticInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecyclingCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecyclingCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecyclingRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "status" "RecyclingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecyclingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" "RecyclingRequestStatus" NOT NULL DEFAULT 'APPROVED',
    "trackingRef" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageReport" (
    "id" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DamageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionRequest" (
    "id" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "BinLocation_region_idx" ON "BinLocation"("region");

-- CreateIndex
CREATE UNIQUE INDEX "SmartBin_code_key" ON "SmartBin"("code");

-- CreateIndex
CREATE INDEX "SmartBin_status_fillPercent_idx" ON "SmartBin"("status", "fillPercent");

-- CreateIndex
CREATE INDEX "SmartBin_locationId_idx" ON "SmartBin"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceIdentifier_key" ON "Device"("deviceIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "Device_binId_key" ON "Device"("binId");

-- CreateIndex
CREATE INDEX "SensorReading_binId_recordedAt_idx" ON "SensorReading"("binId", "recordedAt");

-- CreateIndex
CREATE INDEX "SensorReading_deviceId_recordedAt_idx" ON "SensorReading"("deviceId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Collector_userId_key" ON "Collector"("userId");

-- CreateIndex
CREATE INDEX "CollectionTask_status_createdAt_idx" ON "CollectionTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionTask_partnerId_status_idx" ON "CollectionTask"("partnerId", "status");

-- CreateIndex
CREATE INDEX "CollectionTask_assignedToId_status_idx" ON "CollectionTask"("assignedToId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionRecord_taskId_key" ON "CollectionRecord"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "PlasticInventory_collectionRecordId_key" ON "PlasticInventory"("collectionRecordId");

-- CreateIndex
CREATE INDEX "PlasticInventory_category_availableKg_idx" ON "PlasticInventory"("category", "availableKg");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_requestId_key" ON "Delivery"("requestId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_collectionPartnerId_fkey" FOREIGN KEY ("collectionPartnerId") REFERENCES "CollectionPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_recyclingCompanyId_fkey" FOREIGN KEY ("recyclingCompanyId") REFERENCES "RecyclingCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartBin" ADD CONSTRAINT "SmartBin_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BinLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_binId_fkey" FOREIGN KEY ("binId") REFERENCES "SmartBin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_binId_fkey" FOREIGN KEY ("binId") REFERENCES "SmartBin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collector" ADD CONSTRAINT "Collector_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "CollectionPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collector" ADD CONSTRAINT "Collector_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTask" ADD CONSTRAINT "CollectionTask_binId_fkey" FOREIGN KEY ("binId") REFERENCES "SmartBin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTask" ADD CONSTRAINT "CollectionTask_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "CollectionPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTask" ADD CONSTRAINT "CollectionTask_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTask" ADD CONSTRAINT "CollectionTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRecord" ADD CONSTRAINT "CollectionRecord_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CollectionTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlasticInventory" ADD CONSTRAINT "PlasticInventory_binId_fkey" FOREIGN KEY ("binId") REFERENCES "SmartBin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlasticInventory" ADD CONSTRAINT "PlasticInventory_collectionRecordId_fkey" FOREIGN KEY ("collectionRecordId") REFERENCES "CollectionRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingRequest" ADD CONSTRAINT "RecyclingRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "RecyclingCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingRequest" ADD CONSTRAINT "RecyclingRequest_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "PlasticInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RecyclingRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_binId_fkey" FOREIGN KEY ("binId") REFERENCES "SmartBin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRequest" ADD CONSTRAINT "CollectionRequest_binId_fkey" FOREIGN KEY ("binId") REFERENCES "SmartBin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

