# Team & Project Management Implementation

Ce document décrit l'implémentation de la gestion des équipes et projets dans Flow-Space.

## Fonctionnalités Implémentées

### ✅ Équipes (Teams)
- **Création d'équipes** avec nom et description
- **Liste des équipes** avec nombre de membres et projets
- **Gestion des membres** avec rôles (OWNER, ADMIN, MEMBER)
- **Invitations par email** avec tokens sécurisés
- **Suppression de membres** (pour OWNER/ADMIN uniquement)

### ✅ Projets (Projects) 
- **Création de projets** dans une équipe
- **Liste des projets** par équipe
- **Vue projet** avec tâches filtrées par projet
- **Intégration avec le système de tâches existant**

### ✅ Système d'Invitations
- **Génération de tokens d'invitation**
- **Page d'acceptation d'invitation** `/teams/invite/accept/[token]`
- **Mode développement** avec affichage du token pour tests

## Structure des Fichiers

### Types
- `types/team.ts` - Interfaces TypeScript pour Team, TeamMember, Project, etc.

### Pages
- `app/(protected)/teams/page.tsx` - Liste des équipes
- `app/(protected)/teams/[teamId]/page.tsx` - Dashboard d'équipe avec onglets
- `app/(protected)/teams/invite/accept/[token]/page.tsx` - Acceptation d'invitation
- `app/(protected)/projects/[projectId]/page.tsx` - Vue projet avec tâches

### Actions Serveur
- `app/(protected)/teams/actions.ts` - Actions pour équipes et invitations
- `app/(protected)/projects/actions.ts` - Actions pour projets

### Composants UI
- `components/teams/create-team-dialog.tsx` - Dialogue de création d'équipe
- `components/teams/invite-member-form.tsx` - Formulaire d'invitation
- `components/teams/member-list.tsx` - Liste des membres avec actions
- `components/teams/tabs.tsx` - Onglets du dashboard d'équipe
- `components/projects/create-project-dialog.tsx` - Dialogue de création de projet

### Helpers & Utils
- `lib/auth/index.ts` - Helpers d'authentification avec NextAuth
- `components/ui/section-header.tsx` - Composant d'en-tête réutilisable

## Intégration avec l'API Backend

L'application communique avec ces endpoints:

### Équipes
```
GET  /api/v1/teams/mine
POST /api/v1/teams
POST /api/v1/teams/:teamId/invites  
GET  /api/v1/teams/invite/accept/:token
POST /api/v1/teams/:teamId/remove/:userId
```

### Projets
```
POST /api/v1/projects
GET  /api/v1/projects/by-team/:teamId
```

### Tâches (existant, étendu)
```
GET /api/v1/tasks?projectId=...&status=...&priority=...
```

## Navigation

Ajoutez à votre navigation existante :
```tsx
import { Users } from 'lucide-react';

<Link href="/teams">
  <Users className="h-5 w-5" />
  Teams
</Link>
```

## Sécurité & RBAC

- **Authentification** : NextAuth avec JWT
- **Autorisation côté serveur** : Vérification des sessions dans toutes les actions
- **Contrôle d'accès basé sur les rôles** :
  - `OWNER` : Tous les droits sur l'équipe
  - `ADMIN` : Peut inviter/supprimer des membres, créer des projets
  - `MEMBER` : Lecture seule, peut voir les projets

## Styles & Thème

- **Cohérence** : Utilise le même système de design que Flow-Space
- **Mode sombre** : Support complet avec `dark:` classes
- **Responsive** : Grilles adaptatives et composants mobiles
- **Animations** : Transitions fluides et états de chargement

## Tests

### Flux de Test Complet
1. Connexion et navigation vers `/teams`
2. Création d'une équipe
3. Invitation d'un membre (mode dev affiche le token)
4. Création d'un projet dans l'équipe
5. Navigation vers le projet et vue des tâches filtrées

### Test d'Invitation
```bash
# Test avec curl
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3000/api/v1/teams/invite/accept/TOKEN
```

## Configuration Requise

### Variables d'Environnement
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```

### Backend Requirements
- Endpoints API implémentés
- Authentification JWT
- Base de données avec relations Team/User/Project

## Prochaines Étapes

1. **Intégration complète** avec votre composant de navigation
2. **Tests unitaires** pour les composants et actions
3. **Amélioration UX** : notifications toast, loading states
4. **Permissions avancées** : rôles personnalisés par projet
5. **Analytics** : métriques d'équipe et de projets