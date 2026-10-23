"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";

export default function NetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  if (!isConnected || chainId === sepolia.id) return null;

  return (
    <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
      Your wallet is on the wrong network.{" "}
      <button
        className="underline underline-offset-2"
        onClick={() => switchChain({ chainId: sepolia.id })}
      >
        Switch to Sepolia
      </button>
    </div>
  );
}
