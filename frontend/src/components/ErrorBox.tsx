export default function ErrorBox({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      {message}{" "}
      {onRetry && (
        <button className="underline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}