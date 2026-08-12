-- Transcripción de audio/video para materiales de investigación (Módulo 9)

-- CreateEnum
CREATE TYPE "TranscriptionStatus" AS ENUM ('NONE', 'PENDING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "ResearchItem" ADD COLUMN "transcriptionStatus" "TranscriptionStatus" NOT NULL DEFAULT 'NONE';
