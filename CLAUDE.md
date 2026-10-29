@AGENTS.md
@PROJET.md

Copy : COPY.md fait foi, à lire avant d'écrire du texte d'UI (skill adn-copy).
Design : DESIGN.md fait foi, à lire avant toute UI (skill design-md).

Déploiement (demande de Maxime, 29/10) : après chaque fusion dans `main`, Claude déploie tout seul, sans demander : copie propre de `main` (`git worktree add --detach … origin/main`), `npx astro build`, `npx wrangler deploy`, puis vérifie en production (pages principales en 200). La clé Cloudflare des sessions cloud n'a pas accès à D1 : une nouvelle migration doit aussi pouvoir s'appliquer depuis le Worker (voir `web/src/lib/schema-upgrade.ts`).
