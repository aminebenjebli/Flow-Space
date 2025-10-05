import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/sign-in`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            }
          );

          if (!response.ok) {
            console.error(
              "Auth response not ok:",
              response.status,
              response.statusText
            );
            return null;
          }

          const data = await response.json();
          console.log("Auth response data:", data);

          // Your backend returns { token, refreshToken }
          if (data.token) {
            // Decode the JWT to get user info
            const payload = JSON.parse(atob(data.token.split(".")[1]));

            return {
              id: payload.sub,
              email: payload.email,
              firstName: payload.name.split(" ")[0] || payload.name,
              lastName: payload.name.split(" ").slice(1).join(" ") || "",
              role: undefined,
              emailVerified: true, // Since your backend checks this
              accessToken: data.token,
              refreshToken: data.refreshToken,
            };
          }
          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 minutes to match backend token
  },
  jwt: {
    maxAge: 15 * 60, // 15 minutes to match backend token
  },
  callbacks: {
    async jwt({ token, user, account }): Promise<JWT> {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: Date.now() + 15 * 60 * 1000, // 15 minutes to match backend
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            emailVerified: Boolean(user.emailVerified),
          },
        };
      }

      // Return previous token if the access token has not expired
      if (Date.now() < (token.accessTokenExpires || 0)) {
        return token;
      }

      // Access token has expired, try to update it
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.user = {
        id: token.user?.id || "",
        email: token.user?.email || "",
        firstName: token.user?.firstName || "",
        lastName: token.user?.lastName || "",
        role: token.user?.role,
        emailVerified: token.user?.emailVerified,
        name: `${token.user?.firstName} ${token.user?.lastName}`,
        image: null,
      };
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

async function refreshAccessToken(token: JWT) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken: token.refreshToken,
        }),
      }
    );

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error(
        "Refresh token response not ok:",
        response.status,
        refreshedTokens
      );
      throw refreshedTokens;
    }

    console.log("Refresh token response:", refreshedTokens);

    // Your backend returns { token, refreshToken } directly
    return {
      ...token,
      accessToken: refreshedTokens.token,
      accessTokenExpires: Date.now() + 15 * 60 * 1000, // 15 minutes
      refreshToken: refreshedTokens.refreshToken ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export { authOptions };
export default NextAuth(authOptions);
