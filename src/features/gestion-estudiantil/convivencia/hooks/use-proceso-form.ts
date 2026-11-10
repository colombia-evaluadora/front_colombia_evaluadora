import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { queueNotice, useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { formatDateValue } from "@/lib/date-value"
import { paths } from "@/config/paths"

import { useAbrirProceso } from "@/features/gestion-estudiantil/convivencia/api/mutations/procesos"
import {
  useCodigosCargoQuery,
  useEstudiantesCasoQuery,
  useOrigenesProcesoQuery,
  usePlazoDescargosQuery,
  useResponsablesProcesoQuery,
} from "@/features/gestion-estudiantil/convivencia/api/query/use-proceso-apertura-query"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import {
  abrirProcesoInput,
  cargoVacio,
  hayErrores,
  validarProceso,
  type ValoresProceso,
} from "@/features/gestion-estudiantil/convivencia/utils/proceso-form"

/** Cómo llega el formulario: vacío, desde una anotación (`?matricula=&anotacion=`) o desde un caso (`?caso=`). */
export interface OrigenProceso {
  matricula?: number
  anotacion?: number
  caso?: number
  /** Nombre ya conocido del estudiante (opcional) para no mostrar solo la matrícula. */
  nombre?: string
}

/** Estado, validación y envío del formulario de Abrir proceso (G.2.PRD.ABR.1). */
export function useProcesoForm(origen: OrigenProceso) {
  const navigate = useNavigate()
  const { notify } = useNotify()
  const [hoy] = useState(() => formatDateValue(new Date()))
  const desdeAnotacion = origen.matricula != null && origen.anotacion != null
  const desdeCaso = origen.caso != null
  const [valores, setValores] = useState<ValoresProceso>(() => ({
    matricula: desdeAnotacion ? String(origen.matricula) : "",
    anotaciones: desdeAnotacion ? [origen.anotacion as number] : [],
    caso: desdeCaso ? String(origen.caso) : "",
    fecha: hoy,
    responsable: "",
    cargos: [cargoVacio()],
    pruebas: [],
  }))
  const set = useCallback((patch: Partial<ValoresProceso>) => setValores((prev) => ({ ...prev, ...patch })), [])
  const [nombreElegido, setNombreElegido] = useState(origen.nombre ?? "")
  const [intento, setIntento] = useState(false)

  const matricula = valores.matricula ? Number(valores.matricula) : null
  const estudiantesCaso = useEstudiantesCasoQuery(origen.caso ?? null)
  const origenes = useOrigenesProcesoQuery(matricula)
  const responsables = useResponsablesProcesoQuery(matricula)
  const plazo = usePlazoDescargosQuery(matricula, valores.fecha <= hoy ? valores.fecha : "")
  const codigos = useCodigosCargoQuery(matricula)

  // Valores por defecto derivados en render (sin efectos): responsable = quien abre; primer cargo = código de la anotación.
  const responsableDefecto = responsables.data?.find((r) => r.es_usuario_actual)?.fk_tfuncionario
  const codigoAnotacion = origenes.data?.anotaciones.find((a) => a.id === valores.anotaciones[0])?.codigo
  const codigoDefecto = codigoAnotacion ? codigos.data?.find((c) => c.codigo === codigoAnotacion)?.id : undefined
  const v = useMemo<ValoresProceso>(
    () => ({
      ...valores,
      responsable: valores.responsable || (responsableDefecto != null ? String(responsableDefecto) : ""),
      cargos:
        codigoDefecto != null && valores.cargos[0] && !valores.cargos[0].codigo
          ? [{ ...valores.cargos[0], codigo: String(codigoDefecto) }, ...valores.cargos.slice(1)]
          : valores.cargos,
    }),
    [valores, responsableDefecto, codigoDefecto],
  )

  /** Cambia el estudiante: lo que depende de él (origen, responsable, códigos) se reinicia. */
  const elegirEstudiante = useCallback(
    (value: string, nombre: string) => {
      setNombreElegido(nombre)
      setValores((prev) => ({
        ...prev,
        matricula: value,
        anotaciones: [],
        caso: desdeCaso ? prev.caso : "",
        responsable: "",
        cargos: prev.cargos.map((c, i) => (i === 0 ? cargoVacio() : { ...c, codigo: "", clasificacion: "" })),
      }))
    },
    [desdeCaso],
  )

  const errores = useMemo(() => (intento ? validarProceso(v, hoy) : { cargos: {}, pruebas: {} }), [intento, v, hoy])

  const abrir = useAbrirProceso({
    mutationConfig: {
      onSuccess: (r) => {
        queueNotice(r.mensaje || "Proceso disciplinario abierto.", { variant: "success" })
        navigate({ to: paths.app.convivenciaProceso.getHref(r.id) })
      },
      onError: (error: Error) => {
        notify(getErrorMessage(error), { variant: "error" })
        enfocarPrimerError()
      },
    },
  })

  const volver = useCallback(() => navigate({ to: paths.app.convivencia.getHref(), search: { tab: "procesos" } } as never), [navigate])

  function guardar() {
    setIntento(true)
    const e = validarProceso(v, hoy)
    if (hayErrores(e)) {
      notify("Revise los campos marcados.", { variant: "error" })
      enfocarPrimerError()
      return
    }
    abrir.mutate(abrirProcesoInput(v))
  }

  return {
    v,
    set,
    errores,
    intento,
    origen: { desdeAnotacion, desdeCaso },
    nombreElegido,
    elegirEstudiante,
    estudiantesCaso,
    origenes,
    responsables,
    plazo,
    codigos,
    guardando: abrir.isPending,
    guardar,
    volver,
  }
}

export type ProcesoFormState = ReturnType<typeof useProcesoForm>
