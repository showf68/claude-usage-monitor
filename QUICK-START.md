# 🚀 Quick Start - Extension Claude Code Usage

## ✅ Installation (2 minutes)

### Étape 1: Charger l'extension dans Chrome

1. Ouvrir Chrome et aller sur: `chrome://extensions/`
2. Activer **"Mode développeur"** (toggle en haut à droite)
3. Cliquer sur **"Charger l'extension non empaquetée"**
4. Sélectionner le dossier:
   ```
   C:\Users\Yossef Haim\Dropbox\dev\ICALL\.claude\chrome-extension
   ```

### Étape 2: Configuration (première fois seulement)

L'extension s'ouvre automatiquement et demande la configuration.

**Option A - Refresh Token seulement (RECOMMANDÉ)**:
1. Cliquez sur "📁 Cliquez pour ouvrir .credentials.json"
2. Le chemin est copié dans le presse-papiers
3. Collez-le dans l'explorateur Windows
4. Le fichier `.credentials.json` s'ouvre
5. Copiez la valeur de `claudeAiOauth.refreshToken` (commence par `sk-ant-ort01-`)
6. Collez-la dans le champ "Refresh Token"
7. Laissez "Access Token" vide
8. Cliquez "💾 Sauvegarder"

**Option B - Les deux tokens**:
1. Copiez `accessToken` ET `refreshToken` depuis `.credentials.json`
2. Collez les deux dans l'extension
3. Cliquez "💾 Sauvegarder"

### Étape 3: C'est fini!

L'extension affiche maintenant:
- **Cercle vert** (gauche): Quota 5 heures restant
- **Cercle vert** (droite): Quota 7 jours restant
- **Badge orange** dans la barre Chrome: Pourcentage restant

## 🎨 Interface Moderne

### Cercles de progression
- **Vert (>50%)**: Tout va bien
- **Jaune (20-50%)**: Attention
- **Rouge (<20%)**: Quota faible

### Badge dans la barre Chrome
- Affiche le % restant (limite 5h)
- Couleur automatique (vert/orange/rouge)
- Met à jour toutes les minutes

### Boutons
- **⚙️ Settings**: Modifier les tokens
- **🔄 Refresh**: Actualiser maintenant

## 🔔 Alertes automatiques

Des notifications apparaissent automatiquement à:
- ⚠️ 30% restant
- ⚠️ 20% restant
- 🚨 10% restant
- 🆘 5% restant

Les alertes ne se répètent pas jusqu'au prochain reset.

## 🔄 Auto-Refresh

Avec le Refresh Token configuré:
- ✅ L'extension génère automatiquement un nouveau Access Token
- ✅ Quand l'Access Token expire → Auto-renouvellement
- ✅ Plus besoin de revenir dans les settings

## ⚙️ Modifier les tokens après configuration

1. Cliquez sur l'icône de l'extension
2. Cliquez sur **⚙️** (Settings)
3. Une modal moderne apparaît
4. Modifiez les tokens
5. Cliquez "💾 Sauvegarder"

## 🐛 Dépannage

### "?" dans le badge
- Les tokens ne sont pas configurés
- Cliquez sur l'extension et entrez vos tokens

### "ERR" dans le badge
- Erreur de connexion à l'API
- Vérifiez que les tokens sont valides
- Vérifiez votre connexion internet
- Cliquez sur "↻ Réessayer"

### "CFG" dans le badge
- Le Refresh Token est invalide ou expiré
- Allez dans Settings et entrez un nouveau token depuis `.credentials.json`

### L'extension ne se met pas à jour
1. Allez sur `chrome://extensions/`
2. Trouvez "Claude Code Usage"
3. Cliquez sur l'icône de rafraîchissement ⟳
4. Rouvrez l'extension

## 📊 Que signifient les chiffres?

### Limite 5 heures
- Reset toutes les 5 heures
- Exemple: "75%" = Il reste 75% du quota
- Temps avant reset: "2h 30m"

### Limite 7 jours
- Reset tous les 7 jours
- Exemple: "90%" = Il reste 90% du quota
- Temps avant reset: "5j 12h"

## 🎯 Version actuelle

**Version**: 2.1 Modern
**Dernière mise à jour**: Janvier 2026
**Compatibilité**: Chrome Manifest V3

## 📝 Notes importantes

1. **Le plan (Pro/Max) est côté serveur**
   - Modifier `.credentials.json` ne change PAS votre quota réel
   - C'est juste un cache local
   - Pour changer de plan: aller sur claude.ai

2. **Sécurité des tokens**
   - Les tokens sont stockés localement dans Chrome
   - Jamais envoyés ailleurs qu'à l'API Anthropic officielle
   - Format OAuth2 standard

3. **Mise à jour automatique**
   - L'extension se rafraîchit toutes les minutes
   - Pas besoin de recharger manuellement
   - Les données sont en temps réel

## 🆘 Besoin d'aide?

Si problème persistant:
1. Allez sur `chrome://extensions/`
2. Trouvez "Claude Code Usage"
3. Cliquez sur "Détails"
4. Cliquez sur "Afficher les erreurs" pour voir les logs
5. Les logs indiquent la source du problème

---

**Profitez de votre nouvelle extension!** 🎉
