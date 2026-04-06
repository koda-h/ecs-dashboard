-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Admin', 'Editor', 'Viewer');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'Viewer';

-- CreateTable
CREATE TABLE "ServicePermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clusterArn" TEXT NOT NULL,
    "clusterName" TEXT NOT NULL,
    "serviceArn" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServicePermission_userId_serviceArn_key" ON "ServicePermission"("userId", "serviceArn");

-- AddForeignKey
ALTER TABLE "ServicePermission" ADD CONSTRAINT "ServicePermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
