import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { queueNotice, useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { formatDateValue } from "@/lib/date-value"
import { paths } from "@/config/paths"

import { useCasoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import { useAbrirProceso } from "@/features/gestion-estudiantil/convivencia/api/mutations/procesos"
import {
  useCodigosCargoQuery,
  useEstudiantesCasoQuery,
  useEstudiantesProcesoQuery,
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
    // Desde una anotación, o desde un caso con el estudiante ya elegido en el modal (G.2.CAS.DIS.2).
    matricula: origen.matricula != null ? String(origen.matricula) : "",
    anotaciones: desdeAnotacion ? [origen.anotacion as number] : [],
    caso: desdeCaso ? String(origen.caso) : "",
    fecha: hoy,
    responsable: "",
    cargos: [cargoVacio()],
    pruebas: [],
  }))
  // Mientras la persona no toque anotaciones o cargos, se derivan: las del caso de origen y un cargo por anotación.
  const [anotacionesTocadas, setAnotacionesTocadas] = useState(false)
  const [cargosTocados, setCargosTocados] = useState(false)
  const set = useCallback((patch: Partial<ValoresProceso>) => {
    if (patch.cargos) setCargosTocados(true)
    setValores((prev) => ({ ...prev, ...patch }))
  }, [])
  const [nombreElegido, setNombreElegido] = useState(origen.nombre ?? "")
  const [acudienteElegido, setAcudienteElegido] = useState<string | null>(null)
  const [intento, setIntento] = useState(false)

  const matricula = valores.matricula ? Number(valores.matricula) : null
  // Con el estudiante fijo desde un caso (G.2.CAS.DIS.2) o desde una anotación, el formulario no pasa por la búsqueda.
  const estudianteFijo = origen.matricula != null && (desdeCaso || desdeAnotacion)
  const estudiantesCaso = useEstudiantesCasoQuery(origen.caso ?? null)
  const delCaso = estudiantesCaso.data?.find((e) => e.fk_tmatricula === matricula)
  const buscadoPorNombre = useEstudiantesProcesoQuery(desdeAnotacion && !delCaso ? (origen.nombre ?? "") : "")
  /** Acudiente a quien se comunicarán los cargos (F14). */
  const acudienteNombre =
    delCaso?.acudiente_nombre ??
    acudienteElegido ??
    buscadoPorNombre.data?.find((e) => e.fk_tmatricula === matricula)?.acudiente_nombre ??
    null
  const origenes = useOrigenesProcesoQuery(matricula)
  const responsables = useResponsablesProcesoQuery(matricula)
  const plazo = usePlazoDescargosQuery(matricula, valores.fecha <= hoy ? valores.fecha : "")
  const codigos = useCodigosCargoQuery(matricula)
  const casoOrigen = useCasoQuery(origen.caso)

  // Valores por defecto derivados en render (sin efectos): responsable = quien abre; un cargo por anotación de origen.
  const responsableDefecto = responsables.data?.find((r) => r.es_usuario_actual)?.fk_tfuncionario
  const anotacionesDelCaso = useMemo(() => {
    const disponibles = new Set((origenes.data?.anotaciones ?? []).map((a) => a.id))
    return (casoOrigen.data?.anotaciones_origen ?? []).filter((a) => !a.anulada && disponibles.has(a.id)).map((a) => a.id)
  }, [casoOrigen.data, origenes.data])
  const anotaciones = anotacionesTocadas || !desdeCaso || !matricula ? valores.anotaciones : anotacionesDelCaso
  const cargosDe = useCallback(
    (ids: number[]) =>
      ids.map((id) => {
        const anotacion = origenes.data?.anotaciones.find((a) => a.id === id)
        // F15: el comportamiento de la anotación ya trae el id del código; por texto solo si el backend no lo manda.
        const codigo =
          codigos.data?.find((c) => c.id === anotacion?.fk_comportamiento)?.id ??
          (anotacion?.codigo ? codigos.data?.find((c) => c.codigo === anotacion.codigo)?.id : undefined)
        return { ...cargoVacio(codigo != null ? String(codigo) : ""), key: `anot-${id}` }
      }),
    [origenes.data, codigos.data],
  )
  const v = useMemo<ValoresProceso>(
    () => ({
      ...valores,
      anotaciones,
      responsable: valores.responsable || (responsableDefecto != null ? String(responsableDefecto) : ""),
      cargos: cargosTocados || anotaciones.length === 0 ? valores.cargos : cargosDe(anotaciones),
    }),
    [valores, anotaciones, cargosTocados, cargosDe, responsableDefecto],
  )

  /** Cambia las anotaciones de origen: cada una agrega su cargo con su código y quitarla retira el cargo que nació de ella. */
  const elegirAnotaciones = useCallback(
    (ids: number[]) => {
      setAnotacionesTocadas(true)
      setCargosTocados(true)
      setValores((prev) => {
        const actuales = cargosTocados ? prev.cargos : v.cargos
        const quitadas = new Set(anotaciones.filter((id) => !ids.includes(id)).map((id) => `anot-${id}`))
        const nuevas = cargosDe(ids.filter((id) => !anotaciones.includes(id)))
        const resto = actuales.filter((c) => !quitadas.has(c.key))
        const cargos = [...resto, ...nuevas]
        return { ...prev, anotaciones: ids, cargos: cargos.length ? cargos : [cargoVacio()] }
      })
    },
    [anotaciones, cargosDe, cargosTocados, v.cargos],
  )

  /** Cambia el estudiante: lo que depende de él (origen, responsable, códigos) se reinicia. */
  const elegirEstudiante = useCallback(
    (value: string, nombre: string, acudiente?: string | null) => {
      setNombreElegido(nombre)
      setAcudienteElegido(acudiente ?? null)
      setAnotacionesTocadas(false)
      setCargosTocados(false)
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
    elegirAnotaciones,
    errores,
    intento,
    origen: { desdeAnotacion, desdeCaso, estudianteFijo },
    nombreElegido,
    acudienteNombre,
    elegirEstudiante,
    estudiantesCaso,
    casoOrigen,
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
