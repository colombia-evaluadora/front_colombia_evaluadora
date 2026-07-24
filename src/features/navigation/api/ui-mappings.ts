import * as PhosphorIcons from "@/components/ui/icons"
import { QuestionIcon, type Icon } from "@/components/ui/icons"

const iconRegistry = PhosphorIcons as unknown as Record<string, Icon>

// Normaliza dos convenciones de nombre distintas al export PascalCase+Icon
// que usa phosphor-react: la del mock ("Credit-Card-Icon") y la del backend
// real, en minúsculas y sin sufijo ("user", "book").
export function getNavIcon(iconName: string): Icon {
  const pascal = iconName
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join("")
  const componentName = pascal.endsWith("Icon") ? pascal : `${pascal}Icon`
  const Icon = iconRegistry[componentName]

  if (!Icon) {
    console.warn(`[navigation] ícono desconocido del backend: "${iconName}"`)
    return QuestionIcon
  }

  return Icon
}
