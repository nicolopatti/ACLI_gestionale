import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { homeForRuolo } from "@/lib/config";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(homeForRuolo(session.user.ruolo));
}
