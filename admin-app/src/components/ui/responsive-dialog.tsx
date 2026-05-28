import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function ResponsiveDialog({ open, onOpenChange, children }: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {children}
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  );
}

interface ResponsiveDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveDialogContent({ children, className }: ResponsiveDialogContentProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerContent className={className}>
        {children}
      </DrawerContent>
    );
  }

  return (
    <DialogContent className={className}>
      {children}
    </DialogContent>
  );
}

interface ResponsiveDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveDialogHeader({ children, className }: ResponsiveDialogHeaderProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerHeader className={className}>
        {children}
      </DrawerHeader>
    );
  }

  return (
    <DialogHeader className={className}>
      {children}
    </DialogHeader>
  );
}

interface ResponsiveDialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveDialogTitle({ children, className }: ResponsiveDialogTitleProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerTitle className={className}>
        {children}
      </DrawerTitle>
    );
  }

  return (
    <DialogTitle className={className}>
      {children}
    </DialogTitle>
  );
}

interface ResponsiveDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveDialogDescription({ children, className }: ResponsiveDialogDescriptionProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerDescription className={className}>
        {children}
      </DrawerDescription>
    );
  }

  return (
    <DialogDescription className={className}>
      {children}
    </DialogDescription>
  );
}
