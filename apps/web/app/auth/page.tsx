import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AuthPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold">Welcome, {user.firstName}</h1>
      <p className="mt-4 text-textSoft">You are now authenticated. Go to the marketplace to get started.</p>
    </div>
  );
}
