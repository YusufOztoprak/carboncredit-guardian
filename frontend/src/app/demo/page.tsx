"use client";

import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import {
  BaseError,
  ContractFunctionRevertedError,
  isAddress,
  parseAbi,
} from "viem";
import { CARBON_CREDIT_ADDRESS } from "@/lib/contract";

const abi = parseAbi([
  "function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes data)",
  "error ERC1155InsufficientBalance(address sender, uint256 balance, uint256 needed, uint256 tokenId)",
]);

type Result = { ok: boolean; title: string; detail?: string };

export default function ResaleDemoPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [projectId, setProjectId] = useState("8");
  const [amount, setAmount] = useState("1");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function check(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);

    if (!address || !publicClient) {
      setResult({ ok: false, title: "Connect your wallet first." });
      return;
    }
    if (!/^\d+$/.test(projectId) || !/^\d+$/.test(amount)) {
      setResult({ ok: false, title: "Enter a project ID and a whole amount." });
      return;
    }
    if (!isAddress(to)) {
      setResult({ ok: false, title: "Enter a valid recipient address (0x...)." });
      return;
    }

    setBusy(true);
    try {
      await publicClient.simulateContract({
        account: address,
        address: CARBON_CREDIT_ADDRESS,
        abi,
        functionName: "safeTransferFrom",
        args: [address, to, BigInt(projectId), BigInt(amount), "0x"],
      });
      setResult({
        ok: true,
        title: "This transfer would succeed.",
        detail: "You still own enough of this credit. Nothing was sent.",
      });
    } catch (err) {
      if (err instanceof BaseError) {
        const revert = err.walk((x) => x instanceof ContractFunctionRevertedError);
        if (revert instanceof ContractFunctionRevertedError) {
          const name = revert.data?.errorName;
          const args = revert.data?.args as readonly [string, bigint, bigint, bigint] | undefined;
          setResult({
            ok: false,
            title: "Rejected by the contract.",
            detail:
              name === "ERC1155InsufficientBalance" && args
                ? `Only ${args[1].toString()} unit(s) available, but ${args[2].toString()} needed. Retired credits are burned, so they can never be transferred or retired again.`
                : name ?? revert.shortMessage,
          });
        } else {
          setResult({ ok: false, title: "The check could not run.", detail: err.shortMessage });
        }
      } else {
        setResult({ ok: false, title: "The check could not run." });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resale attempt</h1>
        <p className="text-sm text-slate-500">
          Checks a transfer against the live Sepolia contract without sending it.
          Use it to show that retired credits can&apos;t be resold.
        </p>
      </div>

      {!isConnected && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Connect your wallet (sidebar) to run the check.
        </p>
      )}

      <form onSubmit={check} className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Project (token) ID</label>
            <input className="input" inputMode="numeric" value={projectId}
              onChange={(e) => setProjectId(e.target.value)} />
          </div>
          <div>
            <label className="label">Amount (tonnes)</label>
            <input className="input" inputMode="numeric" value={amount}
              onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Buyer address</label>
          <input className="input" placeholder="0x..." value={to}
            onChange={(e) => setTo(e.target.value)} />
        </div>
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Checking..." : "Try to resell"}
        </button>
      </form>

      {result && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            result.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p className="font-semibold">{result.title}</p>
          {result.detail && <p className="mt-1">{result.detail}</p>}
        </div>
      )}
    </div>
  );
}