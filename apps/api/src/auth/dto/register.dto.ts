import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72) // límite de bcrypt/argon2 en bytes de input
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;
}
