import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { getPrisma } from "@/lib/db/prisma";

const googleConfigured =
  Boolean(process.env.AUTH_GOOGLE_ID) &&
  Boolean(process.env.AUTH_GOOGLE_SECRET);

const databaseConfigured = Boolean(process.env.DATABASE_URL);

const googleProviders = googleConfigured
  ? [
      Google({
        clientId: process.env.AUTH_GOOGLE_ID!,
        clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      }),
    ]
  : [];

const credentialsProvider = databaseConfigured
  ? Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email;
        const password = credentials?.password;
        if (
          typeof rawEmail !== "string" ||
          typeof password !== "string" ||
          !rawEmail.trim() ||
          !password
        ) {
          return null;
        }
        const email = rawEmail.trim().toLowerCase();
        const prisma = getPrisma();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    })
  : null;

const providers = [
  ...googleProviders,
  ...(credentialsProvider ? [credentialsProvider] : []),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  adapter: databaseConfigured ? PrismaAdapter(getPrisma()) : undefined,
  session: { strategy: "jwt" },
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        if (typeof token.email === "string") session.user.email = token.email;
        if (typeof token.name === "string") session.user.name = token.name;
        if (typeof token.picture === "string") session.user.image = token.picture;
      }
      return session;
    },
  },
});

export function authProvidersConfigured(): boolean {
  return providers.length > 0;
}

export function authHasGoogle(): boolean {
  return googleConfigured;
}

export function authHasCredentials(): boolean {
  return databaseConfigured;
}
