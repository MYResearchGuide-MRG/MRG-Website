/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from "react"

// MYSSP uses a fixed dark theme, including when a visitor previously saved light mode.
const darkTheme = { theme: "dark", resolvedTheme: "dark" } as const
const ThemeContext = createContext(darkTheme)

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={darkTheme}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
