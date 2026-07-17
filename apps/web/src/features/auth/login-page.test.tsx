import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./auth-context";
import { LoginPage } from "./login-page";

vi.mock("./api", () => ({
  fetchMe: vi.fn().mockRejectedValue(new Error("nicht angemeldet")),
  refreshAccessToken: vi.fn().mockRejectedValue(new Error("kein Refresh-Token")),
  login: vi.fn(),
  logoutRequest: vi.fn(),
}));

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  it("zeigt Validierungsfehler bei leerem Formular", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => expect(screen.getByRole("button", { name: "Anmelden" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Anmelden" }));

    expect(await screen.findByText("Benutzername ist erforderlich")).toBeInTheDocument();
    expect(await screen.findByText("Passwort ist erforderlich")).toBeInTheDocument();
  });

  it("zeigt eine Fehlermeldung bei fehlgeschlagenem Login", async () => {
    const { login } = await import("./api");
    vi.mocked(login).mockRejectedValueOnce(new Error("401"));
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => expect(screen.getByRole("button", { name: "Anmelden" })).toBeEnabled());
    await user.type(screen.getByLabelText("Benutzername"), "testuser");
    await user.type(screen.getByLabelText("Passwort"), "falsches-passwort");
    await user.click(screen.getByRole("button", { name: "Anmelden" }));

    expect(
      await screen.findByText("Anmeldung fehlgeschlagen. Bitte Benutzername und Passwort prüfen."),
    ).toBeInTheDocument();
  });
});
