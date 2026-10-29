# Maquette — Cabinet DBL Avocat (Maître Ousmane Dambel)

Maquette de travail du futur site de Maître Ousmane Dambel, avocat au Barreau de Bruxelles.
Direction artistique « Chemise de dossier » : papier ivoire, encre bleu nuit, rouge cachet, lampe de bureau en WebGL.

Site statique (HTML, CSS, JavaScript) sans étape de construction, prêt pour Vercel.

## Pages

| Adresse | Fichier | Contenu |
|---|---|---|
| `/` | `index.html` | Accueil : ouverture, cabinet, matières (galerie épinglée), déroulé d'un dossier, principes, honoraires, accès, rendez-vous |
| `/matieres` | `matieres.html` | Les cinq matières en chemises qui s'ouvrent, juridictions |
| `/honoraires` | `honoraires.html` | Modalités, tarifs indicatifs, estimateur, rendez-vous simulé en 4 étapes |
| `/mentions-legales` | `mentions-legales.html` | Mentions légales (à compléter) |
| — | `404.html` | Page introuvable |

## Bibliothèques (hébergées avec le site)

- GSAP 3.15 (ScrollTrigger, SplitText) — `assets/js/vendor/`
- OGL (rendu WebGL) — `assets/js/vendor/ogl/`
- Défilement fluide maison (`assets/js/main.js`), le défilement natif reste la référence
- Polices WOFF2 : Newsreader, Hanken Grotesk, IBM Plex Mono (licence SIL OFL)

## Mise à jour d'une version

- Feuille de style et scripts appelés avec `?v=N` (pages, `modulepreload`, `import` de `main.js`). Changer N partout à chaque version livrée.
- Pas de règle Cache-Control dans `vercel.json` : Vercel revérifie les fichiers à chaque visite.
- Images : remplacer un fichier sous le même nom suffit (`-grand.webp` et `-petit.webp`).

## Images

- Photos réelles du site actuel :
  - `portrait-*.webp` : portrait officiel de Maître Dambel (recadré en 4:5) ;
  - `bureau-*.webp` : le bureau du cabinet, recadré sur la bibliothèque pour qu'aucune étiquette de dossier ne soit lisible (secret professionnel), bas de l'image adouci ;
  - `palais-justice-*.webp` : le Palais de justice de Bruxelles, place Poelaert.
- Logo : `logo-od.webp` (monogramme, fond transparent) et `logo-complet.webp`, extraits du logo « OD, Maître Ousmane Dambel ». Un fichier vectoriel (SVG ou PDF) du logo serait préférable pour la version définitive.
- Favicons : `favicon-32.png`, `apple-touch-icon.png`.
- Toutes les autres images : générées avec Grok (scènes, aucune personne, aucun texte).
- Images de partage : `assets/og/*.jpg` (1200×630), composées avec le portrait, le bureau et le monogramme.

## À compléter avant la mise en ligne définitive

- Nom du cabinet à unifier (cinq variantes sur le site actuel)
- Code postal (1000 ou 1060) et adresse e-mail à garder (info@dbl-avocat.be ou o.dambel@avocat.be)
- Liste des matières : cinq au maximum (Code de déontologie, art. 5.4)
- Honoraires : hors TVA ou TVA comprise ; aide juridique acceptée ou non
- Horaires d'ouverture
- Mentions légales : Ordre exact, assurance responsabilité professionnelle, hébergeur
- Politique de confidentialité (RGPD) et vrai envoi du formulaire

## À retirer à la mise en ligne définitive

1. La ligne `<meta name="robots" content="noindex, nofollow">` dans chaque page HTML.
2. Le bloc `X-Robots-Tag` dans `vercel.json`.
3. Les post-it jaunes « À confirmer / À compléter » une fois les réponses intégrées.
4. Les mentions « Maquette : aucune donnée n'est envoyée » quand le formulaire sera branché.
5. Mettre à jour les adresses absolues `og:url` / `og:image` (`https://dbl-avocat-maquette.vercel.app`) vers le domaine définitif.

## Options utiles

- `?webgl=0` à la fin d'une adresse : version sans WebGL.
- Bouton « Calme » dans l'en-tête : version sans animations, mémorisée dans le navigateur ; activée d'office si le système demande de réduire les animations.
