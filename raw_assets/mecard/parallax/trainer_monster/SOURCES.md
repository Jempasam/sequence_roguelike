# Sources du fond « dompteur de monstres »

| Fichier | Origine | Licence | Utilisé pour |
|---|---|---|---|
| `sources/bear.png` (`bear-cut.png` : détourage par script, pixels non roux rendus transparents) | « Kodiak Bear standing on hind legs, USFWS 11394 », David Menke / U.S. Fish and Wildlife Service, Wikimedia Commons — https://commons.wikimedia.org/wiki/File:Kodiak_Bear_standing_on_hind_legs,_USFWS_11394.jpg | Domaine public (PD US FWS) | `parts/bear.pic.json` (monstre enchaîné, `--crop 170,85,185,385`) |
| `sources/skull.png` | « NMNH-EO 067239 SKULL Llama Lama glama 001 », Smithsonian NMNH, Wikimedia Commons — https://commons.wikimedia.org/wiki/File:NMNH-EO_067239_SKULL_Llama_Lama_glama_001.jpg | CC0 | `parts/skull.pic.json` (crânes du calque 4, `--crop 0,75,480,190`) |

Les images ont été réduites (960 px / 500 px de large) et converties en PNG avant import. Le fond vert de l'ours ne se retire pas par `--key` (herbe trop variée) : `bear-cut.png` garde les pixels où R ≥ G−3 et R > B+8.
