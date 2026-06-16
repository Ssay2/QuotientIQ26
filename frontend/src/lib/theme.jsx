import React from "react";
import { ThemeProvider as NextThemes, useTheme as useNextTheme } from "next-themes";

export function ThemeProvider({ children }) {
  return (
    <NextThemes attribute="class" defaultTheme="light" enableSystem={false} storageKey="qiq-theme">
      {children}
    </NextThemes>
  );
}

export const useTheme = useNextTheme;
