"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";

export default function NetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  if (!isConnected || chainId === sepolia.id) return null;
  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
      Your wallet is on the wrong network.{" "}
      <button
        className="underline"
        onClick={() => switchChain({ chainId: sepolia.id })}
      >
        Switch to Sepolia
      </button>
    </div>
  );
}
