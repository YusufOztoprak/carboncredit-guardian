"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";

export default function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return (
      <button
        className="btn btn-primary"
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
        className="btn btn-warn"
        onClick={() => switchChain({ chainId: sepolia.id })}
      >
        Switch to Sepolia
      </button>
    );
  }

  return (
    <button
      className="btn btn-secondary"
      onClick={() => disconnect()}
      title="Click to disconnect"
    >
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      {address?.slice(0, 6)}...{address?.slice(-4)}
    </button>
  );
}
