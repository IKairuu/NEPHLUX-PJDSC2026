import { ClinicSector, LocationPrecision } from '../../generated/prisma/client';
import { ClinicWithBarangay } from '../clinics.repository';

export class ClinicResponseDto {
  id: string;
  yakapRef: string;
  name: string;
  shortName: string | null;
  sector: ClinicSector;
  phone: string | null;
  address: string | null;
  barangay: { id: number; name: string };
  lat: number;
  lon: number;
  locationPrecision: LocationPrecision;
  accreditationExpiry: Date | null;

  static fromModel(c: ClinicWithBarangay): ClinicResponseDto {
    return {
      id: c.id,
      yakapRef: c.yakapRef,
      name: c.name,
      shortName: c.shortName,
      sector: c.sector,
      phone: c.phone,
      address: c.address,
      barangay: c.barangay,
      lat: c.lat,
      lon: c.lon,
      locationPrecision: c.locationPrecision,
      accreditationExpiry: c.accreditationExpiry,
    };
  }
}
