import { createInterface } from "node:readline/promises";

/**
 * `launch-guard setup`: a guided first run. It asks (or takes flags for) what you want to check and prints every step with your
 * folder filled in: the first scan, the optional private list, the check before `npm publish`, a git hook and a CI job. It never
 * writes a file, never reads the private list and never scans anything itself; the commands it prints do that.
 */
export const PACKAGE = "@voyageurworks/launch-guard-pack";

export type Goal = "repo" | "package" | "both";
export const GOALS: Array<{ id: Goal; name: string }> = [
  { id: "repo", name: "A private repository before I make it public" },
  { id: "package", name: "An npm package before I publish it" },
  { id: "both", name: "Both" },
];

/** A job for GitHub Actions that runs launch-guard on every push and pull request. docs/ci.md carries the same text, and a test keeps them equal. */
export const CI_JOB = `name: launch-guard

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  scan:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: 22
      - run: npx -y ${PACKAGE} . --offline`;

/** A pre-push hook that needs nothing installed beyond Node. */
export const HOOK_NPX = `#!/bin/sh
# launch-guard pre-push hook. Save as .git/hooks/pre-push and make it executable (chmod +x).
# A non-zero result stops the push: 1 means a blocking finding, 2 means the tool could not run.
npx -y ${PACKAGE} . --offline || exit 1`;

/** A block to paste into an AI assistant that can run commands. docs/setup-prompt.md carries the same text. */
export const SETUP_PROMPT = `Please check my project before I make it public or publish it, using launch-guard. It reports where a secret, personal detail or restricted word is (file and line) and never prints the value.
1. Run: npx -y ${PACKAGE} setup --help
2. Ask me what to check (a private repository before I make it public, an npm package before I publish it, or both) and which folder it is in.
3. Run: npx -y ${PACKAGE} setup --check <repo|package|both> --path <folder>, then run each scan command it prints, one at a time.
4. Never print, quote or guess a secret, and never open my private list file (~/.config/launch-guard/private-list.txt): if a step needs me to fill it in, tell me and wait.
5. Tell me in plain words what blocks publishing, what is only advice, and what to do first. Do not change my files: I fix the findings myself.`;

const USAGE = `Usage: launch-guard setup [--check repo|package|both] [--path <folder>] [--ci] [--prompt]
  A guided first run: prints every step with your folder filled in. With no flags in a terminal it asks. It writes nothing and runs no scan itself.
  --ci      also print a GitHub Actions job
  --prompt  print a block to paste into an AI assistant that can run commands`;

export type SetupChoice = { goal: Goal; path: string; ci: boolean; windows: boolean };

const quote = (value: string) => (/[\s"']/.test(value) ? `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` : value);

/** Every step as text. Pure, so it can be tested for each choice and system. */
export function setupSteps(choice: SetupChoice): string {
  const folder = quote(choice.windows ? choice.path.split("\\").join("/") : choice.path);
  const indent = (text: string) => text.split("\n").map((line) => `     ${line}`).join("\n");
  const steps: string[] = [];
  if (choice.goal !== "package") steps.push(`Scan the repository (offline: nothing is sent anywhere):\n${indent(`npx -y ${PACKAGE} ${folder} --offline`)}\n   It lists BLOCK (fix before publishing), WARN (advice) and INFO. Exit code 0 = nothing blocks, 1 = something does.`);
  if (choice.goal !== "repo") steps.push(`Scan what \`npm publish\` would upload (it packs into a temporary folder and never publishes):\n${indent(`npx -y ${PACKAGE} ${folder} --pack --offline`)}`);
  steps.push(`Optional but recommended: a private list of your own words (your name, school, address, codewords) so it can find them too. The list stays on your computer, outside every repository, and is never printed. Create a template, then fill it in with your own editor:\n${indent(`npx -y ${PACKAGE} --init-list`)}\n   Without a list, those checks are skipped and the report says so.`);
  steps.push(`Learn what a label means: \`npx -y ${PACKAGE} --explain "secret format"\` (use any label from the report). If an old commit holds a secret, deleting the line is not enough once the repository is public.`);
  steps.push(`Optional: stop a push that would publish a problem. Save this as .git/hooks/pre-push and make it executable:\n${indent(HOOK_NPX)}`);
  if (choice.ci) steps.push(`Optional: run it in GitHub Actions. Save as .github/workflows/launch-guard.yml (a CI runner has no private list, so it covers secrets, history and basics):\n${indent(CI_JOB)}`);
  return `launch-guard setup: ${GOALS.find((goal) => goal.id === choice.goal)!.name.toLowerCase()}\nFolder: ${folder}\n\n${steps.map((step, index) => `${index + 1}. ${step}`).join("\n\n")}`;
}

export type SetupIo = { out(text: string): void; err(text: string): void; ask?: (question: string) => Promise<string>; interactive?: boolean; platform?: string; cwd: string };

const flag = (args: string[], name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};

/** The `setup` command. Returns the exit code: 0 ok, 2 for a usage problem. */
export async function setupCommand(args: string[], io: SetupIo): Promise<0 | 2> {
  if (args.includes("--help") || args.includes("-h")) return io.out(`${USAGE}\n`), 0;
  if (args.includes("--prompt")) return io.out(`${SETUP_PROMPT}\n`), 0;
  let goal = flag(args, "--check") as Goal | undefined;
  let path = flag(args, "--path");
  if (io.interactive && io.ask) {
    if (!goal) {
      const answer = (await io.ask(`What do you want to check?\n${GOALS.map((g, index) => `  ${index + 1}. ${g.name}`).join("\n")}\n[1] > `)).trim();
      goal = (/^\d+$/.test(answer) ? GOALS[Number(answer) - 1]?.id : (answer as Goal)) ?? "repo";
      if (!answer) goal = "repo";
    }
    if (!path) path = (await io.ask(`Folder of the project [${io.cwd}] > `)).trim() || io.cwd;
  }
  goal ??= "repo";
  path ??= io.cwd;
  if (!GOALS.some((candidate) => candidate.id === goal)) return io.err(`launch-guard: unknown choice for --check. Use repo, package or both.\n${USAGE}\n`), 2;
  io.out(`${setupSteps({ goal, path, ci: args.includes("--ci"), windows: (io.platform ?? process.platform) === "win32" })}\n`);
  return 0;
}

/** Reads answers from the terminal. */
export function terminalAsk(): { ask: (question: string) => Promise<string>; close: () => void } {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return { ask: (question) => rl.question(question), close: () => rl.close() };
}

/**
 * What to do next, for the text report only (printed on stderr, so what is pasted from stdout stays exactly the report). Built from
 * fixed labels and the exit code, never from a path or a value.
 */
export function nextHints(labels: string[], code: number, options: { pack: boolean }): string[] {
  const has = (label: string) => labels.includes(label);
  const hints: string[] = [];
  if (code === 1) hints.push('Fix each BLOCK (the file and line are shown), then run it again. What a label means: launch-guard --explain "<label>".');
  else hints.push("Nothing blocks publishing. WARN lines are advice; --fail-on warn makes them fail the run too.");
  if (has("secret in history") || has("term in history")) hints.push('A "history" finding means an old commit still holds it: deleting the line is not enough once the repository is public (launch-guard --explain "secret in history").');
  if (has("not a repository root")) hints.push("History was NOT checked: run it on the top folder of the git repository.");
  if (has("checks skipped: no private list")) hints.push("Not checked: your own words (name, school, codewords). Create a private list with: launch-guard --init-list");
  if (!options.pack && code !== 1) hints.push("Publishing to npm? Also run: launch-guard . --pack --offline");
  hints.push("First time? launch-guard setup   (a guided walk-through)");
  return hints;
}
