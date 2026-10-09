type DeleteMeetingDialogProps = {
  title: string;
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteMeetingDialog({
  title,
  deleting,
  error,
  onCancel,
  onConfirm,
}: DeleteMeetingDialogProps) {
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !deleting && onCancel()
      }
    >
      <section
        className="detail-dialog delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <span className="danger-icon" aria-hidden="true">
          !
        </span>
        <h2 id="delete-dialog-title">Delete this meeting?</h2>
        <p>
          “{title}” and its transcript, participants, summary, and action items
          will be permanently removed.
        </p>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete meeting"}
          </button>
        </div>
      </section>
    </div>
  );
}
