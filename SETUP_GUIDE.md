# FlowSpace Frontend Setup Guide

## 🚀 Project Overview

FlowSpace is a collaborative task management application built with modern web technologies. The frontend is built with Next.js 15 and integrates with a NestJS backend for authentication and data management.

## 📋 Tech Stack

### Core Framework

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **React 19** with modern hooks and patterns

### Styling & UI

- **TailwindCSS** for utility-first styling
- **shadcn/ui** components for consistent UI
- **Framer Motion** for animations (configured, ready to use)
- **Lucide React** for icons

### State Management

- **Zustand** for global state management
- **React Query (TanStack Query)** for server state
- **NextAuth.js** for authentication state

### Data & API

- **Axios** with request/response interceptors
- **React Hook Form** with Zod validation
- **Socket.io Client** for real-time features

### Development & Testing

- **ESLint** and **TypeScript** for code quality
- **Jest** and **React Testing Library** for testing
- **React Query DevTools** for debugging

## 🏗️ Project Structure

```
├── src/app/                 # Next.js App Router pages
│   ├── (auth)/             # Auth-related pages (login, signup, etc.)
│   ├── dashboard/          # Dashboard page
│   ├── tasks/              # Task management pages
│   ├── analytics/          # Analytics pages
│   ├── settings/           # Settings pages
│   ├── api/auth/           # NextAuth API routes
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx           # Landing page
│   └── providers.tsx       # App providers (Auth, Query, Theme)
│
├── components/             # Reusable UI components
│   ├── ui/                # shadcn/ui base components
│   ├── forms/             # Form components
│   ├── layout/            # Layout components
│   └── feedback/          # Feedback components (modals, toasts)
│
├── lib/                   # Utility libraries
│   ├── api/               # API configuration and methods
│   ├── auth/              # NextAuth configuration
│   ├── hooks/             # Custom React hooks
│   ├── utils.ts           # Utility functions
│   ├── validations/       # Zod schemas for form validation
│   └── socket/            # Socket.io client configuration
│
├── store/                 # Zustand store definitions
├── types/                 # TypeScript type definitions
├── tests/                 # Test files and setup
└── public/               # Static assets
```

## 🔧 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running on http://127.0.0.1:8050

### Installation & Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Environment setup:**
   Copy `.env.example` to `.env.local` and update values:

   ```bash
   cp .env.example .env.local
   ```

3. **Start development server:**

   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - API: http://127.0.0.1:8050/api/v1

## 🔐 Authentication Flow

### NextAuth.js Configuration

- **Provider:** Credentials (connects to NestJS backend)
- **Strategy:** JWT with access/refresh tokens
- **Session:** Stored in secure HTTP-only cookies
- **Auto-refresh:** Automatic token refresh on 401 responses

### Backend Integration

The frontend connects to these NestJS endpoints:

- `POST /api/v1/auth/login` - User login
- `POST /api/v1/user/signup` - User registration
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/verify` - Email verification
- `POST /api/v1/auth/forgot` - Forgot password
- `POST /api/v1/auth/reset` - Reset password

### Usage Example

```tsx
import { useSession } from "next-auth/react";

function MyComponent() {
  const { data: session, status } = useSession();

  if (status === "loading") return <Loading />;
  if (status === "unauthenticated") return <Login />;

  return <div>Welcome {session.user.firstName}!</div>;
}
```

## 📡 API Integration

### Axios Configuration

- **Base URL:** Configured from environment variables
- **Interceptors:** Automatic token injection and refresh
- **Error Handling:** Centralized error handling with redirects

### Usage Example

```tsx
import { api } from "@/lib/api/axios";

// Using the API
const tasks = await api.tasks.getAll();
const newTask = await api.tasks.create({ title: "New Task" });
```

## 🏪 State Management

### Zustand Stores

- **AuthStore:** User authentication state
- **TasksStore:** Task management and filters
- **ProjectsStore:** Project data and selection
- **NotificationsStore:** Real-time notifications
- **UIStore:** Theme, sidebar, and UI preferences

### Usage Example

```tsx
import { useAuthStore } from "@/store";

function Profile() {
  const { user, setUser, logout } = useAuthStore();

  return (
    <div>
      <h1>Welcome {user?.firstName}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## 🔌 Real-time Features

### Socket.io Setup

- **Connection:** Automatic connection when user is authenticated
- **Events:** Task updates, notifications, user presence
- **Reconnection:** Automatic reconnection with exponential backoff

### Usage Example

```tsx
import { useSocket } from "@/lib/socket/socket";

function TaskBoard() {
  const { isConnected, joinTaskRoom, leaveTaskRoom } = useSocket();

  useEffect(() => {
    joinTaskRoom("task-123");
    return () => leaveTaskRoom("task-123");
  }, []);

  return <div>Connected: {isConnected}</div>;
}
```

## 🎨 UI Components

### shadcn/ui Components

Ready-to-use components available:

- `Button` - Various variants and sizes
- `Input` - Form input with validation styles
- `Label` - Accessible form labels

### Custom Components

Location: `components/ui/`

Add new components using shadcn/ui CLI:

```bash
npx shadcn-ui@latest add button
```

## ✅ Form Validation

### Zod Schemas

Comprehensive validation schemas for:

- Authentication (login, signup, reset password)
- Task management (create, update)
- User profile updates

### Usage Example

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validations/schemas";

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    // Form is automatically validated
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}
    </form>
  );
}
```

## 🧪 Testing

### Setup

- **Jest** for test runner
- **React Testing Library** for component testing
- **Setup file:** `tests/setup.ts` with mocks

### Running Tests

```bash
npm test              # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Example Test

```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

test("renders button with text", () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole("button")).toHaveTextContent("Click me");
});
```

## 🚀 Development Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # Run TypeScript checks
```

## 📦 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api/v1
NEXT_PUBLIC_WS_URL=wss://your-api-domain.com
NEXTAUTH_SECRET=your-production-secret
NEXTAUTH_URL=https://your-app-domain.com
```

## 🔮 Future Enhancements

### Ready for Implementation

- **Drag & Drop:** React DnD or @dnd-kit integration
- **PWA Features:** Service workers and offline caching
- **Push Notifications:** Web Push API integration
- **File Uploads:** Integration with cloud storage
- **Charts & Analytics:** Chart.js or Recharts integration

### AI Features (Planned)

- Task prioritization suggestions
- Automated task assignment
- Performance insights
- Smart notifications

## 👥 Team Collaboration

### Code Style

- **ESLint rules** enforced for consistency
- **TypeScript strict mode** for type safety
- **Prettier** configuration for formatting

### Git Workflow

1. Create feature branch from `main`
2. Implement feature with tests
3. Run `npm run lint` and `npm run type-check`
4. Create pull request with description
5. Code review and merge

### Component Development

1. Create component in appropriate directory
2. Add TypeScript interfaces
3. Write unit tests
4. Add to Storybook (if using)
5. Document usage in README

## 🆘 Troubleshooting

### Common Issues

**Build Errors:**

- Check TypeScript errors: `npm run type-check`
- Verify environment variables are set
- Clear `.next` folder and rebuild

**Authentication Issues:**

- Verify NEXTAUTH_SECRET is set
- Check API endpoints are accessible
- Verify JWT token format

**Socket Connection Issues:**

- Check WebSocket URL configuration
- Verify user is authenticated
- Check browser network tab for connection errors

### Debug Tools

- **React Query DevTools** - Server state debugging
- **Zustand DevTools** - State management debugging
- **Next.js DevTools** - Framework debugging

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Guide](https://next-auth.js.org)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Zustand Documentation](https://zustand-demo.pmnd.rs)
- [React Query Guide](https://tanstack.com/query/latest)

---

**Happy coding! 🎉**

For questions or issues, please check the existing issues in the repository or create a new one with detailed information about the problem.
