import { BarangayRow } from '../barangays.repository';

export class BarangayCentreDto {
  lat: number;
  lon: number;
}

export class BarangayResponseDto {
  id: number;
  psgcCode: string;
  name: string;
  codeIndex: number;
  pop2020: number;
  pop2024: number | null;
  centre: BarangayCentreDto | null;
  boundary?: unknown;

  static fromModel(
    b: BarangayRow,
    includeBoundary = false,
  ): BarangayResponseDto {
    const dto = new BarangayResponseDto();
    dto.id = b.id;
    dto.psgcCode = b.psgcCode;
    dto.name = b.name;
    dto.codeIndex = b.codeIndex;
    dto.pop2020 = b.pop2020;
    dto.pop2024 = b.pop2024;
    dto.centre =
      b.centreLat !== null && b.centreLon !== null
        ? { lat: b.centreLat, lon: b.centreLon }
        : null;
    if (includeBoundary) dto.boundary = b.boundary ?? null;
    return dto;
  }
}
