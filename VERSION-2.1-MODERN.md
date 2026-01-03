# 🎨 VERSION 2.1 - Interface Ultra-Moderne!

## ✨ Quoi de neuf?

### Design Professionnel
- **Cercles de progression animés** au lieu des barres boring
  - 100% restant = Cercle VERT plein
  - 50% restant = Cercle JAUNE à moitié
  - 10% restant = Cercle ROUGE presque vide

- **Bouton Settings (⚙️)** en forme de roue dentée
  - Ouvre une modal moderne
  - Animation au survol (rotation 30°)

- **Palette de couleurs pro**
  - Fond ultra-dark (#0f1419)
  - Cartes avec borders subtiles
  - Dégradé orange signature
  - Hover effects partout

### Fonctionnalités

#### 1. UN SEUL TOKEN SUFFIT! 🎯
**Avant (v2.0)**:
- ❌ Access Token REQUIS
- ❌ Refresh Token OPTIONNEL
- ❌ Il fallait les DEUX

**Maintenant (v2.1)**:
- ✅ Access Token OPTIONNEL
- ✅ Refresh Token RECOMMANDÉ
- ✅ **Un seul token suffit!**

**Comment ça marche?**
1. Entre UNIQUEMENT ton Refresh Token
2. L'extension génère automatiquement l'Access Token
3. Quand l'Access Token expire → Auto-refresh
4. ✅ Plus JAMAIS besoin de revenir!

#### 2. Bouton "Ouvrir .credentials.json"
- Clique → Copie le chemin dans le presse-papiers
- Colle dans l'explorateur Windows
- Le fichier s'ouvre automatiquement

#### 3. Affichage du coût (bientôt)
- Coût de la session actuelle
- Input/Output tokens
- Total en dollars

#### 4. Settings Modal
- ⚙️ Bouton settings dans le header
- Modal avec backdrop blur
- Animation slide-in
- Close au clic extérieur

## 🚀 Migration depuis v2.0

### Option 1: Refresh Token uniquement (RECOMMANDÉ)
```
1. Ouvre .credentials.json
2. Copie UNIQUEMENT refreshToken (sk-ant-ort01-...)
3. Clique sur ⚙️ dans l'extension
4. Colle le refresh token
5. Laisse l'access token VIDE
6. Sauvegarde
7. ✅ TERMINÉ!
```

### Option 2: Les deux tokens
```
1. Entre Access Token ET Refresh Token
2. Fonctionne aussi!
```

## 📁 Fichiers

| Fichier | Description |
|---------|-------------|
| `popup-modern.html` | Nouvelle interface avec cercles |
| `popup-modern.js` | Logique moderne |
| `popup.html` | Ancienne version (backup) |
| `popup.js` | Ancienne version (backup) |

## 🎨 Captures d'écran

### Cercles de progression
- **100% restant**: Cercle vert complet
- **50% restant**: Cercle jaune à moitié
- **10% restant**: Cercle rouge presque vide

### Settings Modal
- Backdrop blur
- Animation slide-in
- Refresh Token en premier (recommandé)
- Access Token en second (optionnel)

## ⚙️ Configuration

### Tokens depuis .credentials.json

Ton Refresh Token actuel:
```
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
```

**C'est le SEUL dont tu as besoin!**

## 🔄 Mise à jour

1. Va sur `chrome://extensions/`
2. Trouve "Claude Code Usage"
3. Clique sur ⟳
4. Version affichée: **2.1**
5. Ouvre l'extension
6. Le nouveau design s'affiche!

## 💡 Pourquoi 2 tokens?

### Access Token
- ⏱️ Expire après quelques heures
- 🔐 Sécurité: si volé, limité dans le temps
- 📝 Utilisé pour les appels API

### Refresh Token
- 🕐 Dure plusieurs semaines/mois
- ♻️ Permet de générer un nouvel Access Token
- 🔄 Auto-renouvellement sans intervention

**Analogie:**
- **Access Token** = Ticket de métro (expire vite)
- **Refresh Token** = Carte Navigo (recharge automatique)

**En pratique:**
- Entre UNIQUEMENT le Refresh Token
- L'extension fait le reste!

## 🎯 Résumé

**AVANT**: Copier-coller des tokens toutes les heures
**MAINTENANT**: Configure une fois → Oublie pour toujours!

Interface moderne + Auto-refresh = 🚀 Expérience parfaite!
