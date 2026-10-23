const menus = ["menus"] as const
const roleMenus = ["role-menus"] as const

export const roleMenuKeys = {
  roles: ["roles"] as const,
  plans: ["plans"] as const,
  menus: {
    all: menus,
    // cuelga de menus: crear/editar/eliminar/reordenar ya la invalidan
    catalogo: [...menus, "catalogo"] as const,
  },
  roleMenus: {
    all: roleMenus,
    detalle: (roleId: number | null) => [...roleMenus, roleId] as const,
    funcionariosTotal: (roleId: number | null) => [...roleMenus, roleId, "funcionarios-total"] as const,
  },
} as const
