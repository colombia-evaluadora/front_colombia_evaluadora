import * as PhosphorIcons from "@phosphor-icons/react"
import { QuestionIcon, type Icon } from "@phosphor-icons/react"

const iconRegistry = PhosphorIcons as unknown as Record<string, Icon>

export function getNavIcon(iconName: string): Icon {
  const componentName = iconName.replace(/-/g, "")
  const Icon = iconRegistry[componentName]

  if (!Icon) {
    console.warn(`[navigation] ícono desconocido del backend: "${iconName}"`)
    return QuestionIcon
  }

  return Icon
}
