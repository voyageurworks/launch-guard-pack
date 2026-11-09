# Let your AI assistant do the first check

If you use an assistant that can run commands (Claude Code, Codex, Cursor's agent, OpenClaw), paste the block below into it. It asks what you want to check, runs the guided `setup` command and the scans, and explains the result in plain words.

launch-guard never prints a secret, so the report is safe for the assistant to read. The block also tells the assistant not to open your private list file and not to change your files: you fix the findings yourself.

```
Please check my project before I make it public or publish it, using launch-guard. It reports where a secret, personal detail or restricted word is (file and line) and never prints the value.
1. Run: npx -y @voyageurworks/launch-guard-pack setup --help
2. Ask me what to check (a private repository before I make it public, an npm package before I publish it, or both) and which folder it is in.
3. Run: npx -y @voyageurworks/launch-guard-pack setup --check <repo|package|both> --path <folder>, then run each scan command it prints, one at a time.
4. Never print, quote or guess a secret, and never open my private list file (~/.config/launch-guard/private-list.txt): if a step needs me to fill it in, tell me and wait.
5. Tell me in plain words what blocks publishing, what is only advice, and what to do first. Do not change my files: I fix the findings myself.
```

Prefer to do it yourself? Run `npx -y @voyageurworks/launch-guard-pack setup` in a terminal: it asks the same questions and prints every step.
