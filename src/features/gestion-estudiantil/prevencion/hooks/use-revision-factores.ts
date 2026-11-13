"use no memo"

import { useState } from "react"

import { queueNotice } from "@/components/notice/notice-context"

import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useRevisarFactores } from "@/features/gestion-estudiantil/prevencion/api/mutations/caracterizacion"
import type { CaracterizacionDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import {
  CODIGO,
  codigoDeOpcion,
  revisionDesdeDetalle,
  validarRevision,
  type FactorForm,
  type FormRevision,
  type ListasCaracterizacion,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-caracterizacion"

/**
 * Revisión de los factores de vulnerabilidad (§9.8): acción aparte de la confirmación familiar. Escribe quien edita
 * el formulario o el Profesional de trabajo social (`puede_revisar_factores`); el resto la ve sin poder registrarla.
 */
export function useRevisionFactores(detalle: CaracterizacionDetalle, listas: ListasCaracterizacion) {
  const s = useEstadoDialogo()
  const opcionesFactor = listas.FACTOR_VULNERABILIDAD ?? []
  const opcionesRevision = listas.REVISION_FACTORES ?? []
  const [r, setR] = useState<FormRevision>(() => revisionDesdeDetalle(detalle, opcionesFactor))
  const set = (parche: Partial<FormRevision>) => setR((actual) => ({ ...actual, ...parche }))
  const cambiarFactor = (factor: string, parche: Partial<FactorForm>) =>
    setR((actual) => ({
      ...actual,
      factores: actual.factores.map((f) => (f.factor === factor ? { ...f, ...parche } : f)),
    }))

  const errores = validarRevision(r, opcionesRevision, opcionesFactor)
  const error = (clave: string) => (s.intento ? errores[clave] : undefined)

  const mutation = useRevisarFactores({
    mutationConfig: {
      onSuccess: () => queueNotice("Revisión de factores registrada.", { variant: "success" }),
      onError: (e: Error) => s.setError(e),
    },
  })

  const registrar = () => {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0) {
      enfocarPrimerError()
      return
    }
    mutation.mutate({
      matricula: detalle.fk_tmatricula,
      REVISION: Number(r.revision),
      FACTORES: r.factores
        .filter((f) => f.marcado)
        .map((f) => ({
          fk_factor: Number(f.factor),
          fuente: f.fuente.trim(),
          fecha_conocimiento: fechaParaBackend(f.fecha as Date),
        })),
      DESACTIVAR: r.factores
        .filter((f) => !f.marcado && f.estado === "VIGENTE")
        .map((f) => ({ fk_factor: Number(f.factor), motivo: f.motivo.trim() })),
      OBSERVACIONES: r.observaciones.trim() || null,
    })
  }

  return {
    r,
    set,
    cambiarFactor,
    error,
    opcionesFactor,
    /** «Sin revisar» es solo el estado inicial: no se ofrece como resultado de una revisión. */
    opcionesRevision: opcionesRevision.filter((o) => o.codigo !== CODIGO.sinRevisar),
    esOtro: (factor: string) => codigoDeOpcion(opcionesFactor, factor) === CODIGO.otro,
    errorBackend: s.error,
    pending: mutation.isPending,
    registrar,
  }
}
