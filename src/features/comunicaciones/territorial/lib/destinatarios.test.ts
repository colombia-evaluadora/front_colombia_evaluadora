import { describe, expect, it } from "vitest"

import type { DestinosComunicado } from "@/features/comunicaciones/chat/api/types"
import { tiposAbreviados } from "@/features/comunicaciones/comunicados/lib/tipos-destinatario"
import { dirigidoA, tiposTerritorial } from "@/features/comunicaciones/territorial/lib/destinatarios"

const vacio: DestinosComunicado = {
  grados: [],
  grupos: [],
  roles: [],
  usuarios: [],
  gruposChat: [],
  para: "ESTUDIANTES",
}

// QA 427: los comunicados del formulario por documento salían con «—» en Tipos y en Dirigido a.
describe("destinatarios de la consulta territorial", () => {
  const deFuncionarios = {
    audiencia: [],
    destinos: {
      ...vacio,
      conjuntos: [{ tipos: ["FUNCIONARIOS" as const], resumen: "IE Central · Principal · Funcionarios" }],
    },
  }

  it("lee los tipos y el resumen de los conjuntos", () => {
    expect(tiposTerritorial(deFuncionarios)).toEqual(["FUNCIONARIOS"])
    expect(tiposAbreviados(tiposTerritorial(deFuncionarios))).toBe("Func")
    expect(dirigidoA(deFuncionarios)).toBe("IE Central · Principal · Funcionarios")
  })

  it("une varios conjuntos y no repite la audiencia derivada", () => {
    const c = {
      audiencia: ["ESTUDIANTES" as const],
      destinos: {
        ...vacio,
        conjuntos: [
          { tipos: ["ESTUDIANTES" as const], resumen: "Sede Norte · Estudiantes" },
          { tipos: ["FUNCIONARIOS" as const, "ACUDIENTES" as const], resumen: null },
        ],
      },
    }
    expect(dirigidoA(c)).toBe("Sede Norte · Estudiantes; Acudientes, Funcionarios")
    expect(tiposAbreviados(tiposTerritorial(c))).toBe("Toda")
  })

  it("los comunicados del formato anterior se leen igual", () => {
    const c = { audiencia: ["PADRES" as const], destinos: vacio }
    expect(dirigidoA(c)).toBe("Padres de familia")
    expect(tiposTerritorial(c)).toEqual(["PADRES"])
    expect(dirigidoA({ audiencia: [], destinos: null })).toBe("—")
    expect(tiposTerritorial({ audiencia: [], destinos: null })).toEqual([])
  })
})
