/*
  Warnings:

  - You are about to drop the column `taskName` on the `Usage` table. All the data in the column will be lost.
  - You are about to drop the column `taskRunId` on the `Usage` table. All the data in the column will be lost.
  - You are about to drop the column `workflowName` on the `Usage` table. All the data in the column will be lost.
  - You are about to drop the column `workflowRunId` on the `Usage` table. All the data in the column will be lost.
  - You are about to drop the `TaskRun` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkflowRun` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "DocumentStatus" ADD VALUE 'PENDING';

-- DropForeignKey
ALTER TABLE "TaskRun" DROP CONSTRAINT "TaskRun_workflowRunId_fkey";

-- DropForeignKey
ALTER TABLE "Usage" DROP CONSTRAINT "Usage_taskRunId_fkey";

-- DropForeignKey
ALTER TABLE "Usage" DROP CONSTRAINT "Usage_workflowRunId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowRun" DROP CONSTRAINT "WorkflowRun_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowRun" DROP CONSTRAINT "WorkflowRun_projectId_fkey";

-- DropIndex
DROP INDEX "Usage_taskName_idx";

-- DropIndex
DROP INDEX "Usage_workflowName_idx";

-- AlterTable
ALTER TABLE "Usage" DROP COLUMN "taskName",
DROP COLUMN "taskRunId",
DROP COLUMN "workflowName",
DROP COLUMN "workflowRunId";

-- DropTable
DROP TABLE "TaskRun";

-- DropTable
DROP TABLE "WorkflowRun";

-- DropEnum
DROP TYPE "TaskStatus";

-- DropEnum
DROP TYPE "WorkflowStatus";
