"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";

const btn =
  "rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60";

export default function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return (
      <button
        className={`${btn} bg-teal-700 hover:bg-teal-800`}
        disabled={isPending}
        onClick={() => connect({ connector: connectors[0] })}
      >
        {isPending ? "Connecting..." : "Connect wallet"}
      </button>
    );
  }

  if (chainId !== sepolia.id) {
    return (
      <button
        className={`${btn} bg-amber-600 hover:bg-amber-700`}
        onClick={() => switchChain({ chainId: sepolia.id })}
      >
        Switch to Sepolia
      </button>
    );
  }

  return (
    <button
      className={`${btn} bg-slate-700 hover:bg-slate-800`}
      onClick={() => disconnect()}
      title="Click to disconnect"
    >
      {address?.slice(0, 6)}...{address?.slice(-4)}
    </button>
  );
}
