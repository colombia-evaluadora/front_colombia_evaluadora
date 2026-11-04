import { useEffect, useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import type { Notice } from "@/components/notice/notice-banner"
import { formatDateValue } from "@/lib/date-value"
import { getErrorMessage } from "@/lib/api-client"

import type { BaseFechaSiuce, SiuceFiltros } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { descargarSiuce } from "@/features/gestion-estudiantil/convivencia/api/descargar-reportes"
import { useSiuceVistaPreviaQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-siuce-query"
import { SIUCE_COLUMNAS } from "@/features/gestion-estudiantil/convivencia/api/siuce-columnas"
import {
  agruparColumnas,
  erroresExportarSiuce,
  filtrarColumnas,
  rangoValido,
} from "@/features/gestion-estudiantil/convivencia/utils/siuce"

const ESPERA_MS = 400
const TODAS = SIUCE_COLUMNAS.map((c) => c.clave)

function useDebounced<T>(valor: T) {
  const [v, setV] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ESPERA_MS)
    return () => clearTimeout(t)
  }, [valor])
  return v
}

/** Estado, vista previa con debounce, selección de columnas y descarga de «Exportar para el SIUCE». */
export function useExportarSiuce(onClose: () => void) {
  const { notify } = useNotify()
  const [base, setBase] = useState<BaseFechaSiuce>("HECHOS")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [columnas, setColumnas] = useState<string[]>(TODAS)
  const [busqueda, setBusqueda] = useState("")
  const [intento, setIntento] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const filtros = useMemo<SiuceFiltros>(
    () => ({ BASE_FECHA: base, DESDE: desde, HASTA: hasta, SOLO_PENDIENTES: soloPendientes }),
    [base, desde, hasta, soloPendientes],
  )
  // La vista previa solo consulta con un rango válido y espera a que se deje de teclear.
  const filtrosEspera = useDebounced(filtros)
  const rangoOk = rangoValido(desde, hasta)
  const vistaPrevia = useSiuceVistaPreviaQuery(filtrosEspera, rangoOk)

  const errores = erroresExportarSiuce(desde, hasta, columnas)
  const ver = intento ? errores : { rango: undefined, columnas: undefined }
  const grupos = agruparColumnas(filtrarColumnas(SIUCE_COLUMNAS, busqueda))

  function cerrar() {
    setBase("HECHOS")
    setDesde("")
    setHasta("")
    setSoloPendientes(false)
    setColumnas(TODAS)
    setBusqueda("")
    setIntento(false)
    setNotice(null)
    onClose()
  }

  async function exportar() {
    setIntento(true)
    if (Object.values(errores).some(Boolean)) return
    setPending(true)
    setNotice(null)
    try {
      // En el orden del reporte, no en el de los clics.
      const r = await descargarSiuce(filtros, TODAS.filter((c) => columnas.includes(c)))
      if (r.status === "ok") {
        notify(r.message, { variant: "success" })
        cerrar()
      } else setNotice({ id: Date.now(), message: r.message })
    } catch (error) {
      setNotice({ id: Date.now(), message: getErrorMessage(error) })
    } finally {
      setPending(false)
    }
  }

  return {
    base,
    setBase,
    desde,
    hasta,
    setDesde: (d: Date | undefined) => setDesde(d ? formatDateValue(d) : ""),
    setHasta: (d: Date | undefined) => setHasta(d ? formatDateValue(d) : ""),
    soloPendientes,
    setSoloPendientes,
    columnas,
    alternarColumna: (clave: string, marcada: boolean) =>
      setColumnas((prev) => (marcada ? [...prev, clave] : prev.filter((c) => c !== clave))),
    seleccionarTodas: () => setColumnas(TODAS),
    limpiarColumnas: () => setColumnas([]),
    busqueda,
    setBusqueda,
    grupos,
    ver,
    rangoOk,
    vistaPrevia,
    notice,
    cerrarNotice: () => setNotice(null),
    pending,
    cerrar,
    exportar,
  }
}
