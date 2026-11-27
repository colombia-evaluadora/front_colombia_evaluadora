import { useMutation, useQuery } from "@tanstack/react-query"
import { format } from "date-fns"

import { evalCol } from "@/lib/eval-col-client"
import { downloadReport } from "@/lib/report-client"
import { informesKeys } from "@/features/coverage/informes-reportes/api/informes"

// Certificado de calificaciones (C.4.CER, Sección 3.9): V777/V778 del SSO.

export type PresentacionCertificado = "ESCALA" | "FORMATO"

export interface PreviaCertificado {
  numero: string | null
  formativo: boolean
}

/** Número que llevaría el definitivo (el que ya tiene la matrícula o el siguiente; no lo reserva) y si el grado es formativo. */
export function usePreviaCertificadoQuery(matriculaId: string) {
  return useQuery({
    queryKey: [...informesKeys.all, "certificado", "previa", matriculaId] as const,
    queryFn: async () => {
      const rows = await evalCol.getRows<{ numero: string | null; formativo: boolean }>(
        `/informes-reportes/certificado-calificaciones/${matriculaId}/previa`,
      )
      return (rows[0] ?? { numero: null, formativo: false }) as PreviaCertificado
    },
    enabled: Boolean(matriculaId),
  })
}

export interface GenerarCertificadoInput {
  matriculaId: string
  presentacion: PresentacionCertificado
  dirigidaA: string
  fecha: Date
  borrador: boolean
}

/** Registra el certificado y descarga el PDF (reporting-service, clave informes-certificado-calificaciones). */
export function useGenerarCertificado() {
  return useMutation({
    mutationFn: async (v: GenerarCertificadoInput) => {
      const r = await downloadReport("informes-certificado-calificaciones", {
        format: "pdf",
        filters: {
          MATRICULA: Number(v.matriculaId),
          PRESENTACION: v.presentacion,
          DIRIGIDA_A: v.dirigidaA,
          FECHA: format(v.fecha, "yyyy-MM-dd"),
          BORRADOR: v.borrador ? "S" : "N",
        },
      })
      if (r.status !== "ok") throw new Error(r.message)
    },
  })
}
