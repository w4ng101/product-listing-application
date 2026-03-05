import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorMessage({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center",
        className
      )}
    >
      <AlertTriangle className="mb-3 h-10 w-10 text-rose-400" />
      <h3 className="text-base font-semibold text-rose-800">{title}</h3>
      <p className="mt-1 text-sm text-rose-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-rose-700 active:bg-rose-800 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}
