import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "./permissions.guard";

function createContext(user?: { permissions?: string[] }): ExecutionContext {
  return {
    getType: () => "http",
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe("PermissionsGuard", () => {
  it("erlaubt Zugriff, wenn keine Permission gefordert ist", () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(createContext({ permissions: [] }))).toBe(true);
  });

  it("erlaubt Zugriff, wenn der Nutzer die geforderte Permission besitzt", () => {
    const reflector = {
      getAllAndOverride: () => ["admin:benutzer:manage"],
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(createContext({ permissions: ["admin:benutzer:manage"] }))).toBe(true);
  });

  it("wirft ForbiddenException (403), wenn die Permission fehlt", () => {
    const reflector = {
      getAllAndOverride: () => ["admin:benutzer:manage"],
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(() => guard.canActivate(createContext({ permissions: ["eintraege:read"] }))).toThrow(
      ForbiddenException,
    );
  });

  it("wirft ForbiddenException, wenn kein Nutzer am Request hängt", () => {
    const reflector = {
      getAllAndOverride: () => ["admin:benutzer:manage"],
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(() => guard.canActivate(createContext(undefined))).toThrow(ForbiddenException);
  });
});
