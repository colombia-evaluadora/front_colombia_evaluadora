import * as PhosphorIcons from "@/components/ui/icons"
import { QuestionIcon, type Icon } from "@/components/ui/icons"

const iconRegistry = PhosphorIcons as unknown as Record<string, Icon>

// Normaliza varias convenciones de nombre al export PascalCase+Icon del
// barrel de íconos: la del mock ("Credit-Card-Icon"), la del backend real
// —minúsculas y sin sufijo ("user", "book")— y camelCase pegado sin
// separadores ("IdentificationCard-Icon").
export function getNavIcon(iconName: string): Icon {
  const pascal = iconName
    .split(/[-_\s]+|(?<=[a-z0-9])(?=[A-Z])/)
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
