import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const adminUser = process.env.ADMIN_USER;
        const adminHash = process.env.ADMIN_PASSWORD_HASH;

        if (
          credentials?.username === adminUser &&
          bcrypt.compareSync(credentials?.password, adminHash)
        ) {
          return { id: "1", name: adminUser };
        }
        return null;
      }
    })
  ],
});
