"use client";

export type ToastKind = "success" | "error";

export type ToastNotice = {
  kind: ToastKind;
  message: string;
};

type ToastProps = {
  notice: ToastNotice;
  onDismiss: () => void;
};

export function Toast({ notice, onDismiss }: ToastProps) {
  return (
    <div
      className={`toast ${notice.kind === "success" ? "toast-success" : "toast-error"}`}
      role={notice.kind === "error" ? "alert" : "status"}
      aria-live={notice.kind === "error" ? "assertive" : "polite"}
    >
      <span className="toast-indicator" aria-hidden="true">
        {notice.kind === "success" ? "✓" : "!"}
      </span>
      <span className="toast-message">{notice.message}</span>
      <button
        type="button"
        className="toast-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}
