-- AlterTable
ALTER TABLE "Usage" ADD COLUMN     "taskRunId" TEXT,
ADD COLUMN     "workflowRunId" TEXT;

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_taskRunId_fkey" FOREIGN KEY ("taskRunId") REFERENCES "TaskRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
