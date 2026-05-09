import type { DefaultSession, DefaultUser } from "next-auth";
import type { Ruolo } from "@/lib/config";

declare module "next-auth" {
  interface User extends DefaultUser {
    recordId: string;
    nome: string;
    ruolo: Ruolo;
    telegramUserId?: string;
    mustChangePassword?: boolean;
  }

  interface Session {
    user: {
      recordId: string;
      nome: string;
      ruolo: Ruolo;
      telegramUserId?: string;
      mustChangePassword?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    nome?: string;
    ruolo?: Ruolo;
    telegramUserId?: string;
    mustChangePassword?: boolean;
  }
}
