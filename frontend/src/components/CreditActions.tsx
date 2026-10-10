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

const input =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none";

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
    if (isSuccess) {
      onDone();
      setAmount("");
      setTo("");
      setBeneficiary("");
      setReason("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  function open(next: Mode) {
    reset();
    setFormError(null);
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
          className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-40"
        >
          Transfer
        </button>
        <button
          disabled={!hasCredits}
          onClick={() => open("retire")}
          className="rounded-md bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-800 disabled:opacity-40"
        >
          Retire
        </button>
      </div>

      {mode && (
        <form
          onSubmit={submit}
          className="mt-4 space-y-3 rounded-md bg-slate-50 p-4"
        >
          <p className="text-sm font-medium capitalize">{mode} credits</p>

          {mode === "retire" && (
            <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">
              Retiring is permanent. The credits are burned and can never be
              transferred or retired again.
            </p>
          )}

          <div>
            <label className="mb-1 block text-xs text-slate-500">
              Amount (tonnes)
            </label>
            <input
              className={input}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {mode === "transfer" ? (
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Recipient address
              </label>
              <input
                className={input}
                placeholder="0x..."
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Beneficiary
                </label>
                <input
                  className={input}
                  placeholder="e.g. Acme Corp"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Reason
                </label>
                <input
                  className={input}
                  placeholder="e.g. 2026 emissions offset"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </>
          )}

          {formError && <p className="text-sm text-red-700">{formError}</p>}
          {error && (
            <p className="text-sm text-red-700">
              {"shortMessage" in error ? error.shortMessage : error.message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {isPending
              ? "Confirm in your wallet..."
              : confirming
                ? "Waiting for confirmation..."
                : mode === "transfer"
                  ? "Send credits"
                  : "Retire credits"}
          </button>

          {isSuccess && hash && (
            <p className="text-sm text-green-700">
              Done.{" "}
              <a
                className="underline"
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
