/*
  Warnings:

  - You are about to drop the column `usuarioId` on the `Mazo` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Mazo` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Mazo" DROP CONSTRAINT "Mazo_usuarioId_fkey";

-- DropIndex
DROP INDEX "Mazo_usuarioId_idx";

-- AlterTable
ALTER TABLE "Mazo" DROP COLUMN "usuarioId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Mazo_userId_idx" ON "Mazo"("userId");

-- AddForeignKey
ALTER TABLE "Mazo" ADD CONSTRAINT "Mazo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
