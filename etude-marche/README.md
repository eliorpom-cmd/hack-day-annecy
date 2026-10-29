# Étude de marché : artisans en Savoie et Haute-Savoie

Faite le 29/10/2026 à 13 h 50. But : savoir quel type d'artisan viser en premier pour le répondeur IA + CRM.

## Combien d'entreprises par métier (offre)

Source : registre officiel des entreprises (SIRENE), via https://recherche-entreprises.api.gouv.fr. Entreprises **actives** ayant un établissement dans le département. Script : `compter.py` (relançable), données : `artisans-savoie.csv`.

| Métier | Savoie (73) | Haute-Savoie (74) | Total |
|---|---:|---:|---:|
| Nettoyage de bâtiments | 2 057 | 3 471 | 5 528 |
| Électricité | 1 052 | 1 700 | 2 752 |
| Menuiserie bois et PVC | 910 | 1 796 | 2 706 |
| Peinture, vitrerie | 809 | 1 864 | 2 673 |
| Maçonnerie générale | 954 | 1 669 | 2 623 |
| Réparation automobile | 762 | 1 416 | 2 178 |
| Coiffure | 722 | 1 366 | 2 088 |
| Soins de beauté | 696 | 1 307 | 2 003 |
| Plomberie, eau et gaz | 632 | 1 002 | 1 634 |
| Photographie | 518 | 930 | 1 448 |
| Paysagiste | 451 | 991 | 1 442 |
| Taxi | 600 | 745 | 1 345 |
| Plâtrerie | 498 | 813 | 1 311 |
| Charpente | 503 | 698 | 1 201 |
| Carrelage | 364 | 822 | 1 186 |
| Chauffage, climatisation | 336 | 627 | 963 |
| Serrurerie, menuiserie métallique | 185 | 322 | 507 |
| Ramonage, nettoyage spécialisé | 172 | 281 | 453 |

Liste complète (30 métiers) dans `artisans-savoie.csv`.

Limites :
- Les chiffres comptent les micro-entrepreneurs, y compris ceux qui ont peu ou pas d'activité.
- « Nettoyage » mélange des grosses sociétés et des indépendants : ce ne sont pas tous des artisans.
- Le registre ne dit pas qui est inscrit à la Chambre des métiers.

## Ce qu'on sait de la demande (appels des clients)

Pas de chiffre fiable trouvé pour les artisans. Ce qui existe :
- Salons et spas : 30 à 37 % des appels restent sans réponse, selon Zenoti, un éditeur qui vend un réceptionniste IA (chiffre de vendeur). https://www.zenoti.com/fr/thecheckin/ai-receptionist-roi
- Recherches Google en France : « serrurier » devant « plombier », selon un blog commercial sans méthode publiée. https://plaqueplastique.fr/blog/metiers-manuels-les-plus-sollicites/
- Une plateforme de dépannage d'Île-de-France : 79 % des demandes concernent la plomberie (bilan de novembre 2022). https://cotedor.ufcquechoisir.fr/wp-content/uploads/sites/113/2022/06/Mes-dépanneurs-Bilan-AL-Novembre-2022.pdf

À trouver sur place : demander à des artisans ou aux sponsors locaux combien d'appels ils manquent par jour.

## Questions pour le brainstorm

- Quel métier reçoit beaucoup d'appels pendant qu'il a les mains prises ?
- Qui a des urgences (plombier, chauffagiste, serrurier) et qui prend surtout des rendez-vous (garage, coiffure) ?
- Qu'est-ce que l'agent ElevenLabs de Mathieu sait déjà faire ?
