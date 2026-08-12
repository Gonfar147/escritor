-- Módulo: Colaboración en tiempo real (Hocuspocus + Yjs)
-- Campo opcional: las escenas existentes quedan válidas sin backfill. Se completa
-- la primera vez que alguien abre la escena con el editor colaborativo; hasta
-- entonces Hocuspocus hidrata el documento Yjs a partir de "content" (JSON Tiptap).

-- AlterTable
ALTER TABLE "Scene" ADD COLUMN "ydocState" BYTEA;
