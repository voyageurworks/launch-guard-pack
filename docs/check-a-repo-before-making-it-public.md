# Check a private repository before you make it public

Making a repository public publishes its whole history, not only the files you see today. A key you deleted last month is still readable in an old commit. This page is the short version of what to do, using launch-guard. You need Node.js 22 or newer.

## 1. Run it

```sh
npx -y @voyageurworks/launch-guard-pack path/to/your/repo --offline
```

`--offline` skips the one network step (a read-only `git ls-remote`). The command never edits the repository.

## 2. Read the result

The last line is `RESULT: PASS` or `RESULT: FAIL`, and the exit code is `0` or `1`. Findings come as `file:line` plus a kind, never the secret itself. Real output on a throwaway repository whose `app.js` held a fake AWS-style key:

```text
BLOCK (2)
  app.js:1 secret format
  95a219e:app.js:1 secret in history
```

The second line is the one people miss: the key is also in commit `95a219e`.

## 3. Deleting the line is not enough

On the same demo, after the key was removed from `app.js` and the change committed, the report still said:

```text
BLOCK (1)
  95a219e:app.js:1 secret in history
```

Old commits stay reachable. If a real secret was ever committed, **revoke it first** (it counts as leaked), then remove it from history with a tool built for that (for example `git filter-repo`) before the repository goes public. launch-guard only reports; it never rewrites history.

## 4. Check what you are about to publish to npm

```sh
npx -y @voyageurworks/launch-guard-pack path/to/your/package --pack --offline
```

This checks what `npm pack` would ship, without publishing.

## 5. Make it automatic

- Before every push: `launch-guard --print-hook` prints a git `pre-push` hook; you save it yourself.
- In CI: see [using launch-guard in CI](ci.md). A CI runner has no private list, so run the personal-details check on your own machine too.
- In Claude Code: [install the plugin](claude-code-plugin.md) and ask "is this repository safe to make public?"

## What it does not replace

launch-guard complements general secret scanners such as gitleaks and TruffleHog; run those too. Its job is to be safe to run when an AI assistant is reading the output. See the README for the comparison and the honest limits.
