-- CreateEnum
CREATE TYPE "UsageType" AS ENUM ('TEXT_TO_TEXT', 'EMBEDDING');

-- CreateTable
CREATE TABLE "Usage" (
    "id" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "type" "UsageType" NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Usage_projectId_idx" ON "Usage"("projectId");

-- CreateIndex
CREATE INDEX "Usage_modelName_idx" ON "Usage"("modelName");

-- CreateIndex
CREATE INDEX "Usage_type_idx" ON "Usage"("type");

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
