
import React from "react";
import Strategy from "@/pages/Strategy";

export const QuarterlyStrategySection: React.FC = () => (
  <div className="py-4 flex flex-col h-full">
    <h2 className="text-2xl font-bold mb-4">Review Strategy &amp; Execution</h2>
    {/* Render the /strategy page content with execution tab active */}
    {/* Container with max-height to enable scrolling within meeting context */}
    <div className="flex-1 overflow-hidden">
      <Strategy initialTab="execution" />
    </div>
  </div>
);

export default QuarterlyStrategySection;
