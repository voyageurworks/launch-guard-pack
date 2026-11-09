import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { main } from "./cli.js";
import { CI_JOB, GOALS, HOOK_NPX, SETUP_PROMPT, nextHints, setupCommand, setupSteps } from "./setup.js";

const root = resolve(import.meta.dirname, "..");
const capture = () => {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, io: { out: (s: string) => void out.push(s), err: (s: string) => void err.push(s) } };
};

describe("setup steps", () => {
  it("covers every goal and system, with the real folder, the offline flag and the list explanation", () => {
    for (const goal of GOALS) for (const windows of [false, true]) {
      const text = setupSteps({ goal: goal.id, path: windows ? "C:\\Users\\me\\my project" : "/home/me/my project", windows, ci: false });
      expect(text).toContain(windows ? '"C:/Users/me/my project"' : '"/home/me/my project"');
      expect(text).toMatch(/--init-list/);
      expect(text).toMatch(/never printed/);
      expect(text).toMatch(/--explain/);
      expect(text).toContain(goal.id === "package" ? "--pack --offline" : "--offline");
    }
  });
  it("only mentions --pack where the goal needs it, and prints the CI job only on request", () => {
    expect(setupSteps({ goal: "repo", path: "/p", windows: false, ci: false })).not.toMatch(/--pack/);
    expect(setupSteps({ goal: "package", path: "/p", windows: false, ci: false })).not.toMatch(/Scan the repository/);
    expect(setupSteps({ goal: "both", path: "/p", windows: false, ci: false })).not.toContain("name: launch-guard");
    expect(setupSteps({ goal: "both", path: "/p", windows: false, ci: true })).toContain("name: launch-guard");
  });
});

describe("the setup command", () => {
  it("prints the steps from flags", async () => {
    const c = capture();
    expect(await setupCommand(["--check", "both", "--path", "/work/app", "--ci"], { ...c.io, cwd: "/x", platform: "linux" })).toBe(0);
    expect(c.out.join("")).toContain("/work/app");
    expect(c.out.join("")).toContain("--pack --offline");
  });
  it("asks when it is interactive, taking a number or a name, and falls back to the current folder", async () => {
    const answers = ["2", ""];
    const c = capture();
    expect(await setupCommand([], { ...c.io, cwd: "/here", interactive: true, ask: async () => answers.shift() ?? "", platform: "linux" })).toBe(0);
    expect(c.out.join("")).toContain("an npm package before i publish it");
    expect(c.out.join("")).toContain("Folder: /here");
  });
  it("uses defaults without asking when it is not interactive, and rejects an unknown choice", async () => {
    const c = capture();
    expect(await setupCommand([], { ...c.io, cwd: "/here", platform: "linux" })).toBe(0);
    expect(c.out.join("")).toContain("a private repository before i make it public");
    const bad = capture();
    expect(await setupCommand(["--check", "everything"], { ...bad.io, cwd: "/here" })).toBe(2);
    expect(bad.err.join("")).toMatch(/unknown choice/);
  });
  it("is reachable as `launch-guard setup`, and its help and prompt print without scanning", async () => {
    const help = capture();
    expect(await main(["setup", "--help"], help.io)).toBe(0);
    expect(help.out.join("")).toMatch(/Usage: launch-guard setup/);
    const prompt = capture();
    expect(await main(["setup", "--prompt"], prompt.io)).toBe(0);
    expect(prompt.out.join("").trim()).toBe(SETUP_PROMPT);
  });
});

describe("next-step hints", () => {
  const options = { pack: false };
  it("says what to do for a failure, a pass, history findings, a plain folder and a missing list", () => {
    expect(nextHints(["secret format"], 1, options).join("\n")).toMatch(/Fix each BLOCK/);
    expect(nextHints([], 0, options).join("\n")).toMatch(/Nothing blocks publishing/);
    expect(nextHints(["secret in history"], 1, options).join("\n")).toMatch(/old commit still holds it/);
    expect(nextHints(["not a repository root"], 0, options).join("\n")).toMatch(/top folder of the git repository/);
    expect(nextHints(["checks skipped: no private list"], 0, options).join("\n")).toMatch(/--init-list/);
  });
  it("suggests the package check only when it was not the one that ran, and never holds a path or a value", () => {
    expect(nextHints([], 0, options).join("\n")).toMatch(/--pack/);
    expect(nextHints([], 0, { ...options, pack: true }).join("\n")).not.toMatch(/Publishing to npm/);
    expect(nextHints(["secret format"], 1, options).join("\n")).not.toMatch(/[\\/]\w+\.\w+/);
  });
});

describe("a repository scan that cannot read history does not pass", () => {
  it("exits 2 with one fixed message when git cannot be started", async () => {
    const saved = process.env.PATH;
    const c = capture();
    try {
      process.env.PATH = "";
      process.env.Path = "";
      expect(await main([resolve(root), "--offline"], c.io)).toBe(2);
    } finally {
      process.env.PATH = saved;
      process.env.Path = saved;
    }
    expect(c.err.join("")).toMatch(/git was not found/);
    expect(c.err.join("")).toMatch(/exit code 2, not a pass/);
    expect(c.out.join("")).not.toMatch(/RESULT/);
  });
});

describe("the documents carry the same text the command prints", () => {
  it("docs/ci.md has the CI job, word for word", () => {
    expect(readFileSync(resolve(root, "docs", "ci.md"), "utf8")).toContain(CI_JOB);
  });
  it("docs/setup-prompt.md has the paste-in prompt, word for word", () => {
    expect(readFileSync(resolve(root, "docs", "setup-prompt.md"), "utf8")).toContain(SETUP_PROMPT);
  });
  it("the hook needs only Node: it runs through npx", () => {
    expect(HOOK_NPX).toMatch(/npx -y @voyageurworks\/launch-guard-pack \. --offline \|\| exit 1/);
  });
});

describe("quoting a folder name", () => {
  it("escapes backslashes before quotes", () => {
    const bs = String.fromCharCode(92);
    const text = setupSteps({ goal: "repo", path: `/work/a b${bs}c"d`, windows: false, ci: false });
    expect(text).toContain(`"/work/a b${bs}${bs}c${bs}"d"`);
  });
});
