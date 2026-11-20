# ScholarFit

Plateforme qui collecte les bourses d'études (du bac au doctorat), montre à chaque étudiant celles auxquelles il a droit, et l'aide à préparer son dossier : CV amélioré, lettre de motivation, suivi des candidatures.

Ce dépôt est le **MVP** décrit dans le document de conception du projet. Il tourne en local en quelques minutes, avec ou sans clé d'API d'IA.

## Ce que fait le MVP

| Fonction | Où | Détails |
|---|---|---|
| Assistant de recherche (chat) | Page d'accueil | L'étudiant écrit librement (« Je suis en L3 de biologie au Sénégal… »). L'assistant extrait les critères, pose seulement les questions qui manquent (avec réponses rapides), puis cherche **dans la base** et affiche des cartes avec le lien officiel. L'IA ne répond jamais de mémoire. Visiteur : 3 résultats ; compte : tous, et le profil se remplit. |
| Questionnaire | `/questionnaire` | 5 étapes (toi, études, destination, langues, situation) servies par `GET /api/questionnaire`. Sans compte : nombre de bourses trouvées et 3 aperçus sans score ; après inscription, retour automatique au résultat avec les scores et le profil enregistré. Réponses gardées dans le navigateur (`sf_questionnaire`). |
| Catalogue | `/bourses` | Barre de filtres à gauche : type d'opportunité (bourses, stages, conférences), région, niveau, pays d'études, domaine, nationalité, financement ; tri par priorité (urgentes d'abord), date limite ou montant ; option pour voir les bourses clôturées. Les filtres sont dans l'URL (`/bourses?country=FR`, lien du carrousel de l'accueil). Fiches rendues côté serveur : conditions détaillées, documents avec explications, lien officiel et son état, « Comment postuler » étape par étape, bouton d'accompagnement et tarifs. |
| Profil en 3 étapes | `/profil` | Identité, parcours, projet et atouts, plus une étape facultative (revenus modestes, réfugié, handicap…). Barre de complétude et conseil (« ajoute ton score de langue… »). Import du CV (PDF, .docx, .txt) qui préremplit les champs vides. Suppression du compte en un clic. |
| Matching | `/mes-bourses` | 3 passes : filtres durs (niveau, nationalité, âge, date limite, pays, public ciblé), score de 0 à 100 (domaine 30, projet 25, notes et langues 20, pays 15, financement 10), explication « pourquoi / à surveiller ». Score de chance (faible, moyenne, bonne). |
| Accompagnement | `/accompagnement`, `/conseiller`, `/admin` | Le candidat demande un suivi (objectif, besoins : choix des bourses, CV, lettre, recommandations, entretien, test de langue, visa ; bourses concernées ; langue ; disponibilités) et accepte de partager son dossier. Le conseiller le plus adapté qui a de la place est attribué tout de suite (langue, niveau, domaine, pays, charge), sinon la demande attend dans `/admin`. Un **plan d'étapes daté à rebours** depuis la date limite la plus proche est créé, puis : messages (liés ou non à une candidature), rendez-vous proposés par l'un et confirmés par l'autre avec compte rendu, vue du profil, du CV et des candidatures pour le conseiller, alertes à chaque événement et rappel la veille d'une étape ou d'un rendez-vous. Fin par le conseiller et avis du candidat (1 à 5). Deux offres payantes (Standard 15 000 F CFA, jusqu'à 2 bourses ; Premium 35 000 F CFA, jusqu'à 5 bourses, entretien blanc et visa) ; le candidat peut aussi postuler seul gratuitement. Le paiement (Mobile Money, Wave…) se fait hors plateforme et l'admin le marque reçu. |
| Suivi Kanban | `/suivi` | Colonnes À préparer, En cours, Envoyée, Résultat (glisser-déposer). Checklist des pièces exigées par chaque bourse, notes, **vérification du dossier** (pièces manquantes, longueur de la lettre, crochets à compléter, test de langue, moyenne). |
| Amélioration de CV | `/cv` | Diagnostic noté (structure, verbes d'action, résultats chiffrés, longueur, dates, clarté), réécritures ligne par ligne à accepter ou refuser, conseils par format (CV français, Europass, résumé américain, Lebenslauf, CV académique). Version adaptée à une bourse via `/cv?bourse=ID`. |
| Lettre de motivation | `/lettre/ID` | 4 questions courtes, langue, limite de mots, ton. Brouillon modifiable, avertissements (nombre absent du profil, crochets à compléter, limite dépassée), enregistrement dans le suivi, impression en PDF. |
| Alertes | `/mes-bourses` + console | Nouvelles bourses correspondant au profil, rappels J-30, J-7 et J-1 pour les candidatures pas encore envoyées. |
| Administration | `/admin` | Lancer une source de collecte, tester l'extraction d'une URL, valider les bourses « à vérifier », saisie manuelle, maintenance (expirations et alertes). |

### Avec ou sans IA

- **Sans clé** (`ANTHROPIC_API_KEY` vide) : tout fonctionne en mode hors-ligne. Le chat utilise un analyseur par règles, le CV un diagnostic par règles, la lettre un modèle à trous, l'extraction des pages des expressions régulières.
- **Avec une clé Claude** : extraction des critères du chat, diagnostic complet du CV (orthographe comprise), lettres rédigées sur mesure et extraction des pages de bourses en fiches structurées (sorties JSON garanties par schéma). Réservé aux comptes connectés, avec un plafond quotidien (`AI_FREE_GENERATIONS_PER_DAY`) pour maîtriser le coût. Si l'API échoue ou refuse, la plateforme bascule seule sur le mode hors-ligne.

Les consignes données à l'IA interdisent d'inventer une expérience, une note ou un chiffre : ce qui manque est laissé entre [crochets].

## Démarrer en local

Prérequis : **Python 3.11+** et **Node.js 20+**.

### Le plus simple

```bash
bash start.sh       # macOS / Linux
.\start.ps1         # Windows PowerShell (avant : Set-ExecutionPolicy -Scope Process Bypass)
```

Le script vérifie Python et Node.js, crée ou répare l'environnement Python, met à jour la base (sans doublons, une ancienne base reçoit les nouvelles colonnes et les nouvelles offres), installe le site, lance l'API dans sa propre fenêtre « API ScholarFit » et attend qu'elle réponde avant de lancer le site. Ouvre ensuite http://localhost:3000.

Le navigateur n'appelle jamais le port 8000 directement : le site relaie `/api/...` vers l'API (`frontend/next.config.mjs`). Il n'y a donc ni problème de CORS ni de `localhost` sous Windows, et le site marche aussi ouvert par `127.0.0.1` ou sur un autre port. Si une page affiche « Le serveur de ScholarFit ne répond pas », regarde le message dans la fenêtre « API ScholarFit ».

### À la main

```bash
# 1. API
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows : .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                 # facultatif : ajoute ta clé ANTHROPIC_API_KEY
python -m app.cli seed               # base SQLite + 98 opportunités (82 bourses, 10 stages, 6 conférences) + comptes de démo
uvicorn app.main:app --reload --port 8000

# 2. Site (dans un autre terminal)
cd frontend
npm install
npm run dev                          # relaie /api vers http://127.0.0.1:8000
```

- Site : http://localhost:3000
- Documentation interactive de l'API : http://localhost:8000/docs

### Avec Docker (PostgreSQL)

Le pilote PostgreSQL est dans `backend/requirements-postgres.txt` (installé par le Dockerfile) : l'installation locale avec SQLite n'en a pas besoin.


```bash
docker compose up --build
```

Lance PostgreSQL, l'API et le site. Pour activer l'IA : `ANTHROPIC_API_KEY=sk-... docker compose up --build`.

### Comptes de démo

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Étudiante (profil rempli : Sénégal, master en informatique) | `demo@example.org` | `demo12345` |
| Administrateur | `admin@example.org` | `admin12345` |
| Conseiller (accompagnement, français/anglais, France, Canada, Belgique) | `conseiller@example.org` | `conseil12345` |

Change ces mots de passe et `SECRET_KEY` avant toute mise en ligne.

## Collecte des bourses, stages et conférences dans le monde entier

### Ce qui tourne tout seul

Quand l'API est lancée, elle relance la collecte **toutes les 24 heures** (`AUTO_COLLECT_HOURS`, `app/scheduler.py`) :

1. **Sources déclarées** dans `backend/app/data/sources.json` dont la fréquence est écoulée, dont les sites d'annonces **Afri-Carrières, Opportunities For Africans, Opportunity Desk, Scholars4Dev et After School Africa** (connecteur `site`) : flux RSS essayé d'abord, sinon les annonces de la page d'accueil ; les offres d'emploi sont écartées ; le lien gardé est celui du **site officiel** cité dans l'annonce (la page de l'agrégateur reste dans `source_page`) ;
2. **Découverte par l'IA** (`app/scrapers/discovery.py`) : Claude cherche sur le web les bourses de 5 zones du monde par passage, en tournant sur **24 zones** : 20 pour les bourses sur tous les continents, 2 pour les stages et 2 pour les conférences (Afrique de l'Ouest, centrale, de l'Est, australe et du Nord ; Europe en 6 zones ; Amérique du Nord, Amérique latine, Caraïbes ; Moyen-Orient et Golfe, Asie de l'Est, du Sud-Est, du Sud et centrale ; Océanie ; programmes internationaux). Le monde entier est parcouru en 4 jours, puis on recommence pour trouver les nouvelles bourses et les nouvelles dates. Chaque lien est testé avant enregistrement (un lien mort n'entre pas en base) et chaque fiche arrive **à vérifier** ;
3. **Dates limites** : une bourse annuelle dont la date vient de passer est signalée « session close » avec la session suivante estimée ; une bourse ponctuelle passe en « expirée » ;
4. **Vérification des liens officiels** (`app/linkcheck.py`) : `ok`, `redirige` (on garde la nouvelle adresse), `casse` (signalé dans l'administration), `non_verifie` ;
5. **Alertes** (nouvelles bourses pour le profil, rappels J-30, J-7, J-1) et rappels d'accompagnement.

La découverte IA a besoin de `ANTHROPIC_API_KEY` dans `backend/.env` ; sans clé, le reste tourne quand même. Pour ne pas laisser l'API faire la collecte, mets `AUTO_COLLECT_HOURS=0` et planifie `python -m app.cli nightly` (cron, ou Planificateur de tâches sous Windows).

### Commandes

```bash
python -m app.cli nightly                       # un passage complet (sources, IA, dates, liens, alertes)
python -m app.cli discover --zones 20           # découverte IA sur tout le monde d'un coup
python -m app.cli check-links --all             # teste tous les liens officiels et liste les liens morts
python -m app.cli collect                       # toutes les sources activées
python -m app.cli extract https://exemple.org/une-bourse   # teste l'extraction d'une page
```

> La vérification des liens n'a pas pu être lancée depuis l'environnement de développement (sites externes bloqués). Lance `python -m app.cli check-links --all` une fois chez toi : il affiche les liens à corriger.

### Connecteurs

| Connecteur | Usage | Paramètres |
|---|---|---|
| `ai_discovery` | Recherche web par l'IA, zone par zone | `zones_per_run`, `frequency_hours` |
| `site` | Site d'annonces à structure inconnue (agrégateur) | `url`, `limit`, `feeds`, `paths`, `link_pattern`, `kind` |
| `json` | Export officiel, partenariat, fichier local | `path` ou `url` |
| `rss` | Flux RSS ou Atom dont chaque entrée pointe vers une bourse | `url`, `limit` |
| `page_list` | Page « liste de bourses » + liens vers les fiches | `url`, `link_selector` (CSS), `link_pattern` (regex), `limit` |

Règles de collecte (`app/scrapers/base.py`) : lecture de `robots.txt`, une requête toutes les 5 secondes par domaine, User-Agent identifiable, cache de 24 h, seuls les faits sont stockés (l'IA reformule, rien n'est recopié), aucune donnée personnelle. Les sources Campus France et EURAXESS sont fournies **désactivées** : lis leurs conditions d'utilisation avant de les activer.

> **Données de départ** : 82 bourses, 10 stages (ONU, Banque mondiale, FMI, Commission et Parlement européens, BAD, Union africaine, UNICEF, OMS, Volontariat de la Francophonie) et 6 conférences (Deep Learning Indaba, Data Science Africa, One Young World, Forum jeunesse de l'ECOSOC, Women Deliver, YouthConnekt Africa). Bourses : 82 vrais programmes sur tous les continents (Eiffel, DAAD, Chevening, MEXT, Swedish Institute, Knight-Hennessy, KAUST, Manaaki, Université panafricaine, AIMS, AMCI…), avec 55 pays d'études. **Montants, dates limites et critères sont indicatifs** (les dates sont marquées « estimées ») et doivent être vérifiés sur chaque page officielle. Une base déjà créée reçoit les nouvelles colonnes au démarrage ; relance `python -m app.cli seed` pour charger les nouvelles bourses.

## API pour le site (nouveautés)

| Route | Rôle |
|---|---|
| `GET /api/scholarships` | Filtre `kind` (`bourse`, `stage`, `conference` ; vide = tout), filtres `level`, `country`, `region` (afrique, europe, amerique, asie, oceanie), `domain`, `nationality`, `full_funding`, `deadline_status`, `include_expired`, tri `sort=priority` (urgentes d'abord) |
| `GET /api/scholarships/{id}` | En plus des champs de base : `eligibility_notes` (conditions détaillées), `documents` (pièces à fournir avec précisions), `application_steps` (comment postuler), `apply_url`, `link_status`, `deadline_status` (`urgente` ≤ 14 j, `bientot` ≤ 45 j, `ouverte`, `inconnue`, `expiree`), `priority`, `days_left`, `deadline_label`, `next_expected_deadline`, `regions`, et pour les stages et conférences `kind_label`, `event_start`, `event_end`, `city`, `remote`, `duration`, `source_page` |
| `GET /api/stats/countries` | Nombre réel de bourses par pays d'études, avec région, latitude et longitude (globe, carrousel) |
| `GET /api/stats` | Total, ouvertes, bientôt closes, expirées, nombre de pays, répartition par région et par type (`by_kind`) ; `/api/stats/countries` accepte aussi `kind` |
| `GET /api/matches?kind=stage` | Matching sur un type (bourses par défaut, `tout` pour tout) ; même paramètre sur `POST /api/questionnaire` |
| `GET /api/questionnaire` / `POST` | Questionnaire de profil en 5 étapes (toi, études, destination, langues, situation et besoin d'aide). Sans compte : nombre de bourses trouvées et 3 aperçus sans score ; avec compte : profil enregistré, toutes les bourses avec score, offre conseillée |
| `GET /api/offres` | Postuler seul (gratuit), Standard (15 000 F CFA), Premium (35 000 F CFA), avec l'offre conseillée selon le profil. Prix réglables (`OFFER_STANDARD_PRICE`, `OFFER_PREMIUM_PRICE`) |
| `POST /api/accompagnement` | Accepte `offer` (`standard` ou `premium`) ; prix figé et statut de paiement |
| `PATCH /api/admin/accompagnement/{id}/paiement` | L'admin marque le paiement reçu |
| `POST /api/admin/liens/verifier`, `GET /api/admin/liens/casses` | Vérifier les liens, lister les liens morts |
| `GET /api/auth/email-disponible` | Prévenir dès la saisie qu'un compte existe déjà. Mot de passe : 8 caractères minimum avec une lettre et un chiffre |

## Design

Identité propre : fond d'encre profonde, menthe pour les actions (boutons, score), ambre pour la mise en avant (mots en italique, dates limites). Titres et accents italiques en Fraunces gras, texte et étiquettes en Syne (comme la vidéo de référence).

- Accueil : globe terrestre animé (`components/WorldGlobe.tsx`, canvas, se fait tourner à la souris ou au doigt) avec un halo par pays proportionnel au nombre de bourses, carrousel des pays avec les vrais chiffres (`/api/stats/countries`), sections qui apparaissent au défilement (`components/Reveal.tsx`). Les points or qui clignotent sont les pays où il y a des bourses, les points gris les terres sans bourse (légende sous le globe). Les animations s'arrêtent si le système demande moins de mouvement.
- Connexion et inscription dans une fenêtre par-dessus la page (`components/AuthModal.tsx`, illustration `StudentsIllustration.tsx`) ; `/connexion` reste une vraie page.
- Dons : section « Soutenir le site » sur l'accueil et page `/soutenir`.
- Comptes : champs compatibles avec le remplissage automatique et les gestionnaires de mots de passe (`autocomplete`), mot de passe suggéré, e-mail déjà utilisé signalé, retour à la page demandée après connexion (`/connexion?next=…`).

- **Sombre par défaut**, avec un bouton soleil / lune dans l'en-tête pour passer en **mode clair**. Le choix est mémorisé dans le navigateur (`localStorage`, clé `bm_theme`) et appliqué avant l'affichage pour éviter un flash.
- Les couleurs sont des variables dans `frontend/app/globals.css` (`@theme` pour le sombre, `html[data-theme="light"]` pour le clair). Les panneaux de score restent sombres dans les deux modes.
- Pages publiques (accueil, connexion, liste des bourses sans compte) : en-tête simple. Appli connectée : barre latérale (`components/Shell.tsx`). Sans compte, les scores sont masqués et invitent à s'inscrire.

## Logo

Le symbole est le logo fourni (deux formes en S, menthe en haut, ambre en bas), redessiné en vectoriel aux couleurs du site. Fichiers dans `frontend/public/brand/` :

- `scholarfit-logo-sombre.svg` et `scholarfit-logo-clair.svg` : symbole + nom en Fraunces, pour fond sombre ou clair (texte vectorisé, aucune police nécessaire) ;
- `scholarfit-symbole.svg` et `scholarfit-symbole-inverse.svg` : symbole seul ;
- `scholarfit-icone.svg` : icône d'appli sur fond carré sombre.

Le favicon (`app/icon.svg`, `app/favicon.ico`) et l'icône Apple (`app/apple-icon.png`) sont pris en compte automatiquement par Next.js. Dans le site, le logo est dessiné par `LogoMark` / `Logo` (`components/Icon.tsx`) et suit le thème.

## Structure

```
backend/                      API FastAPI (Python)
  app/
    main.py                   point d'entrée
    models.py                 tables : bourses, sources, utilisateurs, profils, candidatures, documents, alertes
    matching.py               filtres durs, score, explications, complétude du profil
    alerts.py                 nouvelles bourses et rappels de date limite (branche ici l'e-mail ou WhatsApp)
    coaching.py               accompagnement : choix du conseiller, plan d'étapes daté, rappels
    ai/                       client Claude avec repli hors-ligne, chat, CV et lettres
    scrapers/                 collecte polie, extraction, dédoublonnage, connecteurs
    routers/                  routes de l'API
    data/                     sources.json, bourses d'exemple
    cli.py                    seed, collect, extract, nightly
  tests/                      tests (pytest), sans réseau ni clé API
frontend/                     site Next.js 15 (React, TypeScript, Tailwind)
  app/                        pages : accueil, bourses, profil, mes-bourses, suivi, accompagnement, conseiller, cv, lettre, admin
  components/                 cartes de bourses, chat, sélecteur de pays…
  lib/api.ts                  client de l'API
docker-compose.yml            PostgreSQL + API + site
.github/workflows/ci.yml      tests et build à chaque push
```

## Tests

```bash
cd backend && python -m pytest -q        # 32 tests : API, matching, chat, CV, lettres, admin, accompagnement, monde entier, dates limites, questionnaire, offres, liens, stages et conférences, agrégateurs, IA simulée
cd frontend && npm run typecheck && npm run build
```

## Variables d'environnement

Backend (`backend/.env`, voir `.env.example`) : `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`, `ADMIN_EMAILS`, `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` (par défaut `claude-opus-5-5`), `AI_FREE_GENERATIONS_PER_DAY`, `COACHING_AUTO_ASSIGN` (par défaut `true` ; à `false`, chaque demande d'accompagnement attend qu'un administrateur choisisse le conseiller), `SCRAPER_USER_AGENT`, `SCRAPER_MIN_DELAY_SECONDS`, `OFFER_STANDARD_PRICE`, `OFFER_PREMIUM_PRICE`, `AUTO_COLLECT_HOURS` (24 par défaut, 0 pour désactiver), `AI_DISCOVERY_ENABLED`, `AI_DISCOVERY_MAX_SEARCHES`.

Site (`frontend/.env.local`) : `API_URL_INTERNAL` (adresse de l'API pour le serveur Next.js, `http://127.0.0.1:8000` par défaut) ; `NEXT_PUBLIC_API_URL` seulement si l'API est sur un autre domaine en production (sinon laisser vide) ; `NEXT_PUBLIC_DON_WAVE`, `NEXT_PUBLIC_DON_ORANGE_MONEY`, `NEXT_PUBLIC_DON_LIEN` pour la section « Soutenir le site » (un moyen vide n'est pas affiché).

## Ce qui reste à faire (suite du plan)

- **Paiement en ligne** : brancher un agrégateur Mobile Money (CinetPay, PayDunya, Wave, Orange Money) sur `POST /api/accompagnement`.
- **Envoi réel des alertes** : brancher un service d'e-mail (Brevo, Resend, SMTP) ou WhatsApp dans `app/alerts.py` et planifier `python -m app.cli nightly`.
- **Connecteurs réels** : vérifier robots.txt et conditions de chaque source, ajuster les sélecteurs, demander des partenariats.
- **Recherche sémantique** : remplacer la similarité par mots-clés par des embeddings stockés dans PostgreSQL avec pgvector.
- **Migrations de base** : ajouter Alembic avant la première mise en production (le MVP crée les tables au démarrage).
- **Stockage des fichiers** : les CV sont stockés en texte dans la base ; pour garder les fichiers d'origine, ajouter un stockage S3 privé et chiffré.
- **Accompagnement** : envoyer les messages et rappels par e-mail ou WhatsApp, synchroniser les rendez-vous avec un agenda (fichier .ics, Google Agenda), joindre des fichiers aux messages, formules payantes si le modèle économique le prévoit, et un coach IA qui prépare les relectures pour le conseiller.
- **Base existante** : les nouvelles tables (`advisors`, `coachings`, `coaching_steps`, `coaching_messages`, `coaching_meetings`) sont créées au démarrage ; aucune table existante ne change, donc une base du MVP précédent continue de fonctionner (relance `python -m app.cli seed` pour y ajouter le compte conseiller de démo).
- **V2 / V3** : score de chance appris sur les résultats réels, formats de CV exportés en PDF, simulation d'entretien, témoignages et mentorat, gestion des lettres de recommandation des professeurs, alertes WhatsApp.
