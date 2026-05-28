import ClarityBreakView from "@/components/tools/ClarityBreak/ClarityBreakView";
import ClarityBreakHistory from "@/components/tools/ClarityBreak/ClarityBreakHistory";
import { useClarityBreaks } from "@/hooks/useClarityBreaks";

export default function ClarityBreakJournal() {
  const clarityBreaksHook = useClarityBreaks();
  
  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col gap-4 sm:gap-8">
      <ClarityBreakView clarityBreaksHook={clarityBreaksHook} />
      <ClarityBreakHistory clarityBreaksHook={clarityBreaksHook} />
    </div>
  );
}
