-- AlterEnum
ALTER TYPE "EmailStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "previewUrl" TEXT;
