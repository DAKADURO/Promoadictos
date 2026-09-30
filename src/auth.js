import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { clientIp, isBlocked, recordFailure, clearFailures } from "@/lib/rateLimit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, request) {
        // Freno a la fuerza bruta: 5 fallos cada 15 min por IP
        const key = `login:${clientIp(request?.headers)}`;
        const policy = { limit: 5, windowMs: 15 * 60 * 1000 };
        if (isBlocked(key, policy)) {
          console.warn(`[Security] Login bloqueado temporalmente (${key})`);
          return null;
        }

        const adminUser = process.env.ADMIN_USER;
        const adminHash = process.env.ADMIN_PASSWORD_HASH;

        if (!adminUser || !adminHash) {
          console.error("Missing ADMIN_USER or ADMIN_PASSWORD_HASH env vars");
          return null;
        }

        // Siempre se compara el hash, exista o no el usuario, para no
        // revelar por tiempo de respuesta si el usuario es válido.
        const isValid = await bcrypt.compare(String(credentials?.password ?? ""), adminHash);

        if (credentials?.username === adminUser && isValid) {
          clearFailures(key);
          return { id: "1", name: adminUser };
        }

        recordFailure(key);
        return null;
      },
    }),
  ],
});
