import { IsNumberString } from 'class-validator';

// Every known setting is a whole number
export class UpdateSettingDto {
  @IsNumberString({ no_symbols: true })
  value: string;
}
