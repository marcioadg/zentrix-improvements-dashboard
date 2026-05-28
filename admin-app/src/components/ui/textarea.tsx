
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize = false, onChange, value, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    
    // Combine refs
    React.useImperativeHandle(ref, () => internalRef.current!);

    const adjustHeight = React.useCallback(() => {
      const textarea = internalRef.current;
      if (textarea && autoResize) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [autoResize]);

    // Adjust height when value changes
    React.useEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    // Adjust on mount
    React.useEffect(() => {
      if (autoResize) {
        adjustHeight();
      }
    }, [autoResize, adjustHeight]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
      if (autoResize) {
        adjustHeight();
      }
    };

    return (
      <textarea
        className={cn(
          "flex w-full min-h-[60px] rounded-md border-2 border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground hover:border-input/80 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200",
          autoResize ? "resize-none overflow-hidden" : "resize-y",
          className
        )}
        ref={internalRef}
        rows={2}
        onChange={handleChange}
        value={value}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
