import { describe, expect, it } from "vitest"

import { toInstrumentoActividadParaForm } from "@/features/planeador/api/query/use-instrumento-actividad-form-query"

type Row = Parameters<typeof toInstrumentoActividadParaForm>[0]

const rubrica: Row = {
  instrumento: "RUBRICA",
  definicion: [
    {
      nombre: "Criterio sin pk",
      niveles: [
        { etiqueta: "Excelente", descripcion: "Top" },
        { etiqueta: "Bueno" },
        { pk: 77, etiqueta: "Regular" },
      ],
    },
    { pk: 12, nombre: "Criterio con pk", niveles: [{ etiqueta: "Bueno" }] },
  ],
}

describe("toInstrumentoActividadParaForm — ids sintéticos", () => {
  it("respeta el pk real y asigna negativos únicos a lo que no lo trae", () => {
    const { rubrica: r } = toInstrumentoActividadParaForm(rubrica)
    const [c1, c2] = r.criterios
    expect(c2.id).toBe(12)
    expect(c1.niveles.find((n) => n.nombre === "Regular")?.id).toBe(77)

    const sinteticos = [c1.id, c1.niveles[0].id, c2.niveles[0].id]
    for (const id of sinteticos) expect(id).toBeLessThan(0)
    expect(new Set(sinteticos).size).toBe(sinteticos.length)
  })

  it("no arrastra estado entre conversiones", () => {
    const a = toInstrumentoActividadParaForm(rubrica)
    const b = toInstrumentoActividadParaForm(rubrica)
    expect(b).toEqual(a)
  })

  it("lista de cotejo: items sin pk con ids negativos únicos", () => {
    const { listaCotejo } = toInstrumentoActividadParaForm({
      instrumento: "LISTA_COTEJO",
      definicion: [{ descripcion: "a" }, { descripcion: "b" }, { pk: 5, descripcion: "c" }],
    })
    expect(listaCotejo.items.map((i) => i.id)).toEqual([-1, -2, 5])
  })
})
