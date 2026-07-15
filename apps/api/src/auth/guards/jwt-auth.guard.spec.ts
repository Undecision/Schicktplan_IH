import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";

function createContext(headers: Record<string, string>, request: Record<string, unknown> = {}) {
  const req = { headers, ...request };
  const ctx = {
    getType: () => "http",
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

describe("JwtAuthGuard", () => {
  const configServiceStub = {
    get: () => ({ jwtAccessSecret: "secret" }),
  } as never;

  it("lässt @Public()-Endpunkte ohne Token durch", () => {
    const reflector = { getAllAndOverride: () => true } as never;
    const jwtService = { verify: jest.fn() } as never;
    const guard = new JwtAuthGuard(reflector, jwtService, configServiceStub);
    const { ctx } = createContext({});
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("wirft 401 ohne Authorization-Header", () => {
    const reflector = { getAllAndOverride: () => false } as never;
    const jwtService = { verify: jest.fn() } as never;
    const guard = new JwtAuthGuard(reflector, jwtService, configServiceStub);
    const { ctx } = createContext({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it("wirft 401 bei ungültigem Token", () => {
    const reflector = { getAllAndOverride: () => false } as never;
    const jwtService = {
      verify: jest.fn(() => {
        throw new Error("invalid");
      }),
    } as never;
    const guard = new JwtAuthGuard(reflector, jwtService, configServiceStub);
    const { ctx } = createContext({ authorization: "Bearer invalid-token" });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it("setzt request.user bei gültigem Token", () => {
    const payload = {
      sub: "user-1",
      email: "a@b.de",
      name: "Test",
      rollen: ["Administrator"],
      permissions: ["admin:benutzer:manage"],
      gewerkeSichtbarkeit: [],
    };
    const reflector = { getAllAndOverride: () => false } as never;
    const jwtService = { verify: jest.fn(() => payload) } as never;
    const guard = new JwtAuthGuard(reflector, jwtService, configServiceStub);
    const { ctx, req } = createContext({ authorization: "Bearer valid-token" });

    expect(guard.canActivate(ctx)).toBe(true);
    expect((req as { user?: unknown }).user).toEqual({
      id: "user-1",
      email: "a@b.de",
      name: "Test",
      rollen: ["Administrator"],
      permissions: ["admin:benutzer:manage"],
      gewerkeSichtbarkeit: [],
    });
  });
});
