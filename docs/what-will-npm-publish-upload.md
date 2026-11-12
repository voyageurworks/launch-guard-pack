# What will `npm publish` upload? Check before you publish

A clean git repository can still publish a leaky npm package. What `npm publish` uploads is decided by the `files` list in `package.json`, by `.npmignore` and by `.gitignore`, **not by what you committed**. A `.env` file, an assistant settings folder or a source map can ride along without anyone deciding to publish them. This page shows how to see exactly what would go out, and how to check it, using a throwaway package whose "secret" is made up.

Everything below was run on 2026-11-11 with npm 11.19.0 and Node 24.20.0 on Windows 11, and launch-guard-pack 0.2.4.

## 1. A package that publishes more than you meant

A tiny package with the usual leftovers (no `files` list in `package.json`, no `.npmignore`, no `.gitignore`):

```sh
mkdir demo-pkg && cd demo-pkg && mkdir dist .claude
echo '{ "name": "demo-pkg", "version": "1.0.0", "main": "dist/index.js" }' > package.json
printf "const k = 'AKIA%s';\nmodule.exports = {};\n" ABCDEFGHIJKLMNOP > dist/index.js     # a made-up AWS-style key
printf '{"version":3,"sources":["../src/index.js"],"sourcesContent":["// original source"],"mappings":""}' > dist/index.js.map
echo "SECRET=not-a-real-secret" > .env
printf '{"permissions":{}}' > .claude/settings.local.json
```

## 2. See what npm would upload, without publishing

```sh
npm pack --dry-run
```

It printed:

```text
Tarball Contents
18B .claude/settings.local.json
25B .env
55B dist/index.js
97B dist/index.js.map
68B package.json
total files: 5
```

Five files, and two of them are the ones you would never choose to publish: `.env` and the assistant settings. `npm pack --dry-run` shows the list but does not judge it.

## 3. Let launch-guard judge it

```sh
npx -y @voyageurworks/launch-guard-pack . --pack --offline
```

```text
BLOCK (4)
  .env tracked env file
  dist/index.js:1 secret format
  .claude/settings.local.json agent folder in package
  .env env file in package

WARN (2)
  dist/index.js.map source map with sources
  package.json no files list in package

INFO (4)
  list checks skipped: no private list
  npm pack packed without running scripts
  history history not part of a package
  5 files, 263 B unpacked package contents
RESULT: FAIL
```

Each line is a file (and line) plus a kind of problem. It never prints the key or any part of it. The `package.json no files list in package` warning is the root cause: without a `files` list, npm falls back to its default rules.

## 4. Fix it and check again

Allow only what you mean to ship, and remove the key from the built file:

```sh
echo '{ "name": "demo-pkg", "version": "1.0.0", "main": "dist/index.js", "files": ["dist/index.js"] }' > package.json
printf "const k = process.env.DEMO_KEY;\nmodule.exports = {};\n" > dist/index.js
```

```text
$ npm pack --dry-run
53B dist/index.js
96B package.json
total files: 2

$ npx -y @voyageurworks/launch-guard-pack . --pack --offline
INFO (4)
  list checks skipped: no private list
  npm pack packed without running scripts
  history history not part of a package
  2 files, 149 B unpacked package contents
RESULT: PASS
```

An allow-list (`files`) is safer than a deny-list (`.npmignore`): a new file is left out until you add it. Make this the last step before `npm publish`, and in CI before a release.

## What this does not cover

- It checks the package as `npm pack` would build it (it runs `npm pack --ignore-scripts`). If your published files are made by a `prepack` or `build` step, run that step first, or the report will not describe what you really ship.
- npm only; it does not compare with what is already published and uses no network.
- The secret check looks for known key formats and long random-looking values next to words like key or token. A secret with no hint beside it is not found. Use a general scanner too; see [Next to gitleaks and TruffleHog](../README.md#next-to-gitleaks-and-trufflehog).
- Your own words (names, an address, a school) are only checked if you create a private list: [Your private list](../README.md#your-private-list).

For the whole repository, not only the package, see [Check a repository before making it public](check-a-repo-before-making-it-public.md).
