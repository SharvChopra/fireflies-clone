"use client";

import { useRef, useState, type FormEvent } from "react";
import type { ActionItem, Participant } from "@/lib/types";

type ActionItemsProps = {
  items: ActionItem[];
  participants: Participant[];
  onCreate: (description: string, ownerId?: number) => Promise<void>;
  onUpdate: (
    id: number,
    patch: { description?: string; status?: ActionItem["status"] },
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function ActionItems({
  items,
  participants,
  onCreate,
  onUpdate,
  onDelete,
  onSuccess,
  onError,
}: ActionItemsProps) {
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDescription, setEditingDescription] = useState("");
  const [busyId, setBusyId] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const operationLock = useRef(false);

  const reportError = (message: string) => {
    setError(message);
    onError(message);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const cleanDescription = description.trim();
    if (operationLock.current) return;
    if (!cleanDescription) {
      reportError("Enter an action item before adding it.");
      return;
    }
    operationLock.current = true;
    setBusyId("new");
    setError(null);
    try {
      await onCreate(cleanDescription, ownerId ? Number(ownerId) : undefined);
      setDescription("");
      setOwnerId("");
      onSuccess("Action item added.");
    } catch (createError) {
      reportError(
        createError instanceof Error
          ? createError.message
          : "Could not add action item. Please retry.",
      );
    } finally {
      setBusyId(null);
      operationLock.current = false;
    }
  };

  const handleUpdate = async (
    item: ActionItem,
    patch: { description?: string; status?: ActionItem["status"] },
  ) => {
    if (operationLock.current) return;
    if (patch.description !== undefined && !patch.description.trim()) {
      reportError("Action item description is required.");
      return;
    }
    operationLock.current = true;
    setBusyId(item.id);
    setError(null);
    try {
      await onUpdate(item.id, patch);
      if (patch.description !== undefined) setEditingId(null);
      onSuccess(
        patch.status === "done"
          ? "Action item marked complete."
          : patch.status !== undefined
            ? "Action item reopened."
            : "Action item updated.",
      );
    } catch (updateError) {
      reportError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update action item. Please retry.",
      );
    } finally {
      setBusyId(null);
      operationLock.current = false;
    }
  };

  const handleDelete = async (item: ActionItem) => {
    if (operationLock.current) return;
    operationLock.current = true;
    setBusyId(item.id);
    setError(null);
    try {
      await onDelete(item.id);
      onSuccess("Action item deleted.");
    } catch (deleteError) {
      reportError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete action item. Please retry.",
      );
    } finally {
      setBusyId(null);
      operationLock.current = false;
    }
  };

  return (
    <section
      className="action-items-section"
      aria-labelledby="action-items-heading"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">FOLLOW-UPS</span>
          <h2 id="action-items-heading">Action items</h2>
        </div>
        <span className="segment-count">
          {items.filter((item) => item.status !== "done").length} open
        </span>
      </div>

      {items.length === 0 ? (
        <p className="muted-copy">No follow-up actions yet. Add one below.</p>
      ) : (
        <ul className="action-item-list">
          {items.map((item) => {
            const isDone = item.status === "done";
            const isEditing = editingId === item.id;
            const isBusy = busyId === item.id;
            return (
              <li
                className={`action-item ${isDone ? "is-done" : ""}`}
                key={item.id}
              >
                <button
                  type="button"
                  className={`action-check ${isDone ? "checked" : ""}`}
                  aria-label={
                    isDone
                      ? `Reopen action: ${item.description}`
                      : `Mark complete: ${item.description}`
                  }
                  onClick={() =>
                    handleUpdate(item, { status: isDone ? "open" : "done" })
                  }
                  disabled={isBusy}
                >
                  {isBusy ? "…" : isDone ? "✓" : ""}
                </button>

                {isEditing ? (
                  <form
                    className="action-edit-form"
                    noValidate
                    onSubmit={(event) => {
                      event.preventDefault();
                      const cleanDescription = editingDescription.trim();
                      void handleUpdate(item, {
                        description: cleanDescription,
                      });
                    }}
                  >
                    <input
                      autoFocus
                      value={editingDescription}
                      onChange={(event) =>
                        setEditingDescription(event.target.value)
                      }
                      aria-label="Edit action item description"
                      maxLength={500}
                      required
                    />
                    <button
                      className="text-button"
                      type="submit"
                      disabled={isBusy}
                    >
                      {isBusy ? "Saving…" : "Save"}
                    </button>
                    <button
                      className="text-button muted"
                      type="button"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="action-item-copy">
                    <span className="action-description">
                      {item.description}
                    </span>
                    <small>
                      {item.owner_id
                        ? (participants.find(
                            (participant) => participant.id === item.owner_id,
                          )?.name ?? "Assigned")
                        : "Unassigned"}
                      {item.due_date ? ` · due ${item.due_date}` : ""}
                    </small>
                  </div>
                )}

                {!isEditing && (
                  <div className="action-item-actions">
                    <button
                      type="button"
                      className="icon-button action-icon-button"
                      aria-label={`Edit action item: ${item.description}`}
                      title="Edit action item"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditingDescription(item.description);
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-button action-icon-button delete-icon"
                      aria-label={`Delete action item: ${item.description}`}
                      title="Delete action item"
                      onClick={() => void handleDelete(item)}
                      disabled={isBusy}
                    >
                      {isBusy ? "…" : "×"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}

      <form className="add-action-form" onSubmit={handleCreate} noValidate>
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add an action item..."
          aria-label="New action item description"
          maxLength={500}
          required
        />
        <select
          value={ownerId}
          onChange={(event) => setOwnerId(event.target.value)}
          aria-label="Assign action item"
        >
          <option value="">Unassigned</option>
          {participants.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.name}
            </option>
          ))}
        </select>
        <button
          className="primary-button"
          type="submit"
          disabled={busyId !== null}
        >
          {busyId === "new" ? "Adding…" : "+ Add"}
        </button>
      </form>
    </section>
  );
}
