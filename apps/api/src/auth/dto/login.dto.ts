import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  /** Si es true, la sesión persiste entre reinicios del navegador hasta un logout explícito. */
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
