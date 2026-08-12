-- OCR / extracción de texto para materiales de investigación (Módulo 9)

-- CreateEnum
CREATE TYPE "OcrStatus" AS ENUM ('NONE', 'PENDING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "ResearchItem" ADD COLUMN "ocrStatus" "OcrStatus" NOT NULL DEFAULT 'NONE';
