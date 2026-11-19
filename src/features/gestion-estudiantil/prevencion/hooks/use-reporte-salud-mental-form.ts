import { useMemo, useState } from "react"
import { useSearch } from "@tanstack/react-router"

import { useNotify } from "@/components/notice/notice-context"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useReportarSenal } from "@/features/gestion-estudiantil/prevencion/api/mutations/salud-mental"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"
import { useSelectorEstudiantePrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-selector-estudiante-prevencion"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import { validarReporte } from "@/features/gestion-estudiantil/prevencion/utils/formularios-salud-mental"

/** Estado, validación y envío del reporte de una señal de salud mental (§9.6). */
export function useReporteSaludMentalForm() {
  const { notify } = useNotify()
  const { volver } = useNavegacionPrevencion()
  const s = useEstadoDialogo()
  const { establecimientoId } = useAmbitoPrevencion("")
  // Precarga desde el Observador (?matricula=&estudiante=).
  const { matricula, estudiante } = useSearch({ strict: false }) as { matricula?: number; estudiante?: string }
  const selector = useSelectorEstudiantePrevencion({
    establecimiento: establecimientoId,
    saludMental: true,
    inicial: matricula,
    nombreInicial: estudiante,
  })

  const [fecha, setFecha] = useState<Date | undefined>(() => new Date())
  const [tipo, setTipo] = useState("")
  const [observado, setObservado] = useState("")

  const tipos = useCatalogo("TIPO_SENAL_SALUD_MENTAL")
  const tipoOpciones = useMemo(() => tipos.map((t) => ({ value: t.value, label: t.label })), [tipos])

  const errores = validarReporte({ estudiante: selector.estudiante, fecha, tipo, observado })
  const error = (c: keyof typeof errores) => (s.intento ? errores[c] : undefined)

  const mut = useReportarSenal({
    mutationConfig: {
      onSuccess: () => {
        notify("Señal reportada: queda Por valorar.", { variant: "success" })
        volver()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const guardar = () => {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0 || !fecha) {
      enfocarPrimerError()
      return
    }
    mut.mutate({
      MATRICULA: Number(selector.estudiante),
      FECHA: fechaParaBackend(fecha),
      FK_TIPO: Number(tipo),
      LO_OBSERVADO: observado,
    })
  }

  return {
    selector,
    fecha,
    setFecha,
    tipo,
    setTipo,
    tipoOpciones,
    observado,
    setObservado,
    error,
    errorBackend: s.error,
    pending: mut.isPending,
    guardar,
    volver,
  }
}
