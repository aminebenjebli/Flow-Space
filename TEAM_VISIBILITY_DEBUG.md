# 👥 Team Visibility Issue - nadabha8@gmail.com

## 🚨 Problème identifié

L'utilisateur `nadabha8@gmail.com` :
- ✅ **Apparaît dans la liste des membres** de l'équipe "wxcvbn,,,,,,"
- ❌ **NE VOIT PAS l'équipe** dans sa page `/teams`
- ✅ **A bien rejoint l'équipe** (visible dans l'interface team)

## 🔍 Diagnostic

### Symptômes observés :
1. Team page shows 2 members (nada bha + nadabha8@gmail.com)  
2. User nadabha8@gmail.com sees empty teams page
3. Team owner can see the team normally

### Causes possibles :
1. **Cache non actualisé** après acceptation invitation
2. **Problème base de données** - TeamMember record manquant
3. **Problème API** - Query ne retourne pas les bonnes données
4. **Problème session** - User ID incorrect dans le token

## 🛠️ Outils de diagnostic créés

### 1. **Page de diagnostic utilisateur**
```
URL: http://localhost:3000/debug-user-teams
```
**Fonction :** Affiche les données de session et la réponse API `/teams/mine`

### 2. **Bouton diagnostic dans /teams**
**Fonction :** Force refresh et montre données en temps réel

### 3. **Action serveur `forceRefreshUserTeams`**
**Fonction :** Force revalidation cache + fetch fresh data

### 4. **SQL Debug queries**  
**Fichier :** `debug-team-membership.sql`
**Fonction :** Vérifier directement la base de données

## 🧪 Étapes de diagnostic

### Étape 1: Vérifier session utilisateur
1. Aller sur `/debug-user-teams`
2. Vérifier User ID et email
3. Vérifier présence access token

### Étape 2: Tester API response
1. Cliquer "Run Diagnostic" sur page `/teams`
2. Vérifier nombre d'équipes retournées
3. Noter le User ID utilisé

### Étape 3: Vérifier base de données
1. Utiliser queries dans `debug-team-membership.sql`
2. Remplacer USER_ID et TEAM_ID par vraies valeurs
3. Vérifier existence records TeamMember

### Étape 4: Forcer refresh cache
1. Utiliser bouton diagnostic
2. Hard refresh browser (Ctrl+Shift+R)
3. Tester en navigation privée

## 🔧 Solutions possibles

### Si le problème est le cache :
```typescript
// Force revalidation
revalidatePath('/teams');
revalidateTag('user-teams');
```

### Si TeamMember record manque :
```sql
-- Recréer le membership manuellement
INSERT INTO TeamMember (userId, teamId, role, joinedAt)
VALUES ('USER_ID', 'TEAM_ID', 'MEMBER', NOW());
```

### Si problème avec acceptInvite :
1. Vérifier que `acceptInvite` crée bien le TeamMember record
2. Vérifier que `revalidatePath('/teams')` est appelé
3. Vérifier redirection après acceptation

## 📋 Checklist de vérification

- [ ] User nadabha8@gmail.com existe dans base User
- [ ] TeamMember record existe pour cette user + team
- [ ] API `/teams/mine` retourne l'équipe pour cet utilisateur  
- [ ] Cache est actualisé après diagnostic
- [ ] Session contient bon User ID
- [ ] AcceptInvite function marche correctement

## 🎯 Actions immédiates

1. **Test diagnostic** → Utiliser outils créés
2. **Vérifier DB** → Queries SQL direct
3. **Test manuel** → Recréer invitation si nécessaire
4. **Fix cache** → Force refresh si besoin

## 📞 Points de contact pour debug

- **Frontend debug :** `/debug-user-teams`
- **Teams page :** Bouton diagnostic intégré  
- **Backend API :** `GET /api/v1/teams/mine`
- **Database :** Queries SQL provided

---

*Créé le 14/10/2025 pour résoudre team visibility issue*