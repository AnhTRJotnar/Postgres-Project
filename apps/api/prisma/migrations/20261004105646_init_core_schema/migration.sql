-- CreateEnum
CREATE TYPE "ReadingMode" AS ENUM ('book', 'scroll');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "fileHash" TEXT,
    "fileSize" INTEGER,
    "pageCount" INTEGER,
    "thumbnailUri" TEXT,
    "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOpenedAt" TIMESTAMP(3),
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isFinished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingPosition" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "progressPercent" DOUBLE PRECISION NOT NULL,
    "readingMode" "ReadingMode" NOT NULL,
    "scrollOffsetY" DOUBLE PRECISION,
    "pageCoordinateX" DOUBLE PRECISION,
    "pageCoordinateY" DOUBLE PRECISION,
    "zoomScale" DOUBLE PRECISION,
    "topVisibleText" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "label" TEXT,
    "pageNumber" INTEGER NOT NULL,
    "readingMode" "ReadingMode" NOT NULL,
    "scrollOffsetY" DOUBLE PRECISION,
    "pageCoordinateX" DOUBLE PRECISION,
    "pageCoordinateY" DOUBLE PRECISION,
    "zoomScale" DOUBLE PRECISION,
    "textPreview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_fileHash_idx" ON "Document"("fileHash");

-- CreateIndex
CREATE INDEX "Document_dateAdded_idx" ON "Document"("dateAdded");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingPosition_documentId_key" ON "ReadingPosition"("documentId");

-- CreateIndex
CREATE INDEX "Bookmark_documentId_idx" ON "Bookmark"("documentId");

-- CreateIndex
CREATE INDEX "Bookmark_createdAt_idx" ON "Bookmark"("createdAt");

-- AddForeignKey
ALTER TABLE "ReadingPosition" ADD CONSTRAINT "ReadingPosition_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
