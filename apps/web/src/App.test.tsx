import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("rendert die App-Shell mit Navigation", () => {
    render(<App />);
    expect(screen.getAllByText("Schichtbuch").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });
});
