# Comment mettre à jour l'extension Chrome

Quand tu modifies les fichiers de l'extension, voici comment appliquer les changements:

## Méthode 1: Depuis Chrome (Recommandé)

1. Ouvre Chrome et va sur: `chrome://extensions/`
2. Trouve l'extension **"Claude Code Usage"**
3. Clique sur l'icône de **rafraîchissement** ⟳ (en haut à droite de la carte de l'extension)
4. ✅ C'est tout! Les changements sont appliqués instantanément

## Méthode 2: Raccourci clavier

Sur la page `chrome://extensions/`, avec l'extension sélectionnée:
- Appuie sur **Ctrl+R** (Windows/Linux)
- Ou **Cmd+R** (Mac)

## Méthode 3: Fermer/Ouvrir le popup

Pour tester uniquement les changements du popup (HTML/CSS/JS):
- Ferme le popup de l'extension
- Ré-ouvre-le en cliquant sur l'icône

**Note**: Cette méthode ne recharge PAS le background worker. Utilise Méthode 1 pour recharger complètement.

## Vérifier que la mise à jour a fonctionné

1. Vérifie la **version** affichée sous le nom de l'extension
   - Version actuelle: **1.1**
2. Regarde la **description**: "Affiche l'usage Claude Code toutes les minutes avec badge optimisé"

## En cas de problème

Si les changements ne s'appliquent pas:
1. Désactive l'extension
2. Réactive-la
3. Si ça ne marche toujours pas: retire l'extension et recharge-la depuis le dossier

## Réinitialiser les alertes (si elles se répètent)

Si tu as déjà vu une alerte et veux la réinitialiser:

1. Va sur `chrome://extensions/`
2. Trouve "Claude Code Usage"
3. Clique sur **"Service Worker"** (lien bleu sous l'extension)
4. Dans la console qui s'ouvre, colle ce code:
   ```javascript
   chrome.storage.local.set({alertedThresholds: [], lastAlertTime: 0}, () => console.log('✅ Réinitialisé!'));
   ```

## Changelog

### Version 2.0 (actuelle) - AUTO-REFRESH AUTOMATIQUE! 🎉

**NOUVELLE FONCTIONNALITÉ MAJEURE**: L'extension fonctionne maintenant comme une vraie session Claude Code!

- ✅ **Auto-refresh du token**: Plus besoin de mettre à jour manuellement!
- ✅ **Configuration une seule fois**: Entrez Access Token + Refresh Token → Terminé!
- ✅ **Gestion automatique**: Quand l'access token expire (403), l'extension le rafraîchit automatiquement
- ✅ **Bouton "Mettre à jour token"**: Accessible directement dans le popup
- ✅ **Badge "CFG"**: S'affiche en orange si la configuration est incomplète

**Migration depuis v1.x**:
1. Ouvre l'extension
2. Clique sur "🔄 Mettre à jour token"
3. Entre les deux tokens depuis `~/.claude/.credentials.json`:
   - Access Token (sk-ant-oat01-...)
   - Refresh Token (sk-ant-ort01-...)
4. ✅ C'est tout! Plus jamais besoin de revenir.

### Version 1.2 - Fix alertes répétées
- 🐛 **FIX CRITIQUE**: Les alertes ne se répètent plus en boucle
- ✅ Cooldown de 5 minutes entre chaque alerte
- ✅ Protection anti-doublons avec variable globale
- ✅ Une seule alerte par vérification

### Version 1.1
- ✅ Rafraîchissement **toutes les minutes** (au lieu de 5)
- ✅ Badge avec texte blanc forcé pour meilleur contraste
- ✅ Couleurs plus vives (rouge/orange/vert)
- ✅ Décimale affichée quand < 10%
- ✅ Alertes popup aux paliers: 30%, 20%, 10%, 5%
- ✅ Icône "CC" au lieu de "C"

### Version 1.0 (initiale)
- Première version avec badge basique
- Rafraîchissement toutes les 5 minutes
