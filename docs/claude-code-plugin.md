# Install launch-guard as a Claude Code plugin

launch-guard ships a small Claude Code plugin, so you can add the skill with two commands instead of copying a folder. It needs Claude Code 2.1.275 or newer and Node.js 22 or newer.

```text
/plugin marketplace add voyageurworks/launch-guard-pack
/plugin install launch-guard@voyageurworks-launch-guard
```

Then ask your assistant: "Is this repository safe to make public?" The skill runs `launch-guard` on the repository and reads only its report, which never contains a secret, a value from your private list, an author name or a commit message.

The same two steps from a terminal:

```sh
claude plugin marketplace add voyageurworks/launch-guard-pack
claude plugin install launch-guard@voyageurworks-launch-guard
```

## What was run

On 2026-11-09 the manifests passed `claude plugin validate`, and the marketplace and plugin were added and installed from a local clone in a throwaway home with Claude Code 2.1.319 on Windows 11; `claude plugin details launch-guard` listed one skill, no hooks, no agents and no MCP servers. After the pull request merged, the same two commands were run against the GitHub name `voyageurworks/launch-guard-pack` in a fresh throwaway home and installed the plugin with its one skill.

## Other assistants

Codex and other tools that read `SKILL.md` folders: copy the `skill/` folder into the tool's skills directory (see the README). No plugin is needed to run the command itself:

```sh
npx -y @voyageurworks/launch-guard-pack path/to/your/repo
```
