import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

enum UserRole {
    USER = 'USER',
    ADMIN = 'ADMIN'
}

export class CreateAuthDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;
}
