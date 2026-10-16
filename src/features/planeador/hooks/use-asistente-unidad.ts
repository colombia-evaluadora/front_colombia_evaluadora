import { aTexto, resaltarElemento, resolverOpcion } from "@/features/assistant/lib/campos-ui"
import { useFormularioAsistente } from "@/features/assistant/lib/registro-ui"
import type { UnidadDraft } from "@/features/planeador/components/forms/form-unidad-info-general"
import type { MetodoCalculo } from "@/features/planeador/api/types/unidad-tematica"

// Registro de `planeador.unidad` (ai.ui_formulario, origen DB, V557.2) para
// la UI asistida: "Información general" de la unidad.
//
// Nombres alineados con `editar_unidad_planeador` (BODY.NOMBRE,
// BODY.DESCRIPCION, BODY.OBJETIVOS, BODY.FK_TLV_CALCULO_DEFINITIVA →
// `metodoCalculo`). `objetivos` viaja como texto con un objetivo por línea
// (el form los guarda como lista). Grado/Asignatura (cascada con el
// referente) y contenidos/enunciados (listas con su propio editor) quedan
// afuera. Todos los cambios llegan en UN solo `onChange` porque la página
// de edición arma el patch sobre el estado del render (`{...current, ...}`):
// varios `onChange` seguidos se pisarían entre sí.

interface Opciones {
  draft: UnidadDraft
  onChange: (patch: Partial<UnidadDraft>) => void
  /** Id de la unidad que se edita; `undefined` en altas. */
  unidadId?: number
  metodosCalculo: { valor: MetodoCalculo; etiqueta: string }[]
}

const ELEMENTOS: Record<string, string> = {
  nombre: "unidad-nombre",
  descripcion: "unidad-descripcion",
  metodoCalculo: "unidad-metodo-calculo",
}

export function useAsistenteUnidad({ draft, onChange, unidadId, metodosCalculo }: Opciones) {
  function patchDe(nombre: string, valor: unknown): Partial<UnidadDraft> | null {
    switch (nombre) {
      case "nombre":
        return { nombre: aTexto(valor).slice(0, 50) }
      case "descripcion":
        return { descripcion: aTexto(valor).slice(0, 500) }
      case "objetivos": {
        const lista = Array.isArray(valor) ? valor.map(aTexto) : aTexto(valor).split(/\r?\n/)
        return { objetivos: lista.map((o) => o.trim()).filter(Boolean) }
      }
      case "metodoCalculo": {
        const v = resolverOpcion(metodosCalculo, valor)
        return v ? { metodoCalculo: v as MetodoCalculo } : null
      }
      default:
        return null
    }
  }

  useFormularioAsistente({
    codigo: "planeador.unidad",
    entidad: unidadId != null ? String(unidadId) : "",
    campos: () => [
      { nombre: "nombre", etiqueta: "Nombre", tipo: "text", obligatorio: true, valor: draft.nombre },
      { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea", valor: draft.descripcion },
      { nombre: "objetivos", etiqueta: "Objetivos específicos (uno por línea)", tipo: "textarea", valor: draft.objetivos.join("\n") },
      {
        nombre: "metodoCalculo",
        etiqueta: "Cálculo de la definitiva",
        tipo: "radio",
        obligatorio: true,
        valor: draft.metodoCalculo,
        opciones: metodosCalculo,
      },
    ],
    rellenar: (valores) => {
      const patch: Partial<UnidadDraft> = {}
      for (const [nombre, valor] of Object.entries(valores)) Object.assign(patch, patchDe(nombre, valor) ?? {})
      if (Object.keys(patch).length > 0) onChange(patch)
    },
    limpiar: (nombre) => {
      // `metodoCalculo` no tiene "vacío": siempre hay uno elegido.
      if (nombre === "nombre" || nombre === "descripcion") onChange({ [nombre]: "" })
      else if (nombre === "objetivos") onChange({ objetivos: [] })
    },
    resaltar: (nombre) => resaltarElemento(ELEMENTOS[nombre]),
  })
}
