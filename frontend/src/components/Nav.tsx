"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "./ConnectButton";
import { CARBON_CREDIT_ADDRESS } from "@/lib/contract";

const links = [
  {
    href: "/",
    label: "Projects",
    icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  },
  { href: "/projects/new", label: "Submit project", icon: "M12 5v14M5 12h14" },
  {
    href: "/credits",
    label: "My credits",
    icon: "M3 7a2 2 0 0 1 2-2h14v4M3 7v10a2 2 0 0 0 2 2h14V9H5a2 2 0 0 1-2-2zM16 14h2",
  },
];

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </span>
      <span className="hidden text-sm font-semibold tracking-tight sm:inline lg:inline">
        CarbonCredit Guardian
      </span>
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/")
      return (
        pathname === "/" ||
        (pathname.startsWith("/projects/") && pathname !== "/projects/new")
      );
    return pathname === href || pathname.startsWith(href + "/");
  };

  const linkClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
      active
        ? "bg-brand-50 text-brand-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <ConnectButton />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={linkClass(isActive(l.href))}
            >
              <Icon d={l.icon} />
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4 lg:flex">
        <div>
          <div className="px-2 py-1.5">
            <Logo />
          </div>
          <nav className="mt-6 space-y-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={linkClass(isActive(l.href))}
              >
                <Icon d={l.icon} />
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="space-y-3">
          <div className="[&>button]:w-full">
            <ConnectButton />
          </div>
          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Sepolia testnet
            </span>
            <a
              className="font-medium text-brand-600 hover:underline"
              href={`https://sepolia.etherscan.io/address/${CARBON_CREDIT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
            >
              Contract
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
