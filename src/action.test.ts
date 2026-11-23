import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const action = readFileSync(join(ROOT, "action.yml"), "utf8");
const ciDoc = readFileSync(join(ROOT, "docs", "ci.md"), "utf8");

describe("action.yml", () => {
  it("names the four inputs the docs describe", () => {
    for (const name of ["path", "pack", "fail-on", "version"]) {
      expect(action).toMatch(new RegExp(`^  ${name}:`, "m"));
      expect(ciDoc).toContain("`" + name + "`");
    }
  });

  it("is a composite Action that always runs offline", () => {
    expect(action).toContain("using: composite");
    expect(action).toContain("--offline");
  });

  it("passes inputs through env only, never into the script text", () => {
    const [head, script] = action.split("run: |");
    expect(script).toBeDefined();
    expect(script).not.toContain("${{");
    // Every `${{ inputs.* }}` sits on an env line.
    for (const line of head.split("\n").filter((l) => l.includes("${{ inputs."))) {
      expect(line).toMatch(/^\s+LG_[A-Z_]+: \$\{\{ inputs\.[a-z-]+ \}\}$/);
    }
  });

  it("refuses values it does not understand", () => {
    expect(action).toContain("fail-on must be block or warn");
    expect(action).toContain("pack must be true or false");
    expect(action).toContain("Node 22 or newer");
  });
});
