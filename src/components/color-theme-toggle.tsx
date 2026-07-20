import { PaletteIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useColorTheme } from "@/components/theme-provider"

export function ColorThemeToggle() {
  const { setColorTheme } = useColorTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
        <PaletteIcon className="size-[1.2rem]" />
        <span className="sr-only">Cambiar paleta de color</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setColorTheme("emerald")}>
            Emerald
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setColorTheme("red")}>
            Red
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
