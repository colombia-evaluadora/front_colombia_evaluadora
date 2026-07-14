import { Button } from "@/components/ui/button"
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { ColorThemeToggle } from "@/components/color-theme-toggle"

function App() {
  return (
    <ThemeProvider>
      <div className="flex min-h-svh flex-col items-center justify-center gap-4">
        <div className="flex gap-2">
          <ModeToggle />
          <ColorThemeToggle />
        </div>
        <Button>Click me</Button>
      </div>
    </ThemeProvider>
  )
}

export default App