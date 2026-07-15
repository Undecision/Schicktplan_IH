import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Markiert einen Endpunkt als öffentlich – umgeht JwtAuthGuard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
