/*
  Warnings:

  - The values [WORK_SUMMARY,INDEX_COMPARISON,THERMAL_STUDY_ANALYSIS,DATA_INCONSISTENCY] on the enum `DeliverableType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DeliverableType_new" AS ENUM ('DESCRIPTIF_SOMMAIRE_DES_TRAVAUX', 'COMPARATEUR_INDICES', 'ANALYSE_ETHUDE_THERMIQUE', 'INCOHERENCE_DE_DONNEES');
ALTER TABLE "Deliverable" ALTER COLUMN "type" TYPE "DeliverableType_new" USING ("type"::text::"DeliverableType_new");
ALTER TYPE "DeliverableType" RENAME TO "DeliverableType_old";
ALTER TYPE "DeliverableType_new" RENAME TO "DeliverableType";
DROP TYPE "DeliverableType_old";
COMMIT;
