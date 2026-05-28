
import React from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Quote,
  Code,
  List,
  ListOrdered,
  Link,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from "@/components/ui/tooltip";
// Import tag checkers for visual feedback
import { isTagActive } from "./editorFormattingUtils";

type EditorToolbarProps = {
  onAction: (cmd: string, value?: string) => void;
  formatValue?: string; // NEW: block select state
};

const headingOptions = [
  { label: "Normal", value: "paragraph" },
  { label: "Heading 1", value: "heading1" },
  { label: "Heading 2", value: "heading2" },
  { label: "Heading 3", value: "heading3" }
];

export default function ProcessEditorToolbar({ onAction, formatValue }: EditorToolbarProps) {
  // controlled select format - live update from cursor
  const [format, setFormat] = React.useState("paragraph");

  React.useEffect(() => {
    if (formatValue) setFormat(formatValue);
  }, [formatValue]);

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1 p-2 border-b mb-2 bg-muted/60 rounded-t-md">
        {/* Headings selector */}
        <Select
          value={format}
          onValueChange={(val) => {
            setFormat(val);
            onAction(val);
          }}
        >
          <SelectTrigger className="w-32 h-9">
            <Type size={16} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="Normal" />
          </SelectTrigger>
          <SelectContent side="bottom" align="start" className="min-w-[128px]">
            {headingOptions.map((h) => (
              <SelectItem key={h.value} value={h.value}>
                {h.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Separator orientation="vertical" className="mx-2 h-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isTagActive("b") ? "secondary" : "ghost"}
              size="icon"
              aria-label="Bold"
              onClick={() => onAction("bold")}
              aria-pressed={isTagActive("b")}
            >
              <Bold size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>B (Ctrl+B)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isTagActive("i") ? "secondary" : "ghost"}
              size="icon"
              aria-label="Italic"
              onClick={() => onAction("italic")}
              aria-pressed={isTagActive("i")}
            >
              <Italic size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>I (Ctrl+I)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isTagActive("u") ? "secondary" : "ghost"}
              size="icon"
              aria-label="Underline"
              onClick={() => onAction("underline")}
              aria-pressed={isTagActive("u")}
            >
              <Underline size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Underline (Ctrl+U)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isTagActive("s") ? "secondary" : "ghost"}
              size="icon"
              aria-label="Strikethrough"
              onClick={() => onAction("strikethrough")}
              aria-pressed={isTagActive("s")}
            >
              <Strikethrough size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Strikethrough</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-2 h-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isTagActive("ul") ? "secondary" : "ghost"}
              size="icon"
              aria-label="Bullet List"
              onClick={() => onAction("bulleted-list")}
              aria-pressed={isTagActive("ul")}
            >
              <List size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bulleted List</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isTagActive("ol") ? "secondary" : "ghost"}
              size="icon"
              aria-label="Numbered List"
              onClick={() => onAction("numbered-list")}
              aria-pressed={isTagActive("ol")}
            >
              <ListOrdered size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Numbered List</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-2 h-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isTagActive("blockquote") ? "secondary" : "ghost"}
              size="icon"
              aria-label="Blockquote"
              onClick={() => onAction("blockquote")}
              aria-pressed={isTagActive("blockquote")}
            >
              <Quote size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Blockquote</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isTagActive("code") ? "secondary" : "ghost"}
              size="icon"
              aria-label="Code"
              onClick={() => onAction("code")}
              aria-pressed={isTagActive("code")}
            >
              <Code size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Code</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Link"
              onClick={() => onAction("link")}
            >
              <Link size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert Link</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
