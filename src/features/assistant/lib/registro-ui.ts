import { useEffect } from "react"

import type { CampoUi, CodigoFormularioAgente, FormularioUi } from "@/features/assistant/api/types"
import { valorFiltroComo } from "@/features/assistant/lib/campos-ui"

// Registro de lo que la pantalla abierta le expone al asistente (UI asistida).
// Las pantallas se registran con los hooks de abajo y el asistente lee de acá
// para armar `contextoUi` y para aplicar las acciones de UI (`RELLENAR`,
// `LIMPIAR_CAMPO`, `RESALTAR`, `ABRIR_PESTANA`, `APLICAR_FILTROS`).
//
// El contrato pide que el propio componente del formulario genere su
// definición (si se escribe a mano se desfasa): por eso `campos` es una
// función que se evalúa al enviar cada mensaje, con los valores del momento.

export interface FormularioAsistente {
  codigo: CodigoFormularioAgente
  /** Id del registro que se edita; `""` en altas. */
  entidad: string
  campos: () => CampoUi[]
  /** Asigna valores en el MODELO del formulario (nunca como HTML ni selector). */
  rellenar: (valores: Record<string, unknown>) => void
  limpiar: (campo: string) => void
  resaltar: (campo: string) => void
}

export interface FiltrosAsistente {
  /** Nombres de filtro que admite el listado abierto (`APLICAR_FILTROS` solo usa estos). */
  nombres: string[]
  aplicar: (filtros: Record<string, unknown>) => void
  /** Valores actuales de los filtros (van en `contextoUi.parametros`). */
  valores?: () => Record<string, unknown>
}

export interface PestanasAsistente {
  /** Abre la pestaña por nombre visible; `false` si no existe. */
  abrir: (pestana: string) => boolean
}

const formularios = new Map<CodigoFormularioAgente, FormularioAsistente>()
let filtros: FiltrosAsistente | null = null
let pestanas: PestanasAsistente | null = null

export function formularioRegistrado(codigo: string): FormularioAsistente | undefined {
  return formularios.get(codigo as CodigoFormularioAgente)
}

export function filtrosRegistrados(): FiltrosAsistente | null {
  return filtros
}

export function pestanasRegistradas(): PestanasAsistente | null {
  return pestanas
}

/** Definición de los formularios abiertos para `contextoUi` (máx. 5, como el backend). */
export function definicionFormularios(): FormularioUi[] {
  return [...formularios.values()].slice(0, 5).map((f) => ({
    codigo: f.codigo,
    entidad: f.entidad,
    campos: f.campos(),
  }))
}

/**
 * Registra un formulario de la pantalla mientras esté montado. Pasá un objeto
 * estable o aceptá que se re-registre en cada render (es barato: es un Map).
 */
export function useFormularioAsistente(formulario: FormularioAsistente | null) {
  useEffect(() => {
    if (!formulario) return
    formularios.set(formulario.codigo, formulario)
    return () => {
      if (formularios.get(formulario.codigo) === formulario) formularios.delete(formulario.codigo)
    }
  })
}

export function useFiltrosAsistente(registro: FiltrosAsistente | null) {
  useEffect(() => {
    if (!registro) return
    filtros = registro
    return () => {
      if (filtros === registro) filtros = null
    }
  })
}

export function usePestanasAsistente(registro: PestanasAsistente | null) {
  useEffect(() => {
    if (!registro) return
    pestanas = registro
    return () => {
      if (pestanas === registro) pestanas = null
    }
  })
}

/**
 * Registra los filtros de un listado a partir de su hook de filtros
 * (`useXxxFilters`): los nombres son las claves del formulario de filtros y
 * `APLICAR_FILTROS` los aplica con el mismo `applyFilters` que usa la
 * persona (que ya resetea `page: 0` y escribe la URL). Los filtros que el
 * agente no menciona conservan su valor.
 */
export function useFiltrosDeListado<T extends object>(
  filters: T,
  applyFilters: (values: T) => void,
  /** Claves que no se exponen (p. ej. ids internos). */
  excluir: string[] = [],
) {
  useFiltrosAsistente({
    nombres: Object.keys(filters).filter((k) => !excluir.includes(k)),
    aplicar: (valores) => {
      const actuales = filters as Record<string, unknown>
      const siguiente: Record<string, unknown> = { ...actuales }
      for (const [nombre, valor] of Object.entries(valores)) {
        if (!(nombre in actuales) || excluir.includes(nombre)) continue
        siguiente[nombre] = valorFiltroComo(actuales[nombre], valor)
      }
      applyFilters(siguiente as T)
    },
    valores: () =>
      Object.fromEntries(Object.entries(filters as Record<string, unknown>).filter(([k]) => !excluir.includes(k))),
  })
}
