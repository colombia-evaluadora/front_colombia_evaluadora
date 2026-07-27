import type { Icon } from "@/components/ui/icons"

export interface NavSubItemDto {
  title: string
  url: string
}

// Forma cruda tal como la manda el backend: `icon` es texto
// (ej. "Squares-Four-Icon"), todavía sin resolver a un componente.
export interface NavItemDto {
  title: string
  url: string
  icon: string
  items?: NavSubItemDto[]
}

export type NavSubItem = NavSubItemDto

// Forma ya resuelta que consume la UI: `icon` es el componente listo
// para renderizar. La resolución pasa en use-nav-items-query.ts.
export interface NavItem {
  title: string
  url: string
  icon: Icon
  items?: NavSubItem[]
}

// Forma real del backend SSO (GET /sso-admin/myMenu?app=): lista plana,
// jerarquía vía `idParent`, ya filtrada por rol del lado del servidor.
export interface RouteResponseDto {
  id: number
  name: string
  icon: string
  path: string
  menuOrder: number
  type: string
  idParent: number | null
  roleIds: number[]
}
