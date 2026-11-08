# Roguelike

Roguelike en temps réel, en TypeScript, jouable dans le navigateur et en natif desktop, avec du jeu en ligne. La partie est hébergée par l'un des joueurs. Le pourquoi de l'architecture est dans [ARCHITECTURE.md](ARCHITECTURE.md).

## Prérequis

- **Node.js ≥ 22.** Les scripts `.ts` de `scripts/` sont lancés directement par Node, qui retire les types tout seul.
- Rien d'autre. Le compilateur C (pour le WebAssembly) arrive par npm.

```sh
npm install
```

## Lancer

| Commande | Ce que ça fait |
|---|---|
| `npm run web` | Serveur de dev Vite pour la version navigateur, avec rechargement à chaud. |
| `npm run desktop` | Lance la version desktop (fenêtre SDL) depuis les sources, à travers Vite. Pas de rechargement : on relance après chaque modification. |
| `npm run server` | Serveur de signalisation et de lobby, sur `ws://localhost:8787` (`PORT` pour changer). Redémarre quand une source change. |

## Vérifier

| Commande | Ce que ça fait |
|---|---|
| `npm test` | Tous les tests (Vitest), de tous les packages. |
| `npm run typecheck` | `tsc` sur chaque package, après avoir régénéré les déclarations des fichiers C. |
| `npm run lint` | ESLint : le style, et les règles de dépendance entre modules. |

## Construire

| Commande | Résultat |
|---|---|
| `npm run web:build` | `web/dist/`, à servir tel quel, depuis n'importe quel sous-chemin. Dossier cible : variable `WEB_OUT_DIR` (relative au dossier où npm est lancé, ou absolue ; le dossier est vidé avant le build), ex. `$env:WEB_OUT_DIR="docs"; npm run web:build` (PowerShell) ou `WEB_OUT_DIR=docs npm run web:build` (bash). |
| `npm run desktop:build` | `desktop/dist/<os>-<arch>/` : l'exécutable (Node SEA), `native/` et `assets/`. Uniquement pour la machine courante. |
| `npm run desktop:build:node` | Le même dossier, avec `main.cjs` à la place de l'exécutable. Utile pour savoir si un problème vient du bundle ou de la SEA. |
| `npm run desktop:start` / `desktop:start:node` | Lance ce qui a été construit. |
| `npm run server:build` | `server/dist/main.js`, à déployer avec un `npm install`. |

## Organisation

Monorepo en npm workspaces :

| Package | Rôle |
|---|---|
| `core/` | Le jeu lui-même, sans aucune API d'environnement : simulation, moteur, UI. |
| `web/` | Les adapters navigateur de `Platform`, plus l'entrée Vite. |
| `desktop/` | Les adapters Node (SDL, `@kmamal/gl`, `fs`), plus le build SEA. |
| `server/` | Signalisation WebRTC et lobby. Ne dépend pas de `core`. |
| `test/` | Les tests de `core`, rangés comme `core/src` (`test/src/engine/gpu/Painter.test.ts` teste `core/src/engine/gpu/Painter.ts`), et les fakes partagés (GL, input, stockage) dans `test/src/fixtures`. |
| `command_line/` | Outil en ligne de commande, dépend de `core` : liste les catalogues Mecard (cartes, kits, monstres…). Voir [command_line/CLI.md](command_line/CLI.md). |
| `assets/` | Images et sons livrés avec le jeu. |
| `art/` | Les sources des images faites avec le projet `picture` (`.pic.json`), rendues dans `assets/` au même chemin. |

Les règles importantes, que l'ESLint fait respecter :

- **`core` ne touche jamais l'environnement** (`window`, `fetch`, `process`, `setTimeout`…). Tout passe par les ports de `core/src/platform`, que `web` et `desktop` implémentent.
- **Seul `core/src/engine/gpu` appelle WebGL.** Le reste dessine à travers son `Painter`.
- **La simulation est déterministe** : pas de `Math.random` ni de `Date.now` dans `core/src/sim`.

La doc de chaque partie du moteur :

| Doc | Sujet |
|---|---|
| [DUNGEON_OF_THE_MECARD.md](DUNGEON_OF_THE_MECARD.md) | Le jeu *Dungeon of the Mecard* : chaînes de cartes, file d'étapes, cœurs, déclencheurs. |
| [GRAPHICS_ENGINE.md](GRAPHICS_ENGINE.md) | `engine/gpu`, la couche WebGL. |
| [ATLAS.md](ATLAS.md) | `engine/atlas`, l'assemblage des sprites. |
| [UI_ENGINE.md](UI_ENGINE.md) | `engine/ui`. |
| [INPUT_ENGINE.md](INPUT_ENGINE.md) | `engine/input`. |
| [ASSET_STORAGE_FILE.md](ASSET_STORAGE_FILE.md) | Assets livrés et sauvegardes du joueur. |
| [STYLE.md](STYLE.md) | Le guide de style. Code et commentaires en anglais, doc en français. |

## Ajouter un asset

On dépose le fichier dans `assets/` (`.png`, `.wav` ou `.ogg`, chemin en minuscules), puis on lance `npm run assets`. Ça régénère `core/src/engine/assets/AssetPath.ts`, ce qui rend une faute de frappe dans un chemin d'asset visible à la compilation. Ce fichier est commité. `npm run assets -- --check` vérifie qu'il est à jour.

Une image dessinée avec le projet `picture` (rangé à côté de ce dépôt, ou là où pointe `PICTURE`) a sa source dans `art/` : `art/mecard/travel/forge/4.pic.json` donne `assets/mecard/travel/forge/4.png`. `npm run art` rend toutes les sources puis lance `npm run assets`, et `npm run art -- mecard/travel` ne rend que celles d'un dossier.

## Écrire du C (WebAssembly)

Pour les calculs lourds, `core` peut importer un fichier C directement :

```ts
import { sumOfSamples, samples, memory } from "./kernel.c"
```

- Le `.c` est compilé quand Vite le charge, que ce soit en dev, en test ou en build. Il n'y a rien à lancer à part, ni rien à installer : clang tourne en WebAssembly (`@yowasp/clang`).
- **Un `.c` = un module.** Tout ce qui n'est pas `static` est exporté. Une fonction devient une fonction JS, et une variable devient son adresse dans `memory`.
- Un `.h` ne sert qu'à partager du code entre plusieurs `.c`, puisque chaque `.c` est compilé seul.
- `malloc`, `string.h` et `math.h` sont disponibles. Ce qui fait de l'I/O (`printf`, `time`, fichiers) est refusé à la compilation.
- Les types sont écrits dans `.generated/`. Il faut que Vite ait chargé le `.c` au moins une fois pour que l'éditeur connaisse un nouvel import.

Le détail (types, mémoire, déterminisme) est dans la section « Calcul en C » d'[ARCHITECTURE.md](ARCHITECTURE.md). Le plugin est dans [core/build/](core/build/).

## Fichiers générés

| Fichier | Généré par | Commité |
|---|---|---|
| `core/src/engine/assets/AssetPath.ts` | `npm run assets` | oui |
| `assets/**/*.png` venus d'`art/` | `npm run art` | oui |
| `.generated/**/*.d.c.ts` | Vite à chaque chargement d'un `.c`, ou `npm run wasm` | non |
| `*/dist/` | les builds | non |

On ne les modifie jamais à la main.
