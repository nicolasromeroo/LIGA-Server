import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class CreateAuthDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    @IsNotEmpty()
    name: string;
}
