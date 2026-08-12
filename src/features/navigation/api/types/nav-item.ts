import type { Icon } from "@/components/ui/icons"

// Cuántas líneas ocupa la etiqueta antes de cortarse con "…". Lo decide el
// backend (hoy el mock) porque depende del largo real de cada nombre, que es
// dato, no diseño. `undefined` cae en el default de la UI (1 línea); `0`
// desactiva el corte y deja que el título envuelva completo.
export type NavMaxLines = 0 | 1 | 2 | 3 | 4

export interface NavSubItemDto {
  title: string
  url: string
  maxLines?: NavMaxLines
}

// Forma cruda tal como la manda el backend: `icon` es texto
// (ej. "Squares-Four-Icon"), todavía sin resolver a un componente.
export interface NavItemDto {
  title: string
  url: string
  icon: string
  maxLines?: NavMaxLines
  items?: NavSubItemDto[]
}

export type NavSubItem = NavSubItemDto

// Forma ya resuelta que consume la UI: `icon` es el componente listo
// para renderizar. La resolución pasa en use-nav-items-query.ts.
export interface NavItem {
  title: string
  url: string
  icon: Icon
  maxLines?: NavMaxLines
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
  maxLines?: NavMaxLines
}
