-- CreateEnum
CREATE TYPE "ClinicSector" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "LocationPrecision" AS ENUM ('APPROXIMATE', 'EXACT');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('DOCTOR', 'BHW', 'CHO', 'ADMIN');

-- CreateEnum
CREATE TYPE "ChoUnit" AS ENUM ('NCD', 'EPIDEMIOLOGY', 'PLANNING');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('F', 'M');

-- CreateEnum
CREATE TYPE "LabUnits" AS ENUM ('SI', 'CONVENTIONAL');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('HIGH', 'MODERATE', 'LOW');

-- CreateEnum
CREATE TYPE "Suggestion" AS ENUM ('REFER', 'CONSIDER_OR_REPEAT', 'ROUTINE');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('APPROVED', 'OVERRIDDEN', 'NO_REFERRAL');

-- CreateTable
CREATE TABLE "barangays" (
    "id" SERIAL NOT NULL,
    "psgc_code" VARCHAR(10) NOT NULL,
    "name" TEXT NOT NULL,
    "code_index" SMALLINT NOT NULL,
    "pop_2020" INTEGER NOT NULL,
    "pop_2024" INTEGER,
    "centre_lat" DOUBLE PRECISION,
    "centre_lon" DOUBLE PRECISION,
    "boundary" JSONB,

    CONSTRAINT "barangays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinics" (
    "id" UUID NOT NULL,
    "yakap_ref" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "sector" "ClinicSector" NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "barangay_id" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "location_precision" "LocationPrecision" NOT NULL DEFAULT 'APPROXIMATE',
    "accreditation_expiry" DATE,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "prc_license_no" TEXT,
    "clinic_id" UUID,
    "barangay_id" INTEGER,
    "cho_unit" "ChoUnit",
    "status" "StaffStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "initials" VARCHAR(8) NOT NULL,
    "sex" "Sex" NOT NULL,
    "barangay_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "assessed_on" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resident_code" VARCHAR(11),
    "code_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "age" SMALLINT NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "height_cm" DOUBLE PRECISION NOT NULL,
    "bmi" DOUBLE PRECISION NOT NULL,
    "dm_hx" BOOLEAN NOT NULL,
    "htn_hx" BOOLEAN NOT NULL,
    "bp_med" BOOLEAN NOT NULL,
    "cvd_hx" BOOLEAN NOT NULL,
    "smoker" BOOLEAN NOT NULL,
    "fam_dm" BOOLEAN NOT NULL,
    "sbp" SMALLINT NOT NULL,
    "dbp" SMALLINT NOT NULL,
    "lab_units" "LabUnits" NOT NULL DEFAULT 'SI',
    "hba1c_pct" DOUBLE PRECISION NOT NULL,
    "creatinine_mg_dl" DOUBLE PRECISION NOT NULL,
    "tchol_mg_dl" DOUBLE PRECISION NOT NULL,
    "hdl_mg_dl" DOUBLE PRECISION NOT NULL,
    "hgb_g_dl" DOUBLE PRECISION NOT NULL,
    "wbc" DOUBLE PRECISION NOT NULL,
    "platelets" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_results" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "model_version_id" UUID NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "egfr" DOUBLE PRECISION NOT NULL,
    "suggestion" "Suggestion" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_reasons" (
    "id" UUID NOT NULL,
    "risk_result_id" UUID NOT NULL,
    "rank" SMALLINT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "contribution" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "risk_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_decisions" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "decision" "Decision" NOT NULL,
    "override_reason" TEXT,
    "decided_by" UUID NOT NULL,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recheck_due" DATE,
    "slip_printed_at" TIMESTAMP(3),

    CONSTRAINT "referral_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uacr_results" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "value_mg_g" DOUBLE PRECISION NOT NULL,
    "recorded_by" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_repeat" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "uacr_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_versions" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "step" SMALLINT NOT NULL,
    "coefficients" JSONB NOT NULL,
    "means" JSONB NOT NULL,
    "thresholds" JSONB NOT NULL,
    "test_auroc" DOUBLE PRECISION NOT NULL,
    "ci_low" DOUBLE PRECISION NOT NULL,
    "ci_high" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_curve_points" (
    "model_version_id" UUID NOT NULL,
    "tests_per_1000" SMALLINT NOT NULL,
    "cases_model" DOUBLE PRECISION NOT NULL,
    "cases_rule" DOUBLE PRECISION NOT NULL,
    "cases_random" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "budget_curve_points_pkey" PRIMARY KEY ("model_version_id","tests_per_1000")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "barangays_psgc_code_key" ON "barangays"("psgc_code");

-- CreateIndex
CREATE UNIQUE INDEX "barangays_code_index_key" ON "barangays"("code_index");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_yakap_ref_key" ON "clinics"("yakap_ref");

-- CreateIndex
CREATE INDEX "clinics_barangay_id_idx" ON "clinics"("barangay_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_email_key" ON "staff_users"("email");

-- CreateIndex
CREATE INDEX "staff_users_role_idx" ON "staff_users"("role");

-- CreateIndex
CREATE INDEX "patients_barangay_id_idx" ON "patients"("barangay_id");

-- CreateIndex
CREATE INDEX "assessments_patient_id_idx" ON "assessments"("patient_id");

-- CreateIndex
CREATE INDEX "assessments_clinic_id_idx" ON "assessments"("clinic_id");

-- CreateIndex
CREATE INDEX "assessments_assessed_on_idx" ON "assessments"("assessed_on");

-- CreateIndex
CREATE UNIQUE INDEX "risk_results_assessment_id_key" ON "risk_results"("assessment_id");

-- CreateIndex
CREATE INDEX "risk_results_risk_level_idx" ON "risk_results"("risk_level");

-- CreateIndex
CREATE UNIQUE INDEX "risk_reasons_risk_result_id_rank_key" ON "risk_reasons"("risk_result_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "referral_decisions_assessment_id_key" ON "referral_decisions"("assessment_id");

-- CreateIndex
CREATE INDEX "referral_decisions_decision_idx" ON "referral_decisions"("decision");

-- CreateIndex
CREATE INDEX "uacr_results_assessment_id_idx" ON "uacr_results"("assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "model_versions_version_step_key" ON "model_versions"("version", "step");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- AddForeignKey
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_results" ADD CONSTRAINT "risk_results_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_results" ADD CONSTRAINT "risk_results_model_version_id_fkey" FOREIGN KEY ("model_version_id") REFERENCES "model_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_reasons" ADD CONSTRAINT "risk_reasons_risk_result_id_fkey" FOREIGN KEY ("risk_result_id") REFERENCES "risk_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_decisions" ADD CONSTRAINT "referral_decisions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_decisions" ADD CONSTRAINT "referral_decisions_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uacr_results" ADD CONSTRAINT "uacr_results_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uacr_results" ADD CONSTRAINT "uacr_results_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_curve_points" ADD CONSTRAINT "budget_curve_points_model_version_id_fkey" FOREIGN KEY ("model_version_id") REFERENCES "model_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
