# MMI Town — site web

Site de présentation de MMI Town, le serveur Minecraft des étudiants MMI de l'IUT de Béziers.

Site statique (HTML, CSS, JS), sans build ni dépendance. Polices auto-hébergées, aucun cookie.

## En local

```bash
python3 -m http.server 8765
```

Puis ouvrir http://localhost:8765.

## Structure

- `index.html`, `style.css`, `script.js` : la page d'accueil
- `mentions-legales.html`, `confidentialite.html`, `cookies.html` : pages légales
- `assets/` : visuels (calques de la cover générés par `branding/make_site_layers.py` du dépôt principal), polices

## À compléter

Les pages légales contiennent des champs `[À COMPLÉTER]` (éditeur, hébergeur, contact, durées de conservation).
Le lien Discord se règle avec `DISCORD_URL` en haut de `script.js`.
