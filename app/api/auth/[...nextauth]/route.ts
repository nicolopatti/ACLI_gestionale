import { handlers } from "@/lib/auth/auth";

export const runtime = "nodejs"; // bcryptjs non è edge-compatible
export const { GET, POST } = handlers;
