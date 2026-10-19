const styles: Record<string, string> = {
  verified: "bg-emerald-50 text-emerald-700",
  approved: "bg-emerald-50 text-emerald-700",
  minted: "bg-emerald-50 text-emerald-700",
  flagged: "bg-amber-50 text-amber-700",
  pending: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-700",
};

export default function StatusBadge({ status }: { status: string }) {
  const style = styles[status.toLowerCase()] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {status}
    </span>
  );
}
