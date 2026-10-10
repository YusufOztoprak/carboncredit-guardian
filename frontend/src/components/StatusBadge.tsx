import type { Status } from "@/lib/mockData";

const styles: Record<Status, string> = {
  verified: "bg-green-100 text-green-800",
  flagged: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}
