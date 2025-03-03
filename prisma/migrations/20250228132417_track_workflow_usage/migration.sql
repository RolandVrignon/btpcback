-- AlterTable
ALTER TABLE "Usage" ADD COLUMN     "taskName" TEXT,
ADD COLUMN     "workflowName" TEXT;

-- CreateIndex
CREATE INDEX "Usage_workflowName_idx" ON "Usage"("workflowName");

-- CreateIndex
CREATE INDEX "Usage_taskName_idx" ON "Usage"("taskName");
