import { describe, expect, it } from "vitest"

import {
  aCuerpoSeleccion,
  etiquetaOpcion,
  haySeleccionGrupal,
  resumenSeleccion,
  SELECCION_VACIA,
  textoConfirmacion,
  textoYaEnElGrupo,
} from "@/features/comunicaciones/chat/lib/seleccion-grupal"
import { POLITICA_CHAT_SUGERIDA, puedeNombrarAdministradores } from "@/features/comunicaciones/chat/lib/politica-chat"

const sexto = { valor: "Sexto", etiqueta: "Sexto", total: 64 }
const g601 = { valor: "501", etiqueta: "Sexto 601", detalle: "Principal", total: 32 }
const docente = { valor: "Docente", etiqueta: "Docente", total: 18 }

describe("selección grupal de un grupo", () => {
  it("arma el cuerpo sin duplicados: grupos por pk numérico, personas por id", () => {
    const cuerpo = aCuerpoSeleccion({ grados: [sexto, sexto], grupos: [g601], roles: [docente] }, [
      { id: 7 },
      { id: 7 },
      { id: 9 },
    ])
    expect(cuerpo).toEqual({ GRADOS: ["Sexto"], GRUPOS: [501], ROLES: ["Docente"], USUARIOS: [7, 9], PARA: "ESTUDIANTES" })
    expect(aCuerpoSeleccion(SELECCION_VACIA)).toEqual({ GRADOS: [], GRUPOS: [], ROLES: [], USUARIOS: [], PARA: "ESTUDIANTES" })
    expect(aCuerpoSeleccion({ ...SELECCION_VACIA, grados: [sexto], para: "ACUDIENTES" }).PARA).toBe("ACUDIENTES")
  })

  it("solo hay selección grupal con algún grado, grupo o rol", () => {
    expect(haySeleccionGrupal(SELECCION_VACIA)).toBe(false)
    expect(haySeleccionGrupal({ ...SELECCION_VACIA, roles: [docente] })).toBe(true)
  })

  it("confirma con el conteo", () => {
    expect(textoConfirmacion(32)).toBe("Se agregarán 32 personas.")
    expect(textoConfirmacion(1)).toBe("Se agregará 1 persona.")
    expect(textoConfirmacion(0)).toBe("No hay personas nuevas para agregar.")
    // Acudientes: invitación (una por acudiente), no alta directa.
    expect(textoConfirmacion(5, 2)).toBe("Se agregarán 3 personas y se invitará a 2 acudientes.")
    expect(textoConfirmacion(1, 1)).toBe("Se invitará a 1 acudiente.")
    expect(textoConfirmacion(12, 12)).toBe("Se invitará a 12 acudientes.")
    expect(textoYaEnElGrupo(0)).toBeNull()
    expect(textoYaEnElGrupo(1)).toBe("1 persona ya está en el grupo.")
    expect(textoYaEnElGrupo(3)).toBe("3 personas ya están en el grupo.")
  })

  it("resume lo elegido con la sede del grupo", () => {
    expect(etiquetaOpcion(g601)).toBe("Sexto 601 · Principal")
    expect(resumenSeleccion({ grados: [sexto], grupos: [g601], roles: [docente] }, 2)).toBe(
      "Grado Sexto, grupo Sexto 601 · Principal, rol Docente, 2 personas elegidas",
    )
    expect(resumenSeleccion({ ...SELECCION_VACIA, grados: [sexto], para: "AMBOS" })).toBe(
      "Grado Sexto, estudiantes y acudientes",
    )
  })
})

describe("administradores adicionales (decisión de Natalia)", () => {
  it("en un grupo no se nombran salvo que la política lo permita; en un foro sí", () => {
    expect(puedeNombrarAdministradores(POLITICA_CHAT_SUGERIDA, "GRUPO")).toBe(false)
    expect(puedeNombrarAdministradores({ grupos: undefined }, "GRUPO")).toBe(false)
    expect(
      puedeNombrarAdministradores(
        { grupos: { ...POLITICA_CHAT_SUGERIDA.grupos!, administradoresAdicionales: true } },
        "GRUPO",
      ),
    ).toBe(true)
    expect(puedeNombrarAdministradores(POLITICA_CHAT_SUGERIDA, "CANAL")).toBe(true)
  })
})
