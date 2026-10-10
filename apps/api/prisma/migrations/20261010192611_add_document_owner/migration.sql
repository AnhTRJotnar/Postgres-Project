/*
  Warnings:

  - Added the required column `userId` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- Documents made before accounts have no owner, and every document needs one from now on.
-- They are development data only, so they are deleted (agreed 2026-10-08). Their reading
-- positions and bookmarks go with them (ON DELETE CASCADE). The phones keep their own copies.
DELETE FROM "Document";

-- DropIndex
DROP INDEX "Document_dateAdded_idx";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Document_userId_dateAdded_idx" ON "Document"("userId", "dateAdded");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
