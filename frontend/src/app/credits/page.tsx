"use client";

import { useAccount, useReadContracts } from "wagmi";
import { CARBON_CREDIT_ADDRESS, carbonCreditAbi } from "@/lib/contract";
import { mockProjects } from "@/lib/mockData";
import CreditActions from "@/components/CreditActions";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export default function CreditsPage() {
  const { address, isConnected } = useAccount();

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: mockProjects.map((p) => ({
      address: CARBON_CREDIT_ADDRESS,
      abi: carbonCreditAbi,
      functionName: "balanceOf" as const,
      args: [address ?? ZERO, BigInt(p.id)] as const,
    })),
    query: { enabled: isConnected && !!address },
  });

  const rows = mockProjects.map((project, i) => ({
    project,
    balance: (data?.[i]?.result as bigint | undefined) ?? BigInt(0),
  }));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">My credits</h1>
      <p className="mb-6 text-sm text-slate-600">
        1 credit = 1 tonne CO2. Balances are read from the contract on Sepolia.
      </p>

      {!isConnected ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm">
          Connect your wallet (top right) to see your credits.
        </div>
      ) : isLoading ? (
        <p className="text-sm text-slate-600">Loading balances...</p>
      ) : isError ? (
        <p className="text-sm text-red-700">
          Could not read balances. Check your network and try again.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map(({ project, balance }) => (
            <div
              key={project.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-xs text-slate-500">
                    Token ID {project.id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold">{balance.toString()}</p>
                  <p className="text-xs text-slate-500">tonnes</p>
                </div>
              </div>
              <CreditActions
                projectId={project.id}
                balance={balance}
                onDone={() => refetch()}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
