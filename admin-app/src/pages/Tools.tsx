import React, { useState, useEffect } from 'react';
import { ToolsLayout } from "@/components/tools/ToolsLayout";
import { VersionBanner } from '@/components/ui/VersionBanner';

const Tools = () => {
  return (
    <>
      <VersionBanner />
      
      <ToolsLayout />
    </>
  );
};
export default Tools;
