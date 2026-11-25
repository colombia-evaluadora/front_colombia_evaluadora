import type { ReactNode } from "react"

import { FichaDatos } from "@/components/ficha-datos"

/** Cuadrícula de datos de solo lectura, de a dos pares por fila: la ficha de datos común (`FichaDatos`). */
export function DatosDocumento({ filas }: { filas: [string, ReactNode][] }) {
  return <FichaDatos datos={filas.map(([etiqueta, valor]) => ({ etiqueta, valor }))} />
}
