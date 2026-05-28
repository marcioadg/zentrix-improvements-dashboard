
import React from "react";

// Use React.lazy to dynamically load the emoji picker for performance.
const Picker = React.lazy(() => import("emoji-picker-react"));

interface EmojiPickerProps {
  value: string | null | undefined;
  onChange: (emoji: string) => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  value,
  onChange,
  onClose,
  anchorEl,
}) => {
  if (!anchorEl) return null;

  const rect = anchorEl.getBoundingClientRect();
  const style: React.CSSProperties = {
    position: "fixed",
    top: rect.bottom + 8,
    left: rect.left,
    zIndex: 9999,
    background: "hsl(var(--popover))",
    borderRadius: "0.75rem",
    boxShadow: "0 4px 20px 0 hsl(var(--foreground) / 0.12)",
    border: "1px solid hsl(var(--border))",
    padding: 0,
  };

  // ESC and click outside closes picker
  React.useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handleClick(e: MouseEvent) {
      if (anchorEl && !anchorEl.contains(e.target as Node)) {
        const pickerDom = document.getElementById("full-emoji-picker");
        if (pickerDom && !pickerDom.contains(e.target as Node)) {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose, anchorEl]);

  return (
    <div style={style} id="full-emoji-picker">
      <React.Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading…</div>}>
        <Picker
          onEmojiClick={(emojiData: any) => {
            // v4: emojiData has {emoji, names, etc.}
            onChange(emojiData.emoji);
            onClose();
          }}
          skinTonesDisabled
          searchDisabled={false}
          width={344}
          height={410}
        />
      </React.Suspense>
    </div>
  );
};

export default EmojiPicker;
