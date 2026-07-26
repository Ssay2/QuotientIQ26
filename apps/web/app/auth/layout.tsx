import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="border-b border-line bg-panel px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-accent">
            QuotientIQ
          </Link>
          <div className="flex items-center gap-4">
            <a href="/marketplace" className="text-sm text-textSoft hover:text-text">
              Marketplace
            </a>
            <UserButton />
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
