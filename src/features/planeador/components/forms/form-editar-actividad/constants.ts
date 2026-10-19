import * as React from "react"
import { FileTextIcon, InsertLinkOutlinedIcon, PermMediaOutlinedIcon } from "@/components/ui/icons"
import type { Recurso } from "@/features/planeador/api/types/actividad"

/**
 * `<Textarea>` no hereda la variante `outlined` del `Field`: se aplica a mano
 * con las mismas clases de `inputVariants({variant: "outlined"})`.
 */
export const TEXTAREA_OUTLINED =
  "rounded-md border border-input px-3 py-2 hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-red aria-invalid:focus-visible:border-red aria-invalid:focus-visible:ring-red/20"

// Labels de los `<Select>` cuyo `value` (id, abreviatura) no es el texto visible.

/** Presentación (ícono, label, color) de cada `RecursoTipo`, única fuente para todos los consumidores. */
export type RecursoPresentacion = {
  label: string
  Icon: React.ComponentType<{ className?: string }>
  bg: string
  text: string
}

export const RECURSO_PRESENTACION: Record<Recurso["tipo"], RecursoPresentacion> = {
  URL: {
    label: "URL / Sitio web",
    Icon: InsertLinkOutlinedIcon,
    bg: "bg-green-22",
    text: "text-green",
  },
  "Unidad virtual": {
    label: "Unidad virtual / repositorio",
    Icon: PermMediaOutlinedIcon,
    bg: "bg-purple-22",
    text: "text-purple",
  },
  Archivo: {
    label: "Archivo en PC",
    Icon: FileTextIcon,
    bg: "bg-orange-22",
    text: "text-orange",
  },
}

export const ADAPTACION_TIPO_LABELS: Record<string, string> = {
  "Estilo de aprendizaje": "Estilo de aprendizaje (visual, kinestésico, auditivo)",
  Modalidad: "Modalidad (virtual, asincrónica, presencial)",
  "Nivel de desempeño": "Nivel de desempeño (refuerzo, ampliación)",
}

export const VERSION_MODIFICADA_LABELS: Record<string, string> = {
  no: "No",
  archivo: "Sí, Adjuntar plantilla (archivo)",
  enlace: "Sí, Adjuntar plantilla (enlace)",
  biblioteca: "Sí, Adjuntar plantilla (biblioteca)",
}

export const TIPO_EVIDENCIA_ESPERADA_LABELS: Record<string, string> = {
  Archivo: "Archivo (PDF, Word, imagen, otro)",
  Enlace: "Enlace (video, blog, presentación)",
  "Observación directa": "Observación directa",
  "Registro en campo": "Registro en campo",
}

/**
 * Opción de entrega que se marca por defecto según el tipo de evidencia (pedido de QA).
 * Solo prende la suya, nunca apaga la otra: siguen siendo independientes.
 */
export const TIPO_EVIDENCIA_CHECKBOX_DEFAULT: Record<string, "archivo" | "texto"> = {
  Archivo: "archivo",
  Enlace: "texto",
  "Observación directa": "texto",
  "Registro en campo": "texto",
}

/**
 * Respaldo de los catálogos de "Otro" mientras `instrumentosPermitidos[OTRO].campos`
 * no resuelve; el backend real los manda acotados al referente.
 */
export const TIPO_EVIDENCIA_ESPERADA_CATALOGO_DEFAULT: { pk: number; valor: string; nombre: string }[] = [
  { pk: -1, valor: "ARCHIVO", nombre: "Archivo" },
  { pk: -2, valor: "ENLACE", nombre: "Enlace" },
  { pk: -3, valor: "OBSERVACION_DIRECTA", nombre: "Observación directa" },
  { pk: -4, valor: "REGISTRO_CAMPO", nombre: "Registro en campo" },
]

export const METODO_VALORACION_CATALOGO_DEFAULT: { pk: number; valor: string; nombre: string }[] = [
  { pk: -1, valor: "RUBRICA", nombre: "Rúbrica" },
  { pk: -2, valor: "LISTA_COTEJO", nombre: "Lista de cotejo" },
  { pk: -3, valor: "ESCALA_VALORACION", nombre: "Escala de valoración" },
]
