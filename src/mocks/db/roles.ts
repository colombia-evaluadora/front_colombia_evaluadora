import type { Role } from "@/features/administration/roles-menus/api/types/role-menu"

// Los ids coinciden con los `roleIds` de `db/navigation.ts`: ahí está, rol por
// rol, qué menús ve cada uno.
export const rolesDb: Role[] = [
  { id: 1, name: "Administrador" },
  { id: 2, name: "Coordinador" },
  { id: 3, name: "Docente" },
  { id: 4, name: "Rector" },
]
