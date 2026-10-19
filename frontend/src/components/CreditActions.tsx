"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { isAddress } from "viem";
import { CARBON_CREDIT_ADDRESS, carbonCreditAbi } from "@/lib/contract";

type Mode = "transfer" | "retire" | null;

type Props = {
  projectId: number;
  balance: bigint;
  onDone: () => void;
};

export default function CreditActions({ projectId, balance, onDone }: Props) {
  const { address } = useAccount();
  const [mode, setMode] = useState<Mode>(null);
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  function open(next: Mode) {
    reset();
    setFormError(null);
    setAmount("");
    setTo("");
    setBeneficiary("");
    setReason("");
    setMode(next);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (!address) {
      setFormError("Connect your wallet first.");
      return;
    }
    if (!/^\d+$/.test(amount) || BigInt(amount) === BigInt(0)) {
      setFormError("Enter a whole number of tonnes above 0.");
      return;
    }
    const value = BigInt(amount);
    if (value > balance) {
      setFormError(`You only own ${balance.toString()} tonnes of this credit.`);
      return;
    }

    if (mode === "transfer") {
      if (!isAddress(to)) {
        setFormError("Enter a valid wallet address (0x...).");
        return;
      }
      writeContract({
        address: CARBON_CREDIT_ADDRESS,
        abi: carbonCreditAbi,
        functionName: "safeTransferFrom",
        args: [address, to, BigInt(projectId), value, "0x"],
      });
    } else if (mode === "retire") {
      if (!beneficiary.trim()) {
        setFormError("Enter who the credits are retired for.");
        return;
      }
      writeContract({
        address: CARBON_CREDIT_ADDRESS,
        abi: carbonCreditAbi,
        functionName: "retire",
        args: [BigInt(projectId), value, beneficiary.trim(), reason.trim()],
      });
    }
  }

  const busy = isPending || confirming;
  const hasCredits = balance > BigInt(0);

  return (
    <div>
      <div className="flex gap-2">
        <button
          disabled={!hasCredits}
          onClick={() => open("transfer")}
          className="btn btn-secondary"
        >
          Transfer
        </button>
        <button
          disabled={!hasCredits}
          onClick={() => open("retire")}
          className="btn btn-danger"
        >
          Retire
        </button>
      </div>

      {mode && (
        <form
          onSubmit={submit}
          className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <p className="text-sm font-medium capitalize">{mode} credits</p>

          {mode === "retire" && (
            <p className="rounded-md bg-amber-50 p-2.5 text-xs text-amber-800">
              Retiring is permanent. The credits are burned and can never be
              transferred or retired again.
            </p>
          )}

          <div>
            <label className="label">Amount (tonnes)</label>
            <input
              className="input"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {mode === "transfer" ? (
            <div>
              <label className="label">Recipient address</label>
              <input
                className="input"
                placeholder="0x..."
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Beneficiary</label>
                <input
                  className="input"
                  placeholder="e.g. Acme Corp"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Reason</label>
                <input
                  className="input"
                  placeholder="e.g. 2026 emissions offset"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
          )}

          {formError && <p className="text-sm text-red-700">{formError}</p>}
          {error && (
            <p className="text-sm text-red-700">
              {"shortMessage" in error ? error.shortMessage : error.message}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn btn-primary">
            {isPending
              ? "Confirm in your wallet..."
              : confirming
                ? "Waiting for confirmation..."
                : mode === "transfer"
                  ? "Send credits"
                  : "Retire credits"}
          </button>

          {isSuccess && hash && (
            <p className="text-sm text-emerald-700">
              Done.{" "}
              <a
                className="font-medium underline"
                href={`https://sepolia.etherscan.io/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
              >
                View transaction
              </a>
            </p>
          )}
        </form>
      )}
    </div>
  );
}
