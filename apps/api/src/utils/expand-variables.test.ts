import { describe, it, expect } from "vitest";
import { expandVariables } from "./expand-variables.js";

describe("expandVariables", () => {
  it("replaces placeholders", () => {
    const s = expandVariables("Hello {{name}}", { name: "World" });
    expect(s).toBe("Hello World");
  });

  it("supports built-in current_date key via expandVariables", () => {
    const s = expandVariables("{{current_date}}", {});
    expect(s.length).toBeGreaterThan(0);
  });
});
