import { PartialType } from '@nestjs/mapped-types';
import { CreateBarangayDto } from './create-barangay.dto';

export class UpdateBarangayDto extends PartialType(CreateBarangayDto) {}
