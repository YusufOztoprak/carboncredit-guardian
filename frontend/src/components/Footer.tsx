import { CARBON_CREDIT_ADDRESS } from "@/lib/contract";

export default function Footer() {
  return (
    <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-slate-500">
      Sepolia testnet &middot; contract{" "}
      <a
        className="underline"
        href={`https://sepolia.etherscan.io/address/${CARBON_CREDIT_ADDRESS}`}
        target="_blank"
        rel="noreferrer"
      >
        {CARBON_CREDIT_ADDRESS.slice(0, 10)}...{CARBON_CREDIT_ADDRESS.slice(-6)}
      </a>
    </footer>
  );
}