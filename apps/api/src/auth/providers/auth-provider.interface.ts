export interface ValidatedCredentials {
  userId: string;
}

/**
 * Austauschbare Authentifizierungs-Schnittstelle (P1.3). Aktuell aktiv:
 * LocalAuthProvider (Argon2). OidcAuthProvider ist ein per Env aktivierbares
 * Gerüst für Microsoft Entra ID.
 */
export interface AuthProvider {
  readonly name: string;
  validateCredentials(
    usernameOrEmail: string,
    password: string,
  ): Promise<ValidatedCredentials | null>;
}

export const AUTH_PROVIDER = Symbol("AUTH_PROVIDER");
