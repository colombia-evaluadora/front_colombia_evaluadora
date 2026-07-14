import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

type ColorTheme = "emerald" | "blue"

type ColorThemeProviderProps = {
  children: React.ReactNode
  defaultColorTheme?: ColorTheme
  storageKey?: string
}

type ColorThemeProviderState = {
  colorTheme: ColorTheme
  setColorTheme: (colorTheme: ColorTheme) => void
}

const initialState: ColorThemeProviderState = {
  colorTheme: "emerald",
  setColorTheme: () => null,
}

const ColorThemeProviderContext =
  createContext<ColorThemeProviderState>(initialState)

function ColorThemeProvider({
  children,
  defaultColorTheme = "emerald",
  storageKey = "vite-ui-color-theme",
}: ColorThemeProviderProps) {
  const [colorTheme, setColorTheme] = useState<ColorTheme>(
    () => (localStorage.getItem(storageKey) as ColorTheme) || defaultColorTheme
  )

  useEffect(() => {
    const root = window.document.documentElement

    if (colorTheme === "blue") {
      root.setAttribute("data-color-theme", "blue")
    } else {
      root.removeAttribute("data-color-theme")
    }
  }, [colorTheme])

  const value = {
    colorTheme,
    setColorTheme: (colorTheme: ColorTheme) => {
      localStorage.setItem(storageKey, colorTheme)
      setColorTheme(colorTheme)
    },
  }

  return (
    <ColorThemeProviderContext.Provider value={value}>
      {children}
    </ColorThemeProviderContext.Provider>
  )
}

export const useColorTheme = () => {
  const context = useContext(ColorThemeProviderContext)

  if (context === undefined)
    throw new Error("useColorTheme must be used within a ColorThemeProvider")

  return context
}

type ThemeProviderProps = {
  children: React.ReactNode
  defaultColorTheme?: ColorTheme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultColorTheme,
  storageKey,
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      storageKey="vite-ui-theme"
      enableSystem
      disableTransitionOnChange
    >
      <ColorThemeProvider
        defaultColorTheme={defaultColorTheme}
        storageKey={storageKey}
      >
        {children}
      </ColorThemeProvider>
    </NextThemesProvider>
  )
}
