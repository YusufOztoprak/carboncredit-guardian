import Link from "next/link";
import ConnectButton from "./ConnectButton";

export default function Nav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-teal-800">
            CarbonCredit Guardian
          </Link>
          <nav className="flex gap-4 text-sm text-slate-600">
            <Link href="/" className="hover:text-slate-900">
              Projects
            </Link>
            <Link href="/projects/new" className="hover:text-slate-900">
              Submit
            </Link>
            <Link href="/credits" className="hover:text-slate-900">
              My credits
            </Link>
          </nav>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
