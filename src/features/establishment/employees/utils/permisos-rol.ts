import type { PermisoVista } from "@/features/establishment/employees/api/types/rol-asignado"
import type { PermisoRolInput } from "@/features/establishment/employees/api/mutations/roles-funcionario"

// Restricciones de un rol asignado (Sección 4.2, Reglas 25 y 82). Solo se restringe: lo que el rol
// no da queda apagado y bloqueado. Sin Acceso no hay Guardar ni Eliminar, y lo que se apaga en un
// módulo se apaga en todos sus submódulos. El backend vuelve a aplicar las mismas reglas al guardar.

export type CampoPermiso = "access" | "save" | "delete"

const BASE: Record<CampoPermiso, "baseAccess" | "baseSave" | "baseDelete"> = {
  access: "baseAccess",
  save: "baseSave",
  delete: "baseDelete",
}

/** El rol da este permiso en la vista: si no, el switch va bloqueado. */
export const rolLoDa = (vista: PermisoVista, campo: CampoPermiso) => vista[BASE[campo]]

export interface ModuloPermisos {
  modulo: PermisoVista
  submodulos: PermisoVista[]
}

/** Módulos con sus submódulos, en el orden en que llegan (el backend ya los ordena). */
export function agruparPorModulo(vistas: PermisoVista[]): ModuloPermisos[] {
  const modulos = vistas.filter((v) => v.parentId == null)
  return modulos.map((modulo) => ({ modulo, submodulos: vistas.filter((v) => v.parentId === modulo.menuId) }))
}

function ajustar(vista: PermisoVista, campo: CampoPermiso, valor: boolean): PermisoVista {
  const next = { ...vista, [campo]: valor && rolLoDa(vista, campo) }
  if (campo === "access" && !valor) {
    next.save = false
    next.delete = false
  }
  // Guardar o Eliminar sin Acceso no tiene sentido: lo enciende.
  if (campo !== "access" && valor && rolLoDa(vista, campo)) next.access = true
  return next
}

/**
 * Cambia un permiso de una vista. En un módulo el cambio baja a sus submódulos: apagar los apaga
 * todos; encender los devuelve a lo que da el rol en ese permiso.
 */
export function cambiarPermiso(vistas: PermisoVista[], menuId: number, campo: CampoPermiso, valor: boolean): PermisoVista[] {
  const vista = vistas.find((v) => v.menuId === menuId)
  if (!vista) return vistas
  const padre = vista.parentId == null ? null : vistas.find((v) => v.menuId === vista.parentId)
  // Un submódulo no gana lo que su módulo no tiene.
  if (valor && padre && !padre.access) return vistas
  return vistas.map((v) => {
    if (v.menuId === menuId) return ajustar(v, campo, valor)
    if (v.parentId === menuId) return ajustar(v, campo, valor)
    return v
  })
}

export type EtiquetaPermiso = "Sin acceso" | "Solo lectura" | "Parcial"

/**
 * Badge de una fila. Sin acceso; Parcial si es un módulo con submódulos restringidos o un
 * submódulo con menos de lo que da el rol; Solo lectura si queda con Acceso y nada más.
 */
export function etiquetaPermiso(vista: PermisoVista, submodulos: PermisoVista[] = []): EtiquetaPermiso | null {
  if (!vista.access) return "Sin acceso"
  const recortada = (v: PermisoVista) =>
    v.access !== v.baseAccess || v.save !== v.baseSave || v.delete !== v.baseDelete
  if (submodulos.some(recortada)) return "Parcial"
  if (!vista.save && !vista.delete) return "Solo lectura"
  if (recortada(vista)) return "Parcial"
  return null
}

export const toPermisosInput = (vistas: PermisoVista[]): PermisoRolInput[] =>
  vistas.map((v) => ({ menu: v.menuId, acceso: v.access, guardar: v.save, eliminar: v.delete }))

export const hayCambios = (original: PermisoVista[], actual: PermisoVista[]) =>
  actual.some((v) => {
    const o = original.find((x) => x.menuId === v.menuId)
    return !o || o.access !== v.access || o.save !== v.save || o.delete !== v.delete
  })
