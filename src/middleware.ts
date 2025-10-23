import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Le middleware s'exécute pour toutes les routes protégées
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Vérifier si l'utilisateur a un token valide
        if (!token) {
          return false;
        }

        // Vérifier si le token n'est pas expiré
        const currentTime = Math.floor(Date.now() / 1000);
        if (
          token.exp &&
          typeof token.exp === "number" &&
          currentTime > token.exp
        ) {
          return false;
        }

        return true;
      },
    },
  }
);

export const config = {
  // Protéger toutes les routes sauf celles d'authentification et publiques
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login, signup, forgot-password, reset-password, verify (auth pages)
     * - manifest.json, sw.js, offline.html (PWA files)
     * - icons/ (PWA icons)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login|signup|forgot-password|reset-password|verify|manifest.json|sw.js|offline.html|icons/).*)",
  ],
};
