-- CreateEnum
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMIN');

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'OPEN';
ALTER TYPE "TicketStatus" ADD VALUE 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE 'REOPENED';

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'REQUESTER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Populate User from existing RequesterUser so foreign keys resolve seamlessly!
INSERT INTO "User" ("id", "fullName", "email", "passwordHash", "role", "isActive", "mustChangePassword", "department", "createdAt", "updatedAt")
SELECT "id", "fullName", "email", '$2b$10$ep5w1/bB3Xq1b/0hQZk.teH.w2KjG6i.fKq1G3aP7U7xXjT8a6bCy', 'REQUESTER', "isActive", true, "department", "createdAt", CURRENT_TIMESTAMP
FROM "RequesterUser"
ON CONFLICT ("id") DO NOTHING;

-- Synchronize serial sequence for User table
SELECT setval(pg_get_serial_sequence('"User"', 'id'), COALESCE((SELECT MAX("id") FROM "User"), 1));

-- AlterTable
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_requesterId_fkey";
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "resolvedByRequester" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "ticketOwnerId" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Comment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InternalNote" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Comment_ticketId_createdAt_idx" ON "Comment"("ticketId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InternalNote_ticketId_createdAt_idx" ON "InternalNote"("ticketId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Ticket_currentStatus_itPriority_idx" ON "Ticket"("currentStatus", "itPriority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Ticket_ticketOwnerId_idx" ON "Ticket"("ticketOwnerId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketOwnerId_fkey" FOREIGN KEY ("ticketOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT IF EXISTS "Attachment_uploadedById_fkey";
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT IF EXISTS "Attachment_removedById_fkey";
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
