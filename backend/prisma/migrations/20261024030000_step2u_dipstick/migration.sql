-- CreateEnum
CREATE TYPE "DipstickGrade" AS ENUM ('NEG', 'TRACE', 'ONE_PLUS', 'TWO_PLUS', 'THREE_PLUS');

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "dip_blood" "DipstickGrade",
ADD COLUMN     "dip_glucose" "DipstickGrade",
ADD COLUMN     "dip_protein" "DipstickGrade",
ADD COLUMN     "urine_sg" DOUBLE PRECISION;
