# Can I let an AI assistant run a secret scanner on my repository?

Yes, if the scanner's output holds no secret. Most scanners were built for a person at a terminal, so they print what they find. When an AI assistant runs the command, that output becomes part of your conversation with it. This page shows how to check what a scanner prints, and how to keep a leaked key out of a chat.

## The problem

A scanner that shows you the secret it found is useful when only you can read the screen. Under an assistant it is a second leak: the key you were trying to protect is now also in the chat history and in the assistant's working context.

gitleaks is a good example of the usual design. Its own README (read 2026-11-11) shows a verbose `gitleaks git -v` finding with a `Secret:` line holding the matched value, plus the author, the email and the commit. That is the right output for a developer fixing a leak at their own desk. It is the wrong output to hand to an assistant.

## Three ways to handle it

1. **Run the scanner yourself and give the assistant nothing.** Safe, but you lose the help: you must read the report and decide what to do alone.
2. **Use a scanner option that hides the values.** gitleaks documents `--redact` ("redact secrets from logs and stdout", 100% by default). We have not run it, so check what still appears in the output before you trust it with an assistant: the README's sample also shows author, email and commit.
3. **Use a scanner whose output never contains the value.** That is what launch-guard is built for: a finding is a file and line, a kind of problem, and (if you use one) the number of the private-list entry that matched. It never prints the secret, any part of it, an author name, an email or a commit message.

## Check it yourself in a minute, with a fake key

No real secret is needed. This makes a throwaway repository holding a made-up AWS-style key and searches the scanner's whole output for it:

```sh
mkdir scanner-demo && cd scanner-demo && git init -q
printf "const k = 'AKIA%s';\n" ABCDEFGHIJKLMNOP > app.js
git add app.js && git -c user.name=demo -c user.email=demo@example.invalid commit -qm "add config"
npx -y @voyageurworks/launch-guard-pack . --offline > ../report.txt 2>&1
grep -c "ABCDEFGHIJ" ../report.txt
```

On 2026-11-11, with launch-guard-pack 0.2.4 on Windows 11, the report was:

```text
BLOCK (2)
  app.js:1 secret format
  7962124:app.js:1 secret in history
```

(your commit id will differ, and the full report also lists a few warnings), and the search found the key fragment **0** times. The author and the commit message appeared 0 times as well. Run the same check against any scanner before you let an assistant use it.

## A safe workflow with an assistant

- Ask the assistant to run `npx -y @voyageurworks/launch-guard-pack path/to/repo --offline` and to read only its report (the last line is `RESULT: PASS` or `RESULT: FAIL`, and the exit code is `0` or `1`).
- Keep your private list (your name, address, school, codewords) outside the repository and never paste it into the chat. The report says "list entry 3"; you look up line 3 yourself.
- If a real secret was ever committed, revoke it at its provider first, then remove it from history with a tool built for that. Deleting the line is not enough once the repository is public: see [Check a repository before making it public](check-a-repo-before-making-it-public.md).
- In Claude Code you can install it as a plugin: [docs/claude-code-plugin.md](claude-code-plugin.md).

## What launch-guard does not replace

launch-guard checks one git repository (or the package `npm publish` would upload) for a focused set of secret formats and for words you list yourself. It is not a general scanner. gitleaks and TruffleHog cover far more secret types and data sources; keep running them, with `--redact` or yourself, for continuous scanning. Use launch-guard as the last check before "make public", and whenever an assistant is the one running it. The comparison table is in the [README](../README.md#next-to-gitleaks-and-trufflehog).
