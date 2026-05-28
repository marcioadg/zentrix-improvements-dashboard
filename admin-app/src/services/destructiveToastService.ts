import { toast } from "sonner";

export const destructiveToastService = {
  showDestructiveToast: (content: string, title?: string) => {
    toast.error(title ? `${title}: ${content}` : content);
  },
  
  error: (content: string, title?: string) => {
    toast.error(title ? `${title}: ${content}` : content);
  }
};