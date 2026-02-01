import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

export function GradientButton({
  variant = "primary",
  children,
  className,
  as: Component = "button",
  ...props
}: GradientButtonProps) {
  if (variant === "primary") {
    return (
      <Component
        className={cn(
          "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium text-base shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:from-indigo-600 disabled:hover:to-purple-600 flex items-center justify-center gap-2",
          className
        )}
        {...(props as any)}
      >
        {children}
      </Component>
    );
  }

  return (
    <Component
      className={cn(
        "bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-lg font-medium text-base transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2",
        className
      )}
      {...(props as any)}
    >
      {children}
    </Component>
  );
}
