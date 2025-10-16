# 🔗 Team Invitation Fix - URLs & Expiration

## Problèmes identifiés et résolus

### 1. **URL 404 Error**
Les liens d'invitation dans les emails générent des URLs avec `/dashboard/` mais les routes frontend sont à la racine.
**Erreur 404 rapportée:**
```
GET /dashboard/teams/invite/accept/bb3d5e4313939fe2fd7dc7c8f7d6695cf106e8f943297027f1b38efe8ccf6fb5 404
```

### 2. **Expiration constante**
Les invitations expirent systématiquement avec le message "Invalid or expired invite token".

## ❌ Ancien système (cassé)
```
Email template URL: /dashboard/teams/invite/accept/ABC123
Frontend route:     /teams/invite/accept/[token]
❌ Extra "/dashboard" prefix cause 404!
```

## ✅ Corrections apportées

### 1. **Fix URLs** (`team.service.ts`)
```typescript
// ❌ Ancien (avec /dashboard par défaut)
const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000/dashboard');

// ✅ Nouveau (sans /dashboard)
const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
const acceptUrl = `${frontendUrl}/teams/invite/accept/${token}`;
```

### 2. **Fix Expiration** (`team.service.ts`)
```typescript
// ❌ Ancien (7 jours + pas de nettoyage)
expiresAt.setDate(expiresAt.getDate() + 7);

// ✅ Nouveau (30 jours + nettoyage automatique)
expiresAt.setDate(expiresAt.getDate() + 30);

// Nettoyage automatique des invitations expirées
await this.prismaService.teamInvite.deleteMany({
  where: { teamId, email, acceptedAt: null, expiresAt: { lt: now } }
});
```

### 3. **Messages d'erreur améliorés**
```typescript
// ❌ Ancien (message générique)
throw new BadRequestException('Invitation has expired');

// ✅ Nouveau (détails précis)
throw new BadRequestException(`Invitation expired ${expiredHoursAgo} hours ago (expired: ${invite.expiresAt.toISOString()}, now: ${now.toISOString()})`);
```

### 2. **Backend controller** (`team.controller.ts`)
```typescript
// ✅ Endpoint GET avec redirection automatique
@Get('invite/accept/:token')
async acceptInviteViaLink(@Param('token') token: string, @Res() res: Response) {
  try {
    const result = await this.teamService.acceptInvite(req.user.sub, { token });
    return res.redirect(`${frontendUrl}/teams/${result.team.id}`);
  } catch (error) {
    return res.redirect(`${frontendUrl}/teams/invite/accept/${token}?error=${error.message}`);
  }
}
```

### 3. **Frontend page** (`/teams/invite/accept/[token]/page.tsx`)
```typescript
// ✅ Gestion des paramètres d'erreur depuis backend
interface AcceptInvitePageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;  // ← Nouveau!
}
```

## 🔄 Flux d'invitation complet

1. **Création invitation** → Backend génère token + URL correcte
2. **Envoi email** → Template utilise `{{acceptUrl}}` avec bonne route
3. **Clic utilisateur** → URL : `/teams/invite/accept/ABC123`
4. **Traitement frontend** → Page accepte invitation ou affiche erreur
5. **Redirection succès** → `/teams/[TEAM_ID]`

## 🧪 Test

### ⚠️ **IMPORTANT: Redémarrer le backend avant de tester!**

1. **Redémarrer backend** → `npm run start:dev` dans Flow-Space-backend
2. **Créer une équipe** → Via interface frontend
3. **Inviter un membre** → Vérifier l'URL générée dans l'email  
4. **Vérifier URL** → Ne doit PAS contenir `/dashboard/`
5. **Test lien** → Cliquer "Join Team" button
6. **Success** → Redirection vers `/teams/[team-id]`

### 🔍 **Debug Page disponible:**
- Visiter: `http://localhost:3000/debug-invitation`
- Tester les URLs correctes vs incorrectes

## 📝 URLs attendues

- **Email link**: `http://localhost:3000/teams/invite/accept/[TOKEN]`
- **Success redirect**: `http://localhost:3000/teams/[TEAM_ID]`
- **Error case**: `http://localhost:3000/teams/invite/accept/[TOKEN]?error=Invalid+token`

## ✨ Avantages

- ✅ Liens email fonctionnels
- ✅ Gestion d'erreur automatique
- ✅ Redirection backend optionnelle
- ✅ UX améliorée
- ✅ Compatible mobile/desktop