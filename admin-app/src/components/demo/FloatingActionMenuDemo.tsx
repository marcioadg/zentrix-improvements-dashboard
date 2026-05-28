import FloatingActionMenu from "@/components/ui/floating-action-menu";
import { Settings, User, LogOut } from "lucide-react";
import { logger } from '@/utils/logger';

const FloatingActionMenuDemo = () => {
  return (
    <FloatingActionMenu
      className="relative"
      options={[
        {
          label: "Account",
          Icon: <User className="w-4 h-4" />,
          onClick: () => logger.log("Account clicked"),
        },
        {
          label: "Settings",
          Icon: <Settings className="w-4 h-4" />,
          onClick: () => logger.log("Settings clicked"),
        },
        {
          label: "Logout",
          Icon: <LogOut className="w-4 h-4" />,
          onClick: () => logger.log("Logout clicked"),
        },
      ]}
    />
  );
};

export { FloatingActionMenuDemo };