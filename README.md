<div align="center">

# FlowSpace – Smart Collaborative Task Manager 🚀

Intelligent, real‑time, theme-aware task management built with Next.js, designed for teams that value productivity, clarity, and performance.

<p>
<strong>Status:</strong> Early Development · <strong>License:</strong> MIT
</p>

</div>

---

## Table of Contents

1. Overview
2. Feature Highlights
3. Tech Stack
4. Architecture & Concepts
5. Project Structure
6. Theming System
7. Authentication Flow
8. State Management
9. API & Data Layer
10. Getting Started (Quick Start)
11. Environment Variables
12. Development Scripts
13. Roadmap
14. Contributing
15. License

---

## 1. Overview

FlowSpace is a modern, extensible task management platform with an emphasis on:  
• Real-time collaboration  
• Offline resilience (planned)  
• Theme-aware UI (persisted light/dark mode)  
• Secure credential-based authentication  
• Scalable architecture ready for analytics, automation, and AI add‑ons

It’s an ideal codebase for learning or extending: authentication patterns, state management, API integration, and UI consistency.

## 2. Feature Highlights

Current / Implemented:

- ✅ Light & dark theme with persistence (NextThemes + CSS variables)
- ✅ Modern UI foundation (Tailwind + shadcn/ui pattern)
- ✅ Credentials-based auth workflow scaffold (NextAuth integration with NestJS backend)
- ✅ Typed React + App Router structure

Planned / In Progress:

- 🔄 Real-time task updates (WebSockets / SSE)
- 🎯 Drag-and-drop task boards (Kanban style)
- 📱 Offline task creation + sync
- 🔔 Push notifications
- 🔐 Role & team management
- 📊 Analytics & insights
- 🤖 AI-assisted prioritization (future)

## 3. Tech Stack

| Layer          | Tools                                               |
| -------------- | --------------------------------------------------- |
| Framework      | Next.js (App Router, React 19)                      |
| Language       | TypeScript                                          |
| Styling        | Tailwind CSS, custom utility classes, CSS variables |
| Components     | shadcn/ui (pattern), Lucide icons                   |
| Theming        | next-themes (class-based, persistent)               |
| Auth           | NextAuth.js (Credentials) + NestJS backend          |
| Data Layer     | React Query (server state), Axios (interceptors)    |
| State (client) | Zustand (planned stores)                            |
| Validation     | Zod + React Hook Form                               |
| Real-time      | Socket.io client (planned enablement)               |
| Testing        | Jest + React Testing Library (scaffold)             |
| UX Extras      | React Query Devtools, Toast notifications           |

## 4. Architecture & Concepts

Core concepts guiding the design:

- Separation of concerns between UI (components), domain logic (stores & hooks), and integration (lib/api & auth).
- Progressive enhancement: baseline works without real-time; sockets layer augments.
- Theme consistency via design tokens (CSS custom properties) mapped to utility classes.
- API abstraction through a typed Axios layer for resilience and auth token handling.

## 5. Project Structure

```
src/
├─ app/                     # App Router entrypoints & layouts
│  ├─ (auth)/               # Auth routes (login, signup, etc.)
│  ├─ dashboard/            # Authenticated dashboard (future expansions)
│  ├─ tasks/                # Task views (planned)
│  ├─ analytics/            # Reporting & metrics (planned)
│  ├─ settings/             # User/team preferences (planned)
│  ├─ api/auth/             # NextAuth route handlers
│  ├─ layout.tsx            # Root layout (providers + shell)
│  ├─ page.tsx              # Marketing / landing page
│  └─ providers.tsx         # Cross-app providers (theme, query, auth)
├─ components/              # Reusable presentational & interactive components
├─ lib/                     # Auth config, API client, util helpers
├─ store/                   # Zustand stores (scaffold / planned)
├─ types/                   # Global TypeScript types & DTOs
├─ hooks/                   # Custom React hooks
└─ public/                  # Static assets
```

## 6. Theming System

The app uses `next-themes` with `attribute="class"` so `html` receives either `light` (default) or `dark` class.  
Color tokens live in `globals.css` as CSS variables and are referenced through semantic Tailwind utilities (e.g., `text-foreground`, `bg-background`, `flow-card`).

Persistence: The chosen theme is stored under `localStorage` key `flowspace-theme`.

Custom utilities:

- `flow-card` / `flow-card-hover`
- Gradient helpers: `flow-gradient-primary`, `flow-gradient-secondary`

## 7. Authentication Flow

Authentication leverages NextAuth Credentials provider:

- User submits credentials → forwarded to NestJS `/auth/login` endpoint.
- Backend returns access + refresh tokens.
- Access token used for API calls; refresh logic handles expiry (scaffold).  
  Planned enhancements: refresh rotation, token invalidation, email verification, password reset flows.

Example (React):

```tsx
import { useSession } from "next-auth/react";
const { data: session, status } = useSession();
```

## 8. State Management

- React Query handles asynchronous server state (caching, retries, background refresh).
- Zustand (planned) for UI & domain state: auth metadata, board filters, layout preferences.
- Avoids prop drilling while keeping global mutable state minimal.

## 9. API & Data Layer

Axios client (planned structure):

- Base URL from environment variables.
- Request interceptor attaches bearer token.
- Response interceptor triggers token refresh on 401 (once).
- Domain modules (e.g., `api.tasks`, `api.projects`) return typed payloads.

Future: batching, optimistic updates, structured error surface.

## 10. Getting Started (Quick Start)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Run development server
npm run dev

# 4. Visit the app
open http://localhost:3000
```

If integrating with backend, ensure NestJS API is running (e.g. `http://127.0.0.1:8050/api/v1`).

## 11. Environment Variables

Create `.env.local` with (examples):

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8050/api/v1
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8050
NEXTAUTH_SECRET=development-secret
NEXTAUTH_URL=http://localhost:3000
```

Production variants should use secure secrets and HTTPS endpoints.

## 12. Development Scripts

| Script               | Purpose                                |
| -------------------- | -------------------------------------- |
| `npm run dev`        | Start dev server (Turbopack / Next.js) |
| `npm run build`      | Production build                       |
| `npm run start`      | Start production server                |
| `npm run lint`       | Lint codebase                          |
| `npm run lint:fix`   | Auto-fix lint issues                   |
| `npm run type-check` | Run TypeScript compiler in check mode  |
| `npm test`           | Run test suite (when added)            |

## 13. Roadmap

Near-Term:

- [ ] Complete credential + refresh token lifecycle
- [ ] Task CRUD endpoints & UI
- [ ] Real-time presence & task updates
- [ ] Drag-and-drop board implementation
- [ ] Accessible keyboard interactions

Mid-Term:

- [ ] Offline cache layer (IndexedDB + service worker)
- [ ] Push notification subscription & delivery
- [ ] Team / role management
- [ ] Analytics dashboards

Long-Term / Stretch:

- [ ] AI prioritization & suggestions
- [ ] Advanced reporting exports
- [ ] Custom theming / branding per workspace

## 14. Contributing

Contributions welcome!

1. Fork & branch from `main`
2. Implement feature + tests
3. Run quality gates: `npm run lint && npm run type-check`
4. Open PR with clear description & screenshots if UI changes

Code Style Principles:

- Consistent semantic class usage (avoid hardcoded colors)
- Keep components focused; extract logic into hooks/stores
- Prefer composition over inheritance

## 15. License

MIT © FlowSpace Contributors. See [LICENSE](LICENSE).

---

Need more detail? See `SETUP_GUIDE.md` for an expanded walkthrough.

Enjoy building with FlowSpace! 💡
