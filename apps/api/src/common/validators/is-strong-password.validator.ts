import { registerDecorator, type ValidationOptions } from "class-validator";
import { PASSWORD_MIN_LENGTH, PASSWORD_POLICY_HINT } from "@schichtbuch/shared";

const HAS_LOWERCASE = /[a-z]/;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_DIGIT_OR_SYMBOL = /[\d\W]/;

export function isStrongPassword(value: unknown): boolean {
  return (
    typeof value === "string" &&
    value.length >= PASSWORD_MIN_LENGTH &&
    HAS_LOWERCASE.test(value) &&
    HAS_UPPERCASE.test(value) &&
    HAS_DIGIT_OR_SYMBOL.test(value)
  );
}

/** Passwort-Policy gemäß packages/shared (Mindestlänge + Groß-/Kleinbuchstaben + Ziffer/Sonderzeichen). */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isStrongPassword",
      target: object.constructor,
      propertyName,
      options: { message: PASSWORD_POLICY_HINT, ...validationOptions },
      validator: {
        validate: isStrongPassword,
      },
    });
  };
}
