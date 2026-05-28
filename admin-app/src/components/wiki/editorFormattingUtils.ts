import { logger } from '@/utils/logger';
/**
 * Modern formatting utilities for ProcessEditor.
 * Reliably manipulates selections and supports headings, lists, and toggle logic.
 * All operations run on the live selection inside a contentEditable element.
 */

// Improved: get block at selection focus for block commands
function getCurrentBlock(selection: Selection): HTMLElement | null {
  let node = selection.anchorNode;
  if (!node) return null;
  // climb up for nodes inside inline/formatting spans
  while (node && node.nodeType !== 1) node = node.parentNode;
  if (!node) return null;
  let el = node as HTMLElement;
  // Find block parent (div, p, li, heading, blockquote)
  while (
    el &&
    !/^(DIV|P|LI|H1|H2|H3|BLOCKQUOTE)$/i.test(el.tagName) &&
    el.parentElement
  ) {
    el = el.parentElement;
  }
  return el ?? null;
}

// Inline formatting
function formatWithTag(tagName: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  const wrapper = document.createElement(tagName);
  wrapper.appendChild(range.extractContents());
  range.insertNode(wrapper);

  // Reselect original content for better UX
  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(wrapper);
  sel.addRange(newRange);
}

// MARK: Toggle inline formatting
export function toggleBold() { formatWithTag("b"); }
export function toggleItalic() { formatWithTag("i"); }
export function toggleUnderline() { formatWithTag("u"); }
export function toggleStrikethrough() { formatWithTag("s"); }
export function toggleCode() { formatWithTag("code"); }
export function toggleBlockquote() { formatWithTag("blockquote"); }

// MARK: Block-level formatting (handles no selection: formats line at cursor)
export function setFormatBlock(tag: "p" | "h1" | "h2" | "h3") {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    logger.warn("No valid selection found in setFormatBlock");
    return;
  }
  const block = getCurrentBlock(sel);
  if (!block) {
    logger.warn("No block found at current selection in setFormatBlock");
    return;
  }

  // Remove the early return so the command always executes
  // If already the right tag, do nothing extra but log for debug
  if (block.tagName.toLowerCase() === tag) {
    // Still call focus and selection logic for UX
    if (block instanceof HTMLElement) {
      block.focus?.();
    }
    // It's already the expected format, skip re-tagging
    return;
  }

  // Don't wrap top-level list items or blockquotes in different block tags
  if (/^(LI)$/i.test(block.tagName)) {
    // Just replace the parent's tag (li's parent: ul/ol)
    const parent = block.parentElement;
    if (parent && /^(UL|OL)$/i.test(parent.tagName)) {
      // Unwrap from list
      const p = document.createElement(tag);
      p.innerHTML = block.innerHTML;
      parent.parentNode?.insertBefore(p, parent);
      block.remove();
      // Remove parent if empty
      if (parent.children.length === 0) parent.remove();
      // Reselect new block
      sel.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(p);
      sel.addRange(range);
      // Ensure focus for accessibility
      p.focus?.();
      logger.log("Unwrapped list and set new block tag:", tag);
      return;
    }
  }

  // replace current block with new tag
  const newBlock = document.createElement(tag);
  newBlock.innerHTML = block.innerHTML;
  block.parentNode?.replaceChild(newBlock, block);

  // Reselect for a11y/UX
  sel.removeAllRanges();
  const range = document.createRange();
  range.selectNodeContents(newBlock);
  sel.addRange(range);

  // Ensure focus is on the new block
  newBlock.focus?.();
  logger.log("Applied format block:", tag);
}

// List formatting -- works with (no selection or selection) to line(s)
export function insertList(listType: "ul" | "ol") {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  let block = getCurrentBlock(sel);

  // If in list: remove (toggle list off, move content to <p>)
  if (block && /^(UL|OL)$/i.test(block.tagName)) {
    const list = block;
    const ps: HTMLElement[] = [];
    Array.from(list.querySelectorAll("li")).forEach(li => {
      const p = document.createElement("p");
      p.innerHTML = li.innerHTML;
      ps.push(p);
    });
    // Insert new <p>s before list
    ps.forEach(p => list.parentNode?.insertBefore(p, list));
    list.parentNode?.removeChild(list);
    // Reselect new elements
    sel.removeAllRanges();
    const r = document.createRange();
    r.selectNode(ps[0]);
    sel.addRange(r);
    return;
  }

  const range = sel.getRangeAt(0);

  // No selection: wrap current line in list
  if (sel.isCollapsed) {
    let node = sel.anchorNode;
    while (node && node.nodeType !== 1) node = node.parentNode;
    if (!node) return;
    let line = node as HTMLElement;
    while (
      line &&
      !/^(DIV|P|H1|H2|H3|BLOCKQUOTE)$/i.test(line.tagName) &&
      line.parentElement
    ) {
      line = line.parentElement;
    }
    if (!line) return;

    // Replace block with list
    const list = document.createElement(listType);
    const li = document.createElement("li");
    li.innerHTML = line.innerHTML;
    list.appendChild(li);
    line.parentNode?.replaceChild(list, line);
    // Reselect
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(li);
    sel.addRange(newRange);
    return;
  }

  // Has selection: wrap all lines within range as <li>
  const htmlFrag = range.cloneContents();
  const tempDiv = document.createElement("div");
  tempDiv.appendChild(htmlFrag);
  // split by <br> or <div> for each "line"
  let lines = tempDiv.innerHTML
    .replace(/<div>/gi, "")
    .replace(/<\/div>/gi, "<br>")
    .split(/<br\s*\/?>/gi)
    .filter(l => l.trim().length > 0);

  const list = document.createElement(listType);
  lines.forEach(line => {
    const li = document.createElement("li");
    li.innerHTML = line;
    list.appendChild(li);
  });
  // replace selection with list
  range.deleteContents();
  range.insertNode(list);
  // Reselect list
  sel.removeAllRanges();
  try {
    const newRange = document.createRange();
    newRange.selectNodeContents(list);
    sel.addRange(newRange);
  } catch {}
}

// -- Link insertion --
export function insertLink(linkUrl?: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);

  const url = linkUrl ?? window.prompt("Enter URL for link:", "https://") ?? "";
  if (!url) return;

  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener noreferrer";
  a.target = "_blank";
  a.appendChild(range.extractContents());
  range.insertNode(a);

  // Reselect link
  selection.removeAllRanges();
  const nrange = document.createRange();
  nrange.selectNodeContents(a);
  selection.addRange(nrange);
}

// MARK: Is tag at selection active (robust)
export function isTagActive(tag: string): boolean {
  const selection = window.getSelection();
  if (!selection) return false;
  let node: Node | null = selection.anchorNode;

  // special block-level case: for headings/lists on block
  if (/^h[1-6]$|^p$|^ul$|^ol$|^blockquote$/i.test(tag)) {
    while (node && node.nodeType !== 1) node = node.parentNode;
    if (!node) return false;
    let el = node as HTMLElement;
    while (
      el &&
      !/^(DIV|P|LI|H1|H2|H3|BLOCKQUOTE|UL|OL)$/i.test(el.tagName) &&
      el.parentElement
    ) {
      el = el.parentElement;
    }
    return el && el.tagName.toLowerCase() === tag.toLowerCase();
  }

  // for inline
  while (node) {
    if (
      node.nodeType === 1 &&
      (node as HTMLElement).tagName?.toLowerCase() === tag.toLowerCase()
    ) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}

// Block type at (focus) selection for toolbar select
export function getActiveBlockType(): string {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return "paragraph";
  let node: Node | null = sel.anchorNode;
  while (node && node.nodeType !== 1) node = node.parentNode;
  if (!node) return "paragraph";
  const block = node as HTMLElement;
  const t = block.tagName.toLowerCase();
  if (t === "h1") return "heading1";
  if (t === "h2") return "heading2";
  if (t === "h3") return "heading3";
  if (t === "p") return "paragraph";
  return "paragraph";
}
