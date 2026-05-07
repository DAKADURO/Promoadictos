import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
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
      async authorize(credentials) {
        const adminUser = process.env.ADMIN_USER;
        const adminHash = process.env.ADMIN_PASSWORD_HASH;

        if (!adminUser || !adminHash) {
          console.error("Missing ADMIN_USER or ADMIN_PASSWORD_HASH env vars");
          return null;
        }

        if (credentials?.username !== adminUser) {
          return null;
        }

        const isValid = await bcrypt.compare(
          String(credentials.password),
          adminHash
        );

        if (isValid) {
          return { id: "1", name: adminUser };
        }

        return null;
      },
    }),
  ],
});
