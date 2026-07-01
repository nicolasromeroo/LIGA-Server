import { IsNumber } from "class-validator";

export class OpenPackDto {
    @IsNumber()
    id: number;
}
