/*
  Warnings:

  - You are about to drop the column `thumbnailUri` on the `Document` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Bookmark_createdAt_idx";

-- DropIndex
DROP INDEX "Bookmark_documentId_idx";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "thumbnailUri";

-- CreateIndex
CREATE INDEX "Bookmark_documentId_pageNumber_createdAt_idx" ON "Bookmark"("documentId", "pageNumber", "createdAt");
