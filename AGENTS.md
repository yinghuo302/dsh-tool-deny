# dsh-tool-deny

DeepSeek Harness plugin that hides or refuses tools per agent. See `README.md` for options.

- `index.js` is the Host policy plugin; `client.js` registers the Web Settings page. `test/fake-model.mjs` and `test/plugin.test.mjs` are covered by `npm test`.
- Run `npm test`, `node --check index.js`, and `node --check client.js` after changes.
- Test real dsh behavior only in a throwaway `DSH_HOME`, never a live instance or home directory.
- Keep `cordis.patch.yml` empty. Hide lists belong in each user's own profile patch.
- Update `README.md` when options or behavior change, and mirror it in `README.zh.md` so the English and Chinese READMEs stay in sync.
- If `AGENTS.local.md` exists, follow it for local setup and full test steps.
