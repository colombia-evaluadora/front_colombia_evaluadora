import type { NavItemDto } from "@/features/navigation/api/types/nav-item"

export const navigationMenu: NavItemDto[] = [
  { title: "Pagos", url: "/app", icon: "Credit-Card-Icon" },
  {
    title: "Reportes",
    url: "/app/reportes",
    icon: "Chart-Bar-Icon",
    items: [
      { title: "Ingresos", url: "/app/reportes/ingresos" },
      { title: "Reembolsos", url: "/app/reportes/reembolsos" },
    ],
  },
  {
    title: "Usuarios",
    url: "/app/usuarios",
    icon: "Users-Icon",
    items: [
      { title: "Equipo", url: "/app/usuarios/equipo" },
      { title: "Roles", url: "/app/usuarios/roles" },
    ],
  },
  { title: "Configuración", url: "/app/configuracion", icon: "Gear-Icon" },
]
