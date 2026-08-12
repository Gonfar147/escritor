-- Módulo 14: Notas (espacio de pensamiento e ideas)
-- Extiende Note y Tag, que ya existían en el schema pero sin ningún módulo
-- todavía — no se crean tablas paralelas. Todo lo nuevo en Note es opcional
-- o tiene DEFAULT, así que las notas ya guardadas (si las hubiera) quedan
-- válidas sin backfill.

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('IDEA', 'EXPLORING', 'DEVELOPED', 'INCORPORATED', 'DISCARDED');
CREATE TYPE "NoteRelationEntityType" AS ENUM ('CHARACTER', 'PART', 'SEQUENCE', 'CHAPTER', 'SCENE', 'LOCATION', 'TIMELINE_EVENT');

-- AlterEnum: nuevos tipos de EmbeddingChunk (para "Consultar mis ideas" vía RAG)
ALTER TYPE "EmbeddingEntityType" ADD VALUE 'NOTE';

-- AlterEnum: nuevos tipos de AiProposal (los 6 modos de "Pensar con estas notas" + consulta)
ALTER TYPE "AiProposalType" ADD VALUE 'NOTE_CONNECT';
ALTER TYPE "AiProposalType" ADD VALUE 'NOTE_GENERATE_IDEAS';
ALTER TYPE "AiProposalType" ADD VALUE 'NOTE_DEEPEN';
ALTER TYPE "AiProposalType" ADD VALUE 'NOTE_FIND_CONFLICTS';
ALTER TYPE "AiProposalType" ADD VALUE 'NOTE_BUILD';
ALTER TYPE "AiProposalType" ADD VALUE 'NOTE_FIND_CONTRADICTIONS';
ALTER TYPE "AiProposalType" ADD VALUE 'NOTE_QUERY';

-- CreateTable: NoteGroup (grupos definidos por el usuario, ej. Trama/Personajes/Mundo)
CREATE TABLE "NoteGroup" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteGroup_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NoteGroup_projectId_archived_idx" ON "NoteGroup"("projectId", "archived");
ALTER TABLE "NoteGroup" ADD CONSTRAINT "NoteGroup_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Note — título opcional (la Bandeja no exige título), estado,
-- grupo opcional (null = Bandeja), trazabilidad de origen IA
ALTER TABLE "Note"
  ALTER COLUMN "title" DROP NOT NULL,
  ADD COLUMN "status" "NoteStatus" NOT NULL DEFAULT 'IDEA',
  ADD COLUMN "groupId" TEXT,
  ADD COLUMN "aiOriginProposalId" TEXT,
  ADD COLUMN "aiSourceNoteIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "Note_projectId_groupId_idx" ON "Note"("projectId", "groupId");
CREATE INDEX "Note_projectId_status_idx" ON "Note"("projectId", "status");
CREATE INDEX "Note_aiOriginProposalId_idx" ON "Note"("aiOriginProposalId");

ALTER TABLE "Note" ADD CONSTRAINT "Note_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "NoteGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_aiOriginProposalId_fkey" FOREIGN KEY ("aiOriginProposalId") REFERENCES "AiProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: NoteTag (join Note <-> Tag existente)
CREATE TABLE "NoteTag" (
    "noteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "NoteTag_pkey" PRIMARY KEY ("noteId", "tagId")
);
CREATE INDEX "NoteTag_tagId_idx" ON "NoteTag"("tagId");
ALTER TABLE "NoteTag" ADD CONSTRAINT "NoteTag_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoteTag" ADD CONSTRAINT "NoteTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: NoteRelation (relación liviana con entidades existentes — mismo
-- patrón que EmbeddingChunk: entityType + entityId, sin FK tipada por tipo)
CREATE TABLE "NoteRelation" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "entityType" "NoteRelationEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteRelation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NoteRelation_noteId_entityType_entityId_key" ON "NoteRelation"("noteId", "entityType", "entityId");
CREATE INDEX "NoteRelation_entityType_entityId_idx" ON "NoteRelation"("entityType", "entityId");
ALTER TABLE "NoteRelation" ADD CONSTRAINT "NoteRelation_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
