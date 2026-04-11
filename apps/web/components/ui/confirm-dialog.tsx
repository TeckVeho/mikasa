"use client";

import { Modal } from "./modal";
import { Button } from "./button";

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "確認",
  confirmVariant = "danger",
  isLoading,
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  isLoading?: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            キャンセル
          </Button>
          <Button
            variant={confirmVariant === "danger" ? "danger" : "primary"}
            loading={isLoading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">{description}</p>
    </Modal>
  );
}
