import { useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useCrearValoracion } from "@/features/gestion-estudiantil/prevencion/api/mutations/valoraciones"
import { useAlertasEstudianteQuery, useHistorialQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import { etiquetasAlertas } from "@/features/gestion-estudiantil/prevencion/utils/alertas"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import { useSelectorEstudiantePrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-selector-estudiante-prevencion"
import {
  fechaParaBackend,
  hayErroresValoracion,
  validarValoracion,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios"

type CampoValoracion = "estudiante" | "fecha" | "nivel" | "analisis"

/** Estado, consultas, validación y envío de «Valorar riesgo»; `onVolver` regresa a donde se venía. */
export function useValorarForm(matriculaInicial: number | undefined, onVolver: () => void) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const { establecimientoId } = useAmbitoPrevencion("")

  const [fecha, setFecha] = useState<Date | undefined>(() => new Date())
  const [nivel, setNivel] = useState("")
  const [analisis, setAnalisis] = useState("")
  /** pk de la valoración recién guardada: abre la oferta de crear plan. */
  const [guardada, setGuardada] = useState<number | null>(null)

  const inicial = useHistorialQuery(matriculaInicial)
  const selector = useSelectorEstudiantePrevencion({
    establecimiento: establecimientoId,
    inicial: matriculaInicial,
    nombreInicial: inicial.data?.estudiante_nombre,
  })
  const { estudiante, matricula } = selector

  const niveles = useCatalogo("NIVEL_RIESGO")
  const nivelOpciones = useMemo(() => niveles.map((n) => ({ value: n.value, label: n.label })), [niveles])
  const alertas = useAlertasEstudianteQuery(matricula)
  const historial = useHistorialQuery(matricula)

  const errores = useMemo<Partial<Record<CampoValoracion, string>>>(() => {
    const e = validarValoracion({ fecha, nivel, analisis })
    return estudiante ? e : { ...e, estudiante: "El estudiante es obligatorio." }
  }, [fecha, nivel, analisis, estudiante])
  const error = (c: CampoValoracion) => (s.intento ? errores[c] : undefined)

  const mut = useCrearValoracion({
    mutationConfig: {
      onSuccess: (r) => {
        notify("Valoración guardada.", { variant: "success" })
        // Solo se ofrece crear el plan si no hay uno abierto (Regla 18) y quien valora puede crearlo.
        if (historial.data && !historial.data.tiene_plan_abierto && historial.data.puede_valorar) setGuardada(r.id)
        else onVolver()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const enviar = () => {
    s.setIntento(true)
    s.setError(null)
    if (hayErroresValoracion(errores) || !estudiante) {
      enfocarPrimerError()
      return
    }
    mut.mutate({ MATRICULA: Number(estudiante), FECHA: fechaParaBackend(fecha as Date), FK_NIVEL: Number(nivel), ANALISIS: analisis })
  }

  const a = alertas.data
  const consideradas = a ? etiquetasAlertas(a.senales, a.condiciones) : []

  return {
    selector,
    fecha,
    setFecha,
    nivel,
    setNivel,
    analisis,
    setAnalisis,
    nivelOpciones,
    alertas: { cargando: alertas.isPending, consideradas, faltanDatos: Boolean(a?.faltan_datos) },
    error,
    errorBackend: s.error,
    pending: mut.isPending,
    enviar,
    guardada,
    estudianteNombre: historial.data?.estudiante_nombre,
  }
}
