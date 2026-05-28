import { User } from "lucide-react";

interface UnassignedAvatarProps {
  size?: "sm" | "md" | "lg";
}

export const UnassignedAvatar = ({ size = "md" }: UnassignedAvatarProps) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-10 h-10"
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-muted flex items-center justify-center border border-border`}>
      <User className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} text-muted-foreground`} />
    </div>
  );
};