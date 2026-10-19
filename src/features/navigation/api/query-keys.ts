const all = ["navigation"] as const

export const navigationKeys = {
  all,
  menu: [...all, "menu"] as const,
  permisosMenu: [...all, "permisos-menu"] as const,
} as const
