# Checklist — Pull Request (Electron / APP)

- [ ] Branch nomeada (`feat/`, `fix/`, `chore/`)
- [ ] Commits no padrão conventional — ver `docs/checklists/commit-messages.md`
- [ ] Issue ou descrição clara do problema/solução
- [ ] Type-check OK
- [ ] Lint OK
- [ ] Build OK (`npm run build`; `electron:build` se afetar packaging)
- [ ] Sem secrets (`.env`, tokens) no diff
- [ ] Se tocou projeção/displays: guards `isDesktopApp()` / bridge corretos
- [ ] Textos de UI via i18n (pt-BR), sem hardcode novo
