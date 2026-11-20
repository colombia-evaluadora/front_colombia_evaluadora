import type { Role } from "@/features/administration/roles-menus/api/types/role-menu"

// Los ids coinciden con los `roleIds` de `db/navigation.ts`: ahí está, rol por
// rol, qué menús ve cada uno.
export const rolesDb: Role[] = [
  { id: 1, name: "Administrador" },
  { id: 2, name: "Coordinador" },
  { id: 3, name: "Docente" },
  { id: 4, name: "Rector" },
  // Roles de los ejemplos de Vistas por rol (S.3.VRO.1–4); sus vistas se siembran en handlers/roles.ts.
  { id: 5, name: "Responsable de enseñanza" },
  { id: 6, name: "Gestor administrativo del establecimiento" },
  { id: 7, name: "Supervisor territorial" },
  { id: 8, name: "Administrador territorial" },
]
