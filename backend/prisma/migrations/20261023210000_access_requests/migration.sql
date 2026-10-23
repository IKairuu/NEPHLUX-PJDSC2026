-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "access_requests" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "prc_license_no" TEXT,
    "clinic_id" UUID,
    "barangay_id" INTEGER,
    "cho_unit" "ChoUnit",
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_requests_email_idx" ON "access_requests"("email");

-- CreateIndex
CREATE INDEX "access_requests_status_idx" ON "access_requests"("status");

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE SET NULL ON UPDATE CASCADE;

