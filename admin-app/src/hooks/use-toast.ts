
import { toast as sonnerToast } from "sonner";
import { destructiveToastService } from "@/services/destructiveToastService";

type ToastVariant = "default" | "destructive"

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
}

// Toast function that shows both success and error notifications
export function toast({ title, description, variant = "default", action, duration }: ToastOptions) {
  const content = description || title || "";

  if (variant === "destructive") {
    destructiveToastService.showDestructiveToast(content, title);
    return;
  }

  const lowerTitle = (title || "").toLowerCase();
  const lowerContent = content.toLowerCase();

  // Show error toasts when title or content signals a failure
  const isError = lowerTitle.includes('error') ||
    lowerTitle.includes('failed') ||
    lowerTitle.includes('invalid') ||
    lowerContent.includes('failed') ||
    lowerContent.includes('invalid') ||
    lowerContent.includes('not found') ||
    lowerContent.includes('unauthorized') ||
    lowerContent.includes('forbidden');

  if (isError) {
    sonnerToast.error(title || content, {
      description: title ? description : undefined,
      duration: duration || 5000,
    });
    return;
  }

  // Show success confirmations so users know their action worked
  const isSuccess = lowerContent.includes('success') ||
    lowerContent.includes('complete') ||
    lowerContent.includes('saved') ||
    lowerContent.includes('created') ||
    lowerContent.includes('updated') ||
    lowerContent.includes('added') ||
    lowerContent.includes('deleted') ||
    lowerContent.includes('assigned') ||
    lowerContent.includes('invited') ||
    lowerContent.includes('sent');

  if (isSuccess) {
    sonnerToast.success(title || content, {
      description: title ? description : undefined,
      duration: duration || 3000,
    });
  }
}

// New enhanced hook that only shows destructive toasts
export function useDestructiveToast() {
  const toast = ({ title, description, variant = "destructive", action, duration }: ToastOptions) => {
    // Only process destructive toasts
    if (variant !== "destructive") {
      return;
    }

    const content = description || "";
    destructiveToastService.showDestructiveToast(content, title);
  };

  return {
    toast,
    dismiss: (toastId?: string) => {
      sonnerToast.dismiss(toastId);
    },
    toasts: [],
  };
}

// Backward compatible useToast hook
export function useToast() {
  return {
    toast,
    dismiss: (toastId?: string) => {
      sonnerToast.dismiss(toastId);
    },
    toasts: [],
  };
}
