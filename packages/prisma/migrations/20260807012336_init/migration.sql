-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'GITHUB', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'REVISION', 'COMPLETED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'COAUTHOR', 'EDITOR', 'PROOFREADER', 'BETA_READER');

-- CreateEnum
CREATE TYPE "SceneStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'REVIEW', 'DONE');

-- CreateEnum
CREATE TYPE "CharacterStatus" AS ENUM ('ALIVE', 'DEAD', 'MISSING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CharacterRelationType" AS ENUM ('FAMILY', 'ALLY', 'ENEMY', 'MENTOR', 'PARTNER', 'OTHER');

-- CreateEnum
CREATE TYPE "WorldCategory" AS ENUM ('COUNTRY', 'CITY', 'CULTURE', 'ECONOMY', 'RELIGION', 'HISTORY_EVENT', 'RACE', 'CREATURE', 'LANGUAGE', 'POLITICS', 'TECHNOLOGY', 'MAGIC_SYSTEM', 'CALENDAR', 'CURRENCY', 'LAW', 'ORGANIZATION', 'OTHER');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('GENERIC', 'BIRTH', 'DEATH', 'BATTLE', 'MEETING', 'TRAVEL', 'DISCOVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "MapType" AS ENUM ('WORLD', 'REGION', 'CITY', 'BUILDING', 'OTHER');

-- CreateEnum
CREATE TYPE "ResearchItemType" AS ENUM ('PDF', 'WORD', 'EXCEL', 'AUDIO', 'VIDEO', 'IMAGE', 'LINK', 'NOTE', 'CLIPPING', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "provider" "AuthProvider" NOT NULL DEFAULT 'EMAIL',
    "providerId" TEXT,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "coverUrl" TEXT,
    "language" TEXT NOT NULL DEFAULT 'es',
    "genre" TEXT,
    "subgenre" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "synopsis" TEXT,
    "pitch" TEXT,
    "wordGoal" INTEGER,
    "startDate" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "color" TEXT,
    "icon" TEXT,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'COAUTHOR',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "SceneStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "status" "SceneStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneVersion" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SceneVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "age" INTEGER,
    "birthDate" TIMESTAMP(3),
    "sex" TEXT,
    "pronouns" TEXT,
    "heightCm" INTEGER,
    "weightKg" INTEGER,
    "profession" TEXT,
    "appearance" TEXT,
    "photoUrl" TEXT,
    "inspiration" TEXT,
    "colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "symbols" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "virtues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "flaws" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "traumas" TEXT,
    "goals" TEXT,
    "motivations" TEXT,
    "fears" TEXT,
    "conflicts" TEXT,
    "arc" TEXT,
    "secrets" TEXT,
    "lies" TEXT,
    "typicalPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "CharacterStatus" NOT NULL DEFAULT 'ALIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterRelationship" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "relatedCharacterId" TEXT NOT NULL,
    "type" "CharacterRelationType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "history" TEXT,
    "geography" TEXT,
    "climate" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryObject" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "history" TEXT,
    "importance" TEXT,
    "ownerCharacterId" TEXT,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneCharacter" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,

    CONSTRAINT "SceneCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneLocation" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "SceneLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneObject" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,

    CONSTRAINT "SceneObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "WorldCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" JSONB NOT NULL DEFAULT '{}',
    "coverImage" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldEntryLink" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "relation" TEXT,

    CONSTRAINT "WorldEntryLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "TimelineEventType" NOT NULL DEFAULT 'GENERIC',
    "displayDate" TEXT,
    "date" TIMESTAMP(3),
    "sortKey" INTEGER NOT NULL,
    "durationMinutes" INTEGER,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCharacter" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "EventCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventScene" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,

    CONSTRAINT "EventScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mapType" "MapType" NOT NULL DEFAULT 'WORLD',
    "imageUrl" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "parentMapId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapPin" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "locationId" TEXT,
    "characterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapPin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterMovement" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "sceneId" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ResearchItemType" NOT NULL,
    "fileUrl" TEXT,
    "linkUrl" TEXT,
    "content" TEXT,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE INDEX "Part_projectId_order_idx" ON "Part"("projectId", "order");

-- CreateIndex
CREATE INDEX "Chapter_partId_order_idx" ON "Chapter"("partId", "order");

-- CreateIndex
CREATE INDEX "Scene_chapterId_order_idx" ON "Scene"("chapterId", "order");

-- CreateIndex
CREATE INDEX "SceneVersion_sceneId_createdAt_idx" ON "SceneVersion"("sceneId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_projectId_name_key" ON "Tag"("projectId", "name");

-- CreateIndex
CREATE INDEX "Character_projectId_name_idx" ON "Character"("projectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterRelationship_characterId_relatedCharacterId_type_key" ON "CharacterRelationship"("characterId", "relatedCharacterId", "type");

-- CreateIndex
CREATE INDEX "Location_projectId_name_idx" ON "Location"("projectId", "name");

-- CreateIndex
CREATE INDEX "StoryObject_projectId_name_idx" ON "StoryObject"("projectId", "name");

-- CreateIndex
CREATE INDEX "SceneCharacter_characterId_idx" ON "SceneCharacter"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "SceneCharacter_sceneId_characterId_key" ON "SceneCharacter"("sceneId", "characterId");

-- CreateIndex
CREATE INDEX "SceneLocation_locationId_idx" ON "SceneLocation"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "SceneLocation_sceneId_locationId_key" ON "SceneLocation"("sceneId", "locationId");

-- CreateIndex
CREATE INDEX "SceneObject_objectId_idx" ON "SceneObject"("objectId");

-- CreateIndex
CREATE UNIQUE INDEX "SceneObject_sceneId_objectId_key" ON "SceneObject"("sceneId", "objectId");

-- CreateIndex
CREATE INDEX "WorldEntry_projectId_category_idx" ON "WorldEntry"("projectId", "category");

-- CreateIndex
CREATE INDEX "WorldEntry_parentId_idx" ON "WorldEntry"("parentId");

-- CreateIndex
CREATE INDEX "WorldEntryLink_toId_idx" ON "WorldEntryLink"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "WorldEntryLink_fromId_toId_relation_key" ON "WorldEntryLink"("fromId", "toId", "relation");

-- CreateIndex
CREATE INDEX "TimelineEvent_projectId_sortKey_idx" ON "TimelineEvent"("projectId", "sortKey");

-- CreateIndex
CREATE INDEX "EventCharacter_characterId_idx" ON "EventCharacter"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "EventCharacter_eventId_characterId_key" ON "EventCharacter"("eventId", "characterId");

-- CreateIndex
CREATE INDEX "EventScene_sceneId_idx" ON "EventScene"("sceneId");

-- CreateIndex
CREATE UNIQUE INDEX "EventScene_eventId_sceneId_key" ON "EventScene"("eventId", "sceneId");

-- CreateIndex
CREATE INDEX "MapAsset_projectId_mapType_idx" ON "MapAsset"("projectId", "mapType");

-- CreateIndex
CREATE INDEX "MapAsset_parentMapId_idx" ON "MapAsset"("parentMapId");

-- CreateIndex
CREATE INDEX "MapPin_mapId_idx" ON "MapPin"("mapId");

-- CreateIndex
CREATE INDEX "CharacterMovement_characterId_mapId_idx" ON "CharacterMovement"("characterId", "mapId");

-- CreateIndex
CREATE INDEX "ResearchItem_projectId_type_idx" ON "ResearchItem"("projectId", "type");

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneVersion" ADD CONSTRAINT "SceneVersion_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterRelationship" ADD CONSTRAINT "CharacterRelationship_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterRelationship" ADD CONSTRAINT "CharacterRelationship_relatedCharacterId_fkey" FOREIGN KEY ("relatedCharacterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryObject" ADD CONSTRAINT "StoryObject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryObject" ADD CONSTRAINT "StoryObject_ownerCharacterId_fkey" FOREIGN KEY ("ownerCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryObject" ADD CONSTRAINT "StoryObject_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneCharacter" ADD CONSTRAINT "SceneCharacter_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneCharacter" ADD CONSTRAINT "SceneCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneLocation" ADD CONSTRAINT "SceneLocation_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneLocation" ADD CONSTRAINT "SceneLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneObject" ADD CONSTRAINT "SceneObject_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneObject" ADD CONSTRAINT "SceneObject_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "StoryObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldEntry" ADD CONSTRAINT "WorldEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldEntry" ADD CONSTRAINT "WorldEntry_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WorldEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldEntryLink" ADD CONSTRAINT "WorldEntryLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "WorldEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldEntryLink" ADD CONSTRAINT "WorldEntryLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "WorldEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCharacter" ADD CONSTRAINT "EventCharacter_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TimelineEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCharacter" ADD CONSTRAINT "EventCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventScene" ADD CONSTRAINT "EventScene_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TimelineEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventScene" ADD CONSTRAINT "EventScene_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapAsset" ADD CONSTRAINT "MapAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapAsset" ADD CONSTRAINT "MapAsset_parentMapId_fkey" FOREIGN KEY ("parentMapId") REFERENCES "MapAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPin" ADD CONSTRAINT "MapPin_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "MapAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPin" ADD CONSTRAINT "MapPin_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPin" ADD CONSTRAINT "MapPin_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterMovement" ADD CONSTRAINT "CharacterMovement_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterMovement" ADD CONSTRAINT "CharacterMovement_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "MapAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterMovement" ADD CONSTRAINT "CharacterMovement_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterMovement" ADD CONSTRAINT "CharacterMovement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TimelineEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchItem" ADD CONSTRAINT "ResearchItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
