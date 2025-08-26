"use client";

import { useTheme} from "next-themes";
 import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();

   return (
     <Sonner
       theme={theme}
      className="toaster group"
      style={{
         "--normal-bg": "hsl(var(--popover))",
         "--normal-text": "hsl(var(--popover-foreground))",
         "--normal-border": "hsl(var(--border))",
       }}
      {...props}
    />
  );
};

export { Toaster };
