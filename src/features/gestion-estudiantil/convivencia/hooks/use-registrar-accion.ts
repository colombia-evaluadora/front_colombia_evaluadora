import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"

import { useRegistrarAccion as useRegistrarAccionMutation } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"
import { useCasoQuery, usePasosCasoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { COD } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { CasoResumen } from "@/features/gestion-estudiantil/convivencia/api/types"
import {
  ahora,
  codigosSiuceBody,
  erroresAccion,
  type CodigoSiuce,
  type ErroresAccion,
} from "@/features/gestion-estudiantil/convivencia/utils/registrar-accion"
import {
  afectadosReportados,
  afectadosSinCodigo,
  claveAfectado,
  todosQuedanReportados,
} from "@/features/gestion-estudiantil/convivencia/utils/siuce"

/** Estado, campos condicionales por código de la acción, validación y envío de Registrar acción (3.2). */
export function useRegistrarAccion(caso: CasoResumen | null, onClose: () => void) {
  const { notify } = useNotify()
  const acciones = useCatalogo("ACCION_PROTOCOLO_CONVIVENCIA")
  const detalle = useCasoQuery(caso?.id)
  const pasos = usePasosCasoQuery(caso?.id)

  const [accion, setAccion] = useState("")
  const [fechaHora, setFechaHora] = useState(ahora)
  const [descripcion, setDescripcion] = useState("")
  const [entidad, setEntidad] = useState("")
  const [noAplica, setNoAplica] = useState(false)
  const [resultado, setResultado] = useState("")
  const [codigos, setCodigos] = useState<CodigoSiuce[]>([])
  const [soportes, setSoportes] = useState<File[]>([])
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const codigo = codigoDe(acciones, accion)
  const conEntidad = codigo != null && (COD.conEntidad as readonly string[]).includes(codigo)
  const esSeguimiento = codigo === COD.seguimiento
  const esSiuce = codigo === COD.reporteSiuce
  const condicional = pasos.data?.some((p) => p.accion === codigo && p.condicional) ?? false

  const d = detalle.data
  // Solo se ofrecen los afectados sin código: un afectado ya reportado no se vuelve a reportar.
  const afectados = afectadosSinCodigo(d?.afectados_siuce).map((a) => ({ value: claveAfectado(a), label: a.nombre }))
  const reportados = afectadosReportados(d?.afectados_siuce)
  const todosReportados = todosQuedanReportados(
    d?.afectados_siuce,
    codigos.map((c) => c.afectado),
  )

  function cerrar() {
    setAccion("")
    setFechaHora(ahora())
    setDescripcion("")
    setEntidad("")
    setNoAplica(false)
    setResultado("")
    setCodigos([])
    setSoportes([])
    setIntento(false)
    setError(null)
    onClose()
  }

  const mut = useRegistrarAccionMutation({
    mutationConfig: {
      onSuccess: () => {
        notify("Acción registrada.", { variant: "success" })
        cerrar()
      },
      onError: (error) => setError(error),
    },
  })

  const errores = erroresAccion(
    { accion, fechaHora, descripcion, entidad, resultado, codigos },
    { conEntidad, esSeguimiento, esSiuce },
  )
  const ver: Partial<ErroresAccion> = intento ? errores : {}

  function registrar() {
    setIntento(true)
    if (!caso || Object.values(errores).some(Boolean)) return
    mut.mutate({
      casoId: caso.id,
      FK_TLV_ACCION: Number(accion),
      FECHA: fechaHora.fecha,
      HORA: fechaHora.hora,
      DESCRIPCION: descripcion.trim(),
      FK_TLV_ENTIDAD: conEntidad && entidad ? Number(entidad) : null,
      NO_APLICA: condicional && noAplica,
      FK_TLV_RESULTADO: esSeguimiento ? Number(resultado) : null,
      FK_ARCHIVOS: null,
      CODIGOS_SIUCE: esSiuce ? codigosSiuceBody(codigos) : null,
      soportes,
    })
  }

  return {
    acciones,
    accion,
    elegirAccion: (a: string) => {
      setAccion(a)
      setNoAplica(false)
    },
    fechaHora,
    setFechaHora,
    descripcion,
    setDescripcion,
    entidad,
    setEntidad,
    noAplica,
    setNoAplica,
    resultado,
    setResultado,
    codigos,
    setCodigos,
    soportes,
    setSoportes,
    conEntidad,
    esSeguimiento,
    esSiuce,
    condicional,
    afectados,
    /** Afectados del caso (todos), para el encabezado «Afectados: …». */
    afectadosCaso: d?.afectados_siuce ?? [],
    reportados,
    todosReportados,
    /** Sin fecha de los hechos no se puede contrastar la acción con la ocurrencia. */
    fechaHechosDesconocida: Boolean(d && !d.fecha_hechos_conocida),
    ver,
    error,
    pending: mut.isPending,
    cerrar,
    registrar,
  }
}
