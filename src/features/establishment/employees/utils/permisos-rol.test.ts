import { describe, expect, it } from "vitest"

import type { PermisoVista } from "@/features/establishment/employees/api/types/rol-asignado"
import {
  agruparPorModulo,
  cambiarPermiso,
  etiquetaPermiso,
  hayCambios,
  toPermisosInput,
} from "@/features/establishment/employees/utils/permisos-rol"

const vista = (menuId: number, parentId: number | null, base: [boolean, boolean, boolean] = [true, true, true]): PermisoVista => ({
  menuId,
  parentId,
  name: `Vista ${menuId}`,
  icon: null,
  baseAccess: base[0],
  baseSave: base[1],
  baseDelete: base[2],
  access: base[0],
  save: base[1],
  delete: base[2],
})

const arbol = [vista(1, null), vista(11, 1), vista(12, 1, [true, false, false]), vista(2, null)]
const de = (vistas: PermisoVista[], id: number) => vistas.find((v) => v.menuId === id)!

describe("permisos de un rol asignado", () => {
  it("agrupa los submódulos bajo su módulo", () => {
    expect(agruparPorModulo(arbol).map((m) => [m.modulo.menuId, m.submodulos.map((s) => s.menuId)])).toEqual([
      [1, [11, 12]],
      [2, []],
    ])
  })

  it("sin Acceso no quedan Guardar ni Eliminar", () => {
    const r = cambiarPermiso(arbol, 11, "access", false)
    expect(de(r, 11)).toMatchObject({ access: false, save: false, delete: false })
  })

  it("apagar un permiso del módulo lo apaga en sus submódulos", () => {
    const r = cambiarPermiso(arbol, 1, "save", false)
    expect([de(r, 1).save, de(r, 11).save, de(r, 12).save]).toEqual([false, false, false])
    expect(de(r, 2).save).toBe(true)
  })

  it("encender en el módulo devuelve a los submódulos lo que da el rol, nunca más", () => {
    const r = cambiarPermiso(cambiarPermiso(arbol, 1, "access", false), 1, "access", true)
    expect(de(r, 11).access).toBe(true)
    const g = cambiarPermiso(cambiarPermiso(arbol, 1, "save", false), 1, "save", true)
    expect(de(g, 11).save).toBe(true)
    expect(de(g, 12).save).toBe(false)
  })

  it("no se da lo que el rol no tiene, ni un submódulo gana lo que su módulo perdió", () => {
    expect(de(cambiarPermiso(arbol, 12, "save", true), 12).save).toBe(false)
    const sinModulo = cambiarPermiso(arbol, 1, "access", false)
    expect(de(cambiarPermiso(sinModulo, 11, "access", true), 11).access).toBe(false)
  })

  it("Guardar enciende el Acceso de la vista", () => {
    const r = cambiarPermiso(cambiarPermiso(arbol, 11, "access", false), 11, "save", true)
    expect(de(r, 11)).toMatchObject({ access: true, save: true })
  })

  it("etiquetas: Sin acceso, Parcial y Solo lectura", () => {
    expect(etiquetaPermiso(de(arbol, 1), [de(arbol, 11), de(arbol, 12)])).toBeNull()
    expect(etiquetaPermiso(de(arbol, 12))).toBe("Solo lectura")
    const r = cambiarPermiso(arbol, 11, "delete", false)
    expect(etiquetaPermiso(de(r, 1), [de(r, 11), de(r, 12)])).toBe("Parcial")
    expect(etiquetaPermiso(de(r, 11))).toBe("Parcial")
    expect(etiquetaPermiso(de(cambiarPermiso(arbol, 2, "access", false), 2))).toBe("Sin acceso")
  })

  it("arma el cuerpo y detecta cambios", () => {
    const r = cambiarPermiso(arbol, 2, "delete", false)
    expect(hayCambios(arbol, arbol)).toBe(false)
    expect(hayCambios(arbol, r)).toBe(true)
    expect(toPermisosInput(r).find((p) => p.menu === 2)).toEqual({ menu: 2, acceso: true, guardar: true, eliminar: false })
  })
})
