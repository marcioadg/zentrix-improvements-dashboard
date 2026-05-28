
import DelegateElevateGrid from "@/components/tools/DelegateElevate/DelegateElevateGrid";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DelegateElevateProps {
  inMeeting?: boolean;
  onRenderButtons?: (buttons: React.ReactNode) => void;
}

export default function DelegateElevate({ inMeeting, onRenderButtons }: DelegateElevateProps = {}) {
  const content = (
    <>
      {!inMeeting && (
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2">Delegate & Elevate</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Organize your tasks by how much you love them and how good you are at them
          </p>
        </div>
      )}
      <DelegateElevateGrid inMeeting={inMeeting} onRenderButtons={onRenderButtons} />
    </>
  );

  if (inMeeting) {
    return (
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="max-w-7xl mx-auto pt-3 px-3 md:pt-6 md:px-6 lg:pt-8 lg:px-8">
          {content}
        </div>
      </ScrollArea>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-6 lg:p-8">
      {content}
    </div>
  );
}
