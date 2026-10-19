import { useEffect } from "react"

import type { CampoUi, CodigoFormularioAgente, FormularioUi } from "@/features/assistant/api/types"
import { valorFiltroComo } from "@/features/assistant/lib/campos-ui"

// Lo que la pantalla abierta expone al asistente. `campos` se evalúa en cada mensaje.

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
/** Formularios abiertos pero en solo lectura, con el motivo (p. ej. Regla 37 del planeador). */
const bloqueados = new Map<CodigoFormularioAgente, string>()
let filtros: FiltrosAsistente | null = null
let pestanas: PestanasAsistente | null = null

export function formularioRegistrado(codigo: string): FormularioAsistente | undefined {
  return formularios.get(codigo as CodigoFormularioAgente)
}

/** Motivo por el que el formulario abierto no se puede rellenar, si lo está. */
export function motivoFormularioBloqueado(codigo: string): string | undefined {
  return bloqueados.get(codigo as CodigoFormularioAgente)
}

export function filtrosRegistrados(): FiltrosAsistente | null {
  return filtros
}

export function pestanasRegistradas(): PestanasAsistente | null {
  return pestanas
}

/** Un select lleno solo manda la opción elegida. */
export function acotarOpciones(campo: CampoUi): CampoUi {
  const lleno = campo.valor != null && String(campo.valor).trim() !== ""
  if (!lleno || !campo.opciones?.length) return campo
  const elegida = campo.opciones.filter((o) => o.valor === String(campo.valor))
  return { ...campo, opciones: elegida }
}

/** Definición de los formularios abiertos para `contextoUi` (máx. 5, como el backend). */
export function definicionFormularios(): FormularioUi[] {
  return [...formularios.values()].slice(0, 5).map((f) => ({
    codigo: f.codigo,
    entidad: f.entidad,
    campos: f.campos().map(acotarOpciones),
  }))
}

/** Registra un formulario mientras esté montado. */
export function useFormularioAsistente(formulario: FormularioAsistente | null) {
  useEffect(() => {
    if (!formulario) return
    formularios.set(formulario.codigo, formulario)
    return () => {
      if (formularios.get(formulario.codigo) === formulario) formularios.delete(formulario.codigo)
    }
  })
}

/**
 * Un formulario en pantalla que NO se expone para rellenar (no entra en
 * `contextoUi`), pero cuyo motivo se le devuelve al asistente si igual lo
 * intenta: "no está abierto" lo confundiría. Devuelve con qué quitarlo.
 */
export function bloquearFormularioAsistente(codigo: CodigoFormularioAgente, motivo: string): () => void {
  bloqueados.set(codigo, motivo)
  return () => {
    if (bloqueados.get(codigo) === motivo) bloqueados.delete(codigo)
  }
}

/** `bloquearFormularioAsistente` mientras el formulario esté montado y `motivo` exista. */
export function useFormularioBloqueadoAsistente(codigo: CodigoFormularioAgente, motivo: string | null | undefined) {
  useEffect(() => {
    if (!motivo) return
    return bloquearFormularioAsistente(codigo, motivo)
  }, [codigo, motivo])
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

/** Registra los filtros de un listado con su `applyFilters`. */
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
