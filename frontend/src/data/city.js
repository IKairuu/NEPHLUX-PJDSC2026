// Cagayan de Oro City lists used by pickers. Copied from prototype v6 (cdo geo bundle).
// Barangays: PSGC 2023 order, which the resident clinic code stores by index, so do not re-sort.
export const BARANGAYS = [
  'Agusan', 'Baikingon', 'Bulua', 'Balubal', 'Balulang',
  'Barangay 10', 'Barangay 11', 'Barangay 12', 'Barangay 13', 'Barangay 14', 'Barangay 15', 'Barangay 16', 'Barangay 17', 'Barangay 18', 'Barangay 19',
  'Barangay 2', 'Barangay 21', 'Barangay 22', 'Barangay 23', 'Barangay 24', 'Barangay 26', 'Barangay 27', 'Barangay 28',
  'Barangay 3', 'Barangay 30', 'Barangay 32', 'Barangay 33', 'Barangay 34', 'Barangay 38', 'Barangay 39',
  'Barangay 4', 'Barangay 40', 'Barangay 6', 'Barangay 8', 'Barangay 9', 'Barangay 5',
  'Bayabas', 'Bayanga', 'Besigan', 'Bonbon', 'Bugo', 'Camaman-an', 'Canito-an', 'Carmen', 'Consolacion', 'Cugman',
  'Dansolihon', 'F. S. Catanico', 'Gusa', 'Indahag', 'Iponan', 'Kauswagan', 'Lapasan', 'Lumbia', 'Macabalan', 'Macasandig',
  'Mambuaya', 'Nazareth', 'Pagalungan', 'Pagatpat', 'Patag', 'Pigsag-an', 'Puerto', 'Puntod', 'San Simon', 'Tablon',
  'Taglimao', 'Tagpangi', 'Tignapoloan', 'Tuburan', 'Tumpagon',
  'Barangay 1', 'Barangay 7', 'Barangay 20', 'Barangay 25', 'Barangay 29', 'Barangay 31', 'Barangay 35', 'Barangay 36', 'Barangay 37',
]

// The 42 providers on PhilHealth's YAKAP accredited list (30 Sep 2026), in list order; id matches the prototype (Y1..Y42).
// [short name, public]
const CLINIC_ROWS = [
  ['800 Zed Medicals and Nursing Care Facility Services', false],
  ['Allied Care Experts (ACE) Medical Center - Cagayan de Oro', false],
  ['Balubal Super Health Center', true],
  ['Cagayan de Oro City Hospital - Tablon', true],
  ['Cagayan de Oro City Hospital - Lumbia', true],
  ['Cagayan de Oro Medical Center', false],
  ['Capitol University Medical Center Foundation of Cagayan', false],
  ['CDO Agusan YAKAP Clinic', true],
  ['CDO Balulang YAKAP Clinic', true],
  ['CDO Bugo YAKAP Clinic', true],
  ['CDO Calaanan YAKAP Clinic', true],
  ['CDO Camaman-an YAKAP Clinic', true],
  ['CDO Carmen YAKAP Clinic', true],
  ['City Health Office (CHO)', true],
  ['City Hall YAKAP clinic', true],
  ['CDO Cugman YAKAP Clinic', true],
  ['CDO Gusa YAKAP Clinic', true],
  ['CDO Iponan YAKAP Clinic', true],
  ['CDO Lapasan YAKAP Clinic', true],
  ['CDO Lumbia YAKAP Clinic', true],
  ['CDO Macabalan 1 YAKAP Clinic', true],
  ['CDO Macasandig YAKAP Clinic', true],
  ['CDO Mambuaya YAKAP Clinic', true],
  ['CDO Nazareth YAKAP Clinic', true],
  ['CDO NHA Kauswagan YAKAP Clinic', true],
  ['CDO Pagatpat YAKAP Clinic', true],
  ['CDO Puntod YAKAP Clinic', true],
  ['CDO Tablon YAKAP Clinic', true],
  ['CDO Upper Balulang YAKAP Clinic', true],
  ['Camp Evangelista Station Hospital', true],
  ['DPCY Health Care Diagnostic & Drug Testing Center', false],
  ['Healthcheck Clinic and Diagnostic Center', false],
  ['Healthway Medical (Centrio)', false],
  ['J.R. Borja General Hospital', true],
  ['Liceo de Cagayan University', false],
  ['Medisense Laboratory Center', false],
  ['Northern Mindanao Medical Center OPD', true],
  ['Puerto Community Hospital', false],
  ['USTP-CDO Medical Clinic', true],
  ['Vitalab Healthcare', false],
  ['Vitaliacare Medical Clinic', false],
  ['WF Galam Pharmacy', false],
]

export const CLINICS = CLINIC_ROWS.map(([name, isPublic], i) => ({ id: 'Y' + (i + 1), name, public: isPublic }))

// values are the backend's ChoUnit enum
export const CHO_UNITS = [
  { value: 'NCD', label: 'Non-communicable disease (NCD) cluster' },
  { value: 'EPIDEMIOLOGY', label: 'Epidemiology and surveillance' },
  { value: 'PLANNING', label: 'Planning' },
]
