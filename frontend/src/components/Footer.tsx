import { CARBON_CREDIT_ADDRESS } from "@/lib/contract";

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-slate-200/70">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-slate-500">
        <span>
          CarbonCredit Guardian &middot; IEEE ClimateChain Global Hackathon 2026
        </span>
        <span>
          Sepolia testnet &middot; contract{" "}
          <a
            className="font-medium text-teal-700 underline-offset-2 hover:underline"
            href={`https://sepolia.etherscan.io/address/${CARBON_CREDIT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
          >
            {CARBON_CREDIT_ADDRESS.slice(0, 10)}...
            {CARBON_CREDIT_ADDRESS.slice(-6)}
          </a>
        </span>
      </div>
    </footer>
  );
}
