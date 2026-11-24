# dsh-tool-deny

DeepSeek Harness plugin that hides tools and applies ordered global, workspace, and preset allow-lists. See `README.md` for options.

- `index.js` is the Host policy plugin; `client.js` registers the Web Settings page. `test/fake-model.mjs`, `test/plugin.test.mjs`, and `test/client.test.mjs` are covered by `npm test`.
- Run `npm test`, `node --check index.js`, and `node --check client.js` after changes.
- Test real dsh behavior only in a throwaway `DSH_HOME`, never a live instance or home directory.
- Keep `cordis.patch.yml` limited to bootstrapping the empty `dsh-tool-deny-runtime` row (`config: {}`); policy lists belong in Profile Settings or each workspace's `.dsh-tools.yml`.
- Update `README.md` when options or behavior change, and mirror it in `README.zh.md` so the English and Chinese READMEs stay in sync.
- If `AGENTS.local.md` exists, follow it for local setup and full test steps.
