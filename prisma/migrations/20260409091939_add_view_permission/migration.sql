-- CreateEnum
CREATE TYPE "ViewMode" AS ENUM ('ALL', 'SYNC', 'CUSTOM');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "viewMode" "ViewMode" NOT NULL DEFAULT 'ALL';

-- CreateTable
CREATE TABLE "ViewPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clusterArn" TEXT NOT NULL,
    "clusterName" TEXT NOT NULL,
    "serviceArn" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ViewPermission_userId_serviceArn_key" ON "ViewPermission"("userId", "serviceArn");

-- AddForeignKey
ALTER TABLE "ViewPermission" ADD CONSTRAINT "ViewPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
