-- Módulo 13: Arquitectura Narrativa
-- Todos los campos nuevos son opcionales (o tienen DEFAULT), así que las filas
-- existentes de Part/Chapter/Scene quedan válidas sin necesidad de backfill.

-- CreateEnum
CREATE TYPE "ArchitectureStatus" AS ENUM ('IDEA', 'PLANNING', 'IN_PROGRESS', 'DRAFT', 'REVISED', 'DONE');
CREATE TYPE "AiProposalType" AS ENUM ('FULL_STRUCTURE', 'ACT_STRUCTURE', 'SEQUENCE', 'CHAPTER', 'CHARACTER_ARC', 'COHERENCE_ANALYSIS', 'STRUCTURE_DISCOVERY', 'REORGANIZATION', 'OTHER');
CREATE TYPE "AiProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'MODIFIED');

-- AlterTable: Part pasa a cumplir el rol de Acto/Parte/Bloque configurable
ALTER TABLE "Part"
  ADD COLUMN "label" TEXT NOT NULL DEFAULT 'Parte',
  ADD COLUMN "narrativeFunction" TEXT,
  ADD COLUMN "objective" TEXT,
  ADD COLUMN "conflict" TEXT,
  ADD COLUMN "planningStatus" "ArchitectureStatus",
  ADD COLUMN "notes" TEXT;

-- CreateTable: Sequence (capa opcional entre Part y Chapter)
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "narrativeFunction" TEXT,
    "objective" TEXT,
    "conflict" TEXT,
    "beginning" TEXT,
    "ending" TEXT,
    "consequences" TEXT,
    "planningStatus" "ArchitectureStatus",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Sequence_partId_order_idx" ON "Sequence"("partId", "order");
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Chapter — sequenceId opcional + ficha estructural
ALTER TABLE "Chapter"
  ADD COLUMN "sequenceId" TEXT,
  ADD COLUMN "narrativeFunction" TEXT,
  ADD COLUMN "objective" TEXT,
  ADD COLUMN "conflict" TEXT,
  ADD COLUMN "change" TEXT,
  ADD COLUMN "infoToReveal" TEXT,
  ADD COLUMN "infoToProtect" TEXT,
  ADD COLUMN "hook" TEXT,
  ADD COLUMN "notes" TEXT;
CREATE INDEX "Chapter_sequenceId_idx" ON "Chapter"("sequenceId");
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Scene — ficha estructural
ALTER TABLE "Scene"
  ADD COLUMN "objective" TEXT,
  ADD COLUMN "conflict" TEXT,
  ADD COLUMN "emotionalChange" TEXT,
  ADD COLUMN "infoRevealed" TEXT,
  ADD COLUMN "infoProtected" TEXT,
  ADD COLUMN "transition" TEXT,
  ADD COLUMN "notes" TEXT;

-- CreateTable: ChapterCharacter (planificación a nivel capítulo, previa a escenas)
CREATE TABLE "ChapterCharacter" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "ChapterCharacter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChapterCharacter_chapterId_characterId_key" ON "ChapterCharacter"("chapterId", "characterId");
CREATE INDEX "ChapterCharacter_characterId_idx" ON "ChapterCharacter"("characterId");
ALTER TABLE "ChapterCharacter" ADD CONSTRAINT "ChapterCharacter_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChapterCharacter" ADD CONSTRAINT "ChapterCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ChapterLocation
CREATE TABLE "ChapterLocation" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "ChapterLocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChapterLocation_chapterId_locationId_key" ON "ChapterLocation"("chapterId", "locationId");
CREATE INDEX "ChapterLocation_locationId_idx" ON "ChapterLocation"("locationId");
ALTER TABLE "ChapterLocation" ADD CONSTRAINT "ChapterLocation_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChapterLocation" ADD CONSTRAINT "ChapterLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: NovelVision (1:1 con Project)
CREATE TABLE "NovelVision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "premise" TEXT,
    "centralTheme" TEXT,
    "centralQuestion" TEXT,
    "centralConflict" TEXT,
    "protagonistCharacterId" TEXT,
    "mainGoal" TEXT,
    "antagonism" TEXT,
    "worldNotes" TEXT,
    "expectedEnding" TEXT,
    "generalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NovelVision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NovelVision_projectId_key" ON "NovelVision"("projectId");
ALTER TABLE "NovelVision" ADD CONSTRAINT "NovelVision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NovelVision" ADD CONSTRAINT "NovelVision_protagonistCharacterId_fkey" FOREIGN KEY ("protagonistCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: CharacterArc (1:1 con Character)
CREATE TABLE "CharacterArc" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "initialState" TEXT,
    "turningPoint" TEXT,
    "transformation" TEXT,
    "finalState" TEXT,
    "resolution" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterArc_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CharacterArc_characterId_key" ON "CharacterArc"("characterId");
ALTER TABLE "CharacterArc" ADD CONSTRAINT "CharacterArc_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: EventCausality (autorelación sobre TimelineEvent)
CREATE TABLE "EventCausality" (
    "id" TEXT NOT NULL,
    "fromEventId" TEXT NOT NULL,
    "toEventId" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCausality_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EventCausality_fromEventId_toEventId_key" ON "EventCausality"("fromEventId", "toEventId");
CREATE INDEX "EventCausality_toEventId_idx" ON "EventCausality"("toEventId");
ALTER TABLE "EventCausality" ADD CONSTRAINT "EventCausality_fromEventId_fkey" FOREIGN KEY ("fromEventId") REFERENCES "TimelineEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventCausality" ADD CONSTRAINT "EventCausality_toEventId_fkey" FOREIGN KEY ("toEventId") REFERENCES "TimelineEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: AiProposal
CREATE TABLE "AiProposal" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "AiProposalType" NOT NULL,
    "status" "AiProposalStatus" NOT NULL DEFAULT 'PENDING',
    "content" JSONB NOT NULL,
    "appliedContent" JSONB,
    "contextSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AiProposal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiProposal_projectId_status_idx" ON "AiProposal"("projectId", "status");
ALTER TABLE "AiProposal" ADD CONSTRAINT "AiProposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
