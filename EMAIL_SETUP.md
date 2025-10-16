# Configuration Email pour les Invitations d'Équipe

## 🚀 Fonctionnalités Implémentées

### Frontend ✅
- ✅ Formulaire d'ajout de membres lors de la création d'équipe
- ✅ Interface d'invitation de membres après création d'équipe  
- ✅ Gestion des tokens d'invitation en mode développement
- ✅ Affichage des liens d'invitation copiables
- ✅ Messages de confirmation et d'erreur

### Backend 🔧
- ✅ API d'invitation de membres
- ✅ Génération de tokens sécurisés
- ✅ Gestion des rôles (ADMIN/MEMBER)
- ⚠️ **Configuration email requise pour l'envoi automatique**

## 📧 Configuration Email Backend

Pour activer l'envoi automatique d'emails d'invitation, ajoutez ces variables d'environnement dans votre fichier `.env` du backend:

```env
# Configuration SMTP
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=your-email@gmail.com

# URL Frontend pour les liens d'invitation
FRONTEND_URL=http://localhost:3000
```

## 🛠️ Configuration NestJS

Dans votre module mailer (`src/config/mailer.config.ts`):

```typescript
import { MailerOptions } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

export const mailerConfig: MailerOptions = {
  transport: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  },
  defaults: {
    from: process.env.MAIL_FROM,
  },
  template: {
    dir: process.cwd() + '/src/templates/',
    adapter: new HandlebarsAdapter(),
    options: {
      strict: true,
    },
  },
};
```

## 📋 Mode de Fonctionnement Actuel

### En Mode Développement 🔧
- Les invitations génèrent des tokens
- Les liens sont copiables manuellement
- Aucun email automatique envoyé
- Tokens visibles dans l'interface pour tests

### En Mode Production 📧 (après configuration email)
- Les invitations envoient des emails automatiquement
- Liens inclus dans les emails
- Notifications par email
- Gestion des erreurs d'envoi

## 🎯 Utilisation Actuelle

### 1. Créer une Équipe avec Membres
1. Cliquez sur "Create Team"
2. Remplissez nom et description
3. Ajoutez des membres dans la section "Invite Initial Members"
4. Les invitations seront créées lors de la création de l'équipe

### 2. Ajouter des Membres à une Équipe Existante  
1. Allez dans l'équipe → Onglet "Members"
2. Utilisez le formulaire "Invite Member"
3. En mode dev: copiez le lien généré
4. Partagez le lien manuellement

### 3. Accepter une Invitation
- Visitez le lien: `/teams/invite/accept/[token]`
- L'utilisateur sera automatiquement ajouté à l'équipe
- Redirection vers la page de l'équipe

## 🚧 Prochaines Améliorations

- [ ] Configuration automatique des templates email
- [ ] Système de rappel pour invitations non acceptées
- [ ] Expiration et renouvellement des invitations
- [ ] Historique des invitations envoyées
- [ ] Notifications en temps réel

## 📝 Notes Techniques

- Les tokens d'invitation expirent après 7 jours par défaut
- Un utilisateur ne peut avoir qu'une invitation active par équipe
- Les tokens sont sécurisés avec UUID v4
- Support des rôles ADMIN et MEMBER dès l'invitation