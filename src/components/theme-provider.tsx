import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

// Las 4 combinaciones del design system, sincronizadas con Figma.
// Un solo atributo `data-theme` en `<html>` para que el CSS de `index.css`
// pueda usar selectores simples (`[data-theme="red-dark"]`) sin combinar
// `.dark` + `[data-color-theme='red']` — que es la fuente del bug previo.
type Theme = "default-light" | "default-dark" | "red-light" | "red-dark"

type ColorTheme = "default" | "red"
type Mode = "light" | "dark"

type ColorThemeProviderState = {
  theme: Theme
  palette: ColorTheme
  mode: Mode
  setPalette: (palette: ColorTheme) => void
  setMode: (mode: Mode) => void
}

const initialState: ColorThemeProviderState = {
  theme: "default-light",
  palette: "default",
  mode: "light",
  setPalette: () => null,
  setMode: () => null,
}

const ColorThemeProviderContext =
  createContext<ColorThemeProviderState>(initialState)

function ColorThemeProvider({
  children,
  defaultColorTheme = "default",
  storageKey = "vite-ui-color-theme",
}: {
  children: React.ReactNode
  defaultColorTheme?: ColorTheme
  storageKey?: string
}) {
  const [palette, setPaletteState] = useState<ColorTheme>(
    () => (localStorage.getItem(storageKey) as ColorTheme) || defaultColorTheme
  )

  const { resolvedTheme } = useTheme()
  const mode: Mode = resolvedTheme === "dark" ? "dark" : "light"

  const theme: Theme = `${palette}-${mode}` as Theme

  useEffect(() => {
    const root = window.document.documentElement
    root.setAttribute("data-theme", theme)
  }, [theme])

  const value: ColorThemeProviderState = {
    theme,
    palette,
    mode,
    setPalette: (palette) => {
      localStorage.setItem(storageKey, palette)
      setPaletteState(palette)
    },
    setMode: () => {
      // `setMode` lo maneja NextThemesProvider vía `attribute="class"`.
      // Esta función queda como no-op para mantener la API del context.
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