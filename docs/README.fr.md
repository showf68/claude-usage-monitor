# Claude Usage Monitor

<div align="center">

**🌐 Language / Langue / Idioma / 语言 / שפה**

[![English](https://img.shields.io/badge/English-blue?style=flat-square)](../README.md)
[![Français](https://img.shields.io/badge/Français-orange?style=flat-square)](README.fr.md)
[![Español](https://img.shields.io/badge/Español-blue?style=flat-square)](README.es.md)
[![中文](https://img.shields.io/badge/中文-blue?style=flat-square)](README.zh.md)
[![עברית](https://img.shields.io/badge/עברית-blue?style=flat-square)](README.he.md)

---

![Version](https://img.shields.io/badge/version-4.0-orange)
![Chrome](https://img.shields.io/badge/Chrome-Extension-brightgreen)
![Manifest](https://img.shields.io/badge/Manifest-V3-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

**Surveillez votre utilisation de Claude Code avec de beaux indicateurs circulaires**

[Demarrage Rapide](#demarrage-rapide) | [Installation](#installation) | [Fonctionnalites](#fonctionnalites) | [Depannage](#depannage)

</div>

---

## Apercu

Claude Usage Monitor est une extension Chrome qui affiche votre utilisation de l'API Claude en temps reel. Suivez vos limites de 5 heures et 7 jours en un coup d'oeil, recevez des alertes avant d'atteindre votre quota.

**Parfait pour les utilisateurs de Claude Code et Claude Max.**

## Demarrage Rapide

1. **Telecharger** le [dernier ZIP](https://github.com/showf68/claude-usage-monitor/releases/latest)
2. **Extraire** le fichier ZIP
3. **Ouvrir** `chrome://extensions/` et activer le Mode Developpeur
4. **Cliquer** sur "Charger l'extension non empaquetee" et selectionner le dossier
5. **Choisir votre methode d'authentification :**
   - **Auto (Cookie)** : Soyez simplement connecte a claude.ai - l'extension detecte votre session automatiquement !
   - **Manuel (Token)** : Collez le contenu de votre `.credentials.json`

C'est tout ! L'extension commencera a surveiller votre utilisation.

## Fonctionnalites

| Fonctionnalite | Description |
|----------------|-------------|
| **Suivi en temps reel** | Surveillez les quotas de 5 heures et 7 jours |
| **Progression visuelle** | Beaux indicateurs de progression circulaires |
| **Code couleur** | Vert (< 50%), Orange (50-80%), Rouge (> 80%) |
| **Alertes intelligentes** | Notifications a 70%, 80%, 90%, 95% d'utilisation |
| **Actualisation auto** | Mise a jour automatique chaque minute |
| **Auth Cookie** | Detection auto de la session claude.ai - aucune config requise ! |
| **Auth Token** | Configuration manuelle avec credentials.json |
| **Multi-langue** | Anglais, Francais, Espagnol, Chinois, Hebreu |
| **Detection auto** | Detecte automatiquement la langue du navigateur |
| **Theme sombre** | Interface moderne concue pour les developpeurs |
| **Confidentialite** | Toutes les donnees restent locales |

## Installation

### Option 1 : Telecharger depuis les Releases (Recommande)

1. Aller sur [Releases](https://github.com/showf68/claude-usage-monitor/releases/latest)
2. Telecharger `claude-usage-monitor-v4.0.zip`
3. Extraire le ZIP dans un dossier
4. Ouvrir Chrome et aller a `chrome://extensions/`
5. Activer le **Mode Developpeur** (bouton en haut a droite)
6. Cliquer sur **"Charger l'extension non empaquetee"**
7. Selectionner le dossier extrait

### Option 2 : Cloner le Repository

```bash
git clone https://github.com/showf68/claude-usage-monitor.git
cd claude-usage-monitor
```

Puis charger le dossier dans Chrome comme decrit ci-dessus.

## Configuration

L'extension supporte **deux methodes d'authentification** :

### Option A : Mode Auto (Cookie) - Recommande

La methode la plus simple ! Soyez simplement connecte a [claude.ai](https://claude.ai) dans Chrome.

1. Cliquez sur l'icone de l'extension
2. Allez dans **Parametres** (icone engrenage)
3. Selectionnez l'onglet **"Auto (Cookie)"**
4. Si vous voyez "Session trouvee", cliquez sur **"Connecter avec la session Claude.ai"**

C'est tout ! Aucun token ou fichier necessaire.

### Option B : Mode Manuel (Token)

Utilisez cette methode si le mode cookie ne fonctionne pas ou si vous preferez un controle explicite.

#### Etape 1 : Trouver vos identifiants

| Plateforme | Chemin |
|------------|--------|
| **Windows** | `%USERPROFILE%\.claude\.credentials.json` |
| **macOS** | `~/.claude/.credentials.json` |
| **Linux** | `~/.claude/.credentials.json` |

#### Etape 2 : Copier & Coller

1. Ouvrir le fichier d'identifiants dans un editeur de texte
2. **Tout selectionner** (Ctrl+A / Cmd+A)
3. **Copier** (Ctrl+C / Cmd+C)
4. Cliquer sur l'icone de l'extension → Parametres → onglet **"Manuel (Token)"**
5. **Coller** le contenu JSON complet
6. Cliquer sur **"Enregistrer et connecter"**

## Utilisation

### Badge de la barre d'outils

Le badge affiche votre pourcentage d'utilisation sur 5 heures :

| Badge | Couleur | Statut |
|-------|---------|--------|
| `25` | Vert | Faible utilisation |
| `65` | Orange | Utilisation moderee |
| `90` | Rouge | Utilisation elevee - ralentissez ! |
| `CFG` | Jaune | Configuration requise |
| `ERR` | Rouge | Erreur de connexion |

### Interface popup

Cliquez sur l'icone de l'extension pour voir :
- **Utilisation 5 heures** - Fenetre actuelle avec progression circulaire
- **Utilisation 7 jours** - Suivi du quota hebdomadaire
- **Minuteur de reinitialisation** - Temps avant le renouvellement des limites
- **Derniere mise a jour** - Quand les donnees ont ete actualisees

## Depannage

<details>
<summary><b>Badge ERR ou "Erreur de connexion"</b></summary>

1. Verifiez votre connexion internet
2. Verifiez que votre token n'a pas expire
3. Essayez de reconfigurer avec de nouveaux identifiants
4. Rechargez l'extension depuis `chrome://extensions/`
</details>

<details>
<summary><b>Badge CFG</b></summary>

L'extension a besoin d'etre configuree :
1. Cliquez sur l'icone de l'extension
2. Collez le contenu de votre `.credentials.json`
3. Cliquez sur "Enregistrer et connecter"
</details>

<details>
<summary><b>Token expire</b></summary>

Votre token d'acces a peut-etre expire. Obtenez de nouveaux identifiants :
1. Utilisez Claude Code pour rafraichir votre token (n'importe quelle commande Claude Code le fera)
2. Copiez le contenu mis a jour de `.credentials.json`
3. Reconfigurez l'extension
</details>

## Changelog

### v4.0 (Derniere)
- **Nouveau :** Mode d'authentification par cookie - detection auto de la session claude.ai
- **Nouveau :** Deux modes d'auth : Auto (Cookie) et Manuel (Token)
- **Nouveau :** Onglets dans les parametres pour changer de mode
- **Nouveau :** Indicateur de statut de session pour le mode cookie
- **Nouveau :** Lien GitHub dans le footer de l'extension
- Configuration simplifiee - soyez simplement connecte a claude.ai !

### v3.4
- **Fix :** Le package ZIP fonctionne maintenant correctement sur tous les systemes

### v3.3
- **Nouveau :** Support multi-langue (EN, FR, ES, ZH, HE)
- **Nouveau :** Detection automatique de la langue du navigateur

## Confidentialite et Securite

| Aspect | Details |
|--------|---------|
| **Collecte de donnees** | Aucune - toutes les donnees restent locales |
| **Stockage des tokens** | API de stockage securise de Chrome |
| **Appels reseau** | Uniquement vers les APIs officielles d'Anthropic |
| **Open Source** | Code complet disponible pour audit |

## Contribuer

**Ce projet est ouvert a tous !** Nous accueillons chaleureusement les contributions de la communaute.

Les contributions sont les bienvenues ! Voici comment participer :

1. Fork le repository
2. Creez une branche (`git checkout -b feature/amelioration`)
3. Committez vos changements
4. Poussez vers la branche
5. Ouvrez une Pull Request

**Idees de contributions :**
- Nouvelles fonctionnalites
- Corrections de bugs
- Ameliorations de l'interface
- Nouvelles traductions
- Documentation

## Licence

Licence MIT - voir [LICENSE](../LICENSE) pour plus de details.

---

<div align="center">

**Concu pour la communaute des developpeurs Claude**

**Rejoignez le projet et contribuez !**

Si cette extension vous aide, pensez a lui donner une etoile

[Signaler un bug](https://github.com/showf68/claude-usage-monitor/issues) | [Demander une fonctionnalite](https://github.com/showf68/claude-usage-monitor/issues) | [Contribuer](https://github.com/showf68/claude-usage-monitor)

</div>
