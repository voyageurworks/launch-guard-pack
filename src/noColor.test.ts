import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "./cli.js";
import { makeDir, makeRepo } from "./testRepos.js";

const SLOW = 120_000;
// Fake key built by concatenation so this file holds nothing key-shaped.
const FAKE_AWS = "AKI" + "A" + "ZQSENTINEL7731" + "XY";
const ESC = String.fromCharCode(27);

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    io: { out: (s: string) => void out.push(s), err: (s: string) => void err.push(s) },
    text: () => out.join("") + err.join(""),
  };
}

function cleanFiles(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "README.md": "# demo\n",
    LICENSE: "MIT\n",
    "SECURITY.md": "report privately\n",
    ".github/workflows/ci.yml": "name: ci\n",
    ...extra,
  };
}

function fakeHome() {
  const home = makeDir("lg-home-");
  vi.stubEnv("HOME", home.root);
  vi.stubEnv("USERPROFILE", home.root);
  return home;
}

afterEach(() => vi.unstubAllEnvs());

// Issue 27: the report must carry no colour codes when NO_COLOR is set, and its text must be the same when it is not.
describe("NO_COLOR", () => {
  async function report(files: Record<string, string>, env: Record<string, string>) {
    const home = fakeHome();
    const repo = makeRepo();
    try {
      repo.commit("init", files);
      for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
      const c = capture();
      const code = await main([repo.root, "--offline"], c.io);
      return { code, text: c.text() };
    } finally {
      repo.cleanup();
      home.cleanup();
    }
  }

  it("prints no escape codes with NO_COLOR=1, for a pass and for a block", async () => {
    const pass = await report(cleanFiles(), { NO_COLOR: "1", FORCE_COLOR: "1" });
    expect(pass.text.length).toBeGreaterThan(0);
    expect(pass.text).not.toContain(ESC);
    const block = await report(cleanFiles({ "config.txt": `aws = ${FAKE_AWS}\n` }), { NO_COLOR: "1", FORCE_COLOR: "1" });
    expect(block.code).toBe(1);
    expect(block.text).not.toContain(ESC);
    expect(block.text).not.toContain(FAKE_AWS);
  }, SLOW);

  it("prints the same text without NO_COLOR (behaviour unchanged)", async () => {
    const files = cleanFiles({ "config.txt": `aws = ${FAKE_AWS}\n` });
    const plain = await report(files, { NO_COLOR: "1" });
    const unset = await report(files, {});
    expect(unset.code).toBe(plain.code);
    expect(unset.text).not.toContain(ESC);
    // Commit ids and temp folders differ per run; everything else must match.
    const same = (s: string) => s.replace(/\b[0-9a-f]{7,40}\b/g, "<id>").replace(/\/[^\s]*lg-[^\s/]*/g, "<dir>");
    expect(same(unset.text)).toBe(same(plain.text));
  }, SLOW);
});
