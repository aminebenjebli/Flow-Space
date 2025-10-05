import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "";
  },
}));

// Mock next-auth/react
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = "http://localhost:8050/api/v1";
process.env.NEXT_PUBLIC_WS_URL = "ws://localhost:8050";
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";
