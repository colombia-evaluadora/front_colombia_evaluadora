import { useMutation, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { downloadReport } from "@/lib/report-client"
import { informesKeys } from "@/features/coverage/informes-reportes/api/informes"

// Libro de registro de calificaciones finales (C.4.LIB, Regla 60): V781/V782 del SSO.

export type ModoLibro = "GRUPO" | "ESTUDIANTE"

export const MODOS_LIBRO: { value: ModoLibro; label: string }[] = [
  { value: "GRUPO", label: "Por grupo" },
  { value: "ESTUDIANTE", label: "Por estudiante" },
]

/** Libro que se asignaría al grado en esa forma (el que ya tiene o el siguiente; no lo reserva) y cuántos folios. */
export function usePreviaLibroQuery(periodo: number | undefined, grado: number | undefined, modo: ModoLibro) {
  return useQuery({
    queryKey: [...informesKeys.all, "libro", "previa", periodo ?? "none", grado ?? "none", modo] as const,
    queryFn: async () => {
      const rows = await evalCol.postRows<{ libro: number; folios: number }>("/informes-reportes/libro-registro/previa", {
        PERIODO: periodo,
        GRADO: grado,
        MODO: modo,
      })
      return rows[0] ?? null
    },
    enabled: Boolean(periodo) && grado != null,
  })
}

/** Genera el libro (definitivo: registra libro, folios y QR) y descarga el PDF. */
export function useGenerarLibro() {
  return useMutation({
    mutationFn: async (v: { periodo: number; grado: number; modo: ModoLibro; borrador: boolean }) => {
      const r = await downloadReport(v.modo === "ESTUDIANTE" ? "informes-libro-estudiantes" : "informes-libro-grupos", {
        format: "pdf",
        filters: { PERIODO: v.periodo, GRADO: v.grado, BORRADOR: v.borrador ? "S" : "N" },
      })
      if (r.status !== "ok") throw new Error(r.message)
    },
  })
}
