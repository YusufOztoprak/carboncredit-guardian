const styles: Record<string, string> = {
  verified: "bg-green-100 text-green-800",
  approved: "bg-green-100 text-green-800",
  minted: "bg-green-100 text-green-800",
  flagged: "bg-amber-100 text-amber-800",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
};

export default function StatusBadge({ status }: { status: string }) {
  const style = styles[status.toLowerCase()] ?? "bg-slate-100 text-slate-700";
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style}`}
    >
      {status}
    </span>
  );
}
