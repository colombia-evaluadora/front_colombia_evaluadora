import { useCallback, useEffect, useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { parseDateValue } from "@/lib/date-value"

import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useAgregarBeneficiarios } from "@/features/gestion-estudiantil/prevencion/api/mutations/estrategias"
import {
  pedirMatriculados,
  useEstrategiaQuery,
  useGradosEstrategiaQuery,
  useMatriculadosEstrategiaQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-estrategias-query"
import type { MatriculadoEstrategia, ResumenEstrategia } from "@/features/gestion-estudiantil/prevencion/api/types"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import { errorFechaIngreso } from "@/features/gestion-estudiantil/prevencion/utils/formularios-estrategias"

/** Matriculados por página en la lista; «Seleccionar todos» recorre el resto con páginas de este tamaño. */
const PAGINA = 50
const PAGINA_TODOS = 200
const ESPERA_MS = 300

const dia = (valor: string) => valor.slice(0, 10)

/** Hoy, acotado a las fechas de la estrategia (por defecto, la fecha en que se agrega). */
function fechaInicial(inicio: string, fin: string | null): Date {
  const hoy = new Date()
  const min = parseDateValue(dia(inicio))
  const max = fin ? parseDateValue(dia(fin)) : undefined
  if (min && hoy < min) return min
  if (max && hoy > max) return max
  return hoy
}

/** Estado, selección entre páginas y envío de «Agregar beneficiarios» (G.8.EST.8). */
export function useAgregarBeneficiariosForm(estrategia: ResumenEstrategia, onClose: () => void) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [fecha, setFecha] = useState<Date | undefined>(() => fechaInicial(estrategia.fecha_inicio, estrategia.fecha_fin))
  const [grado, setGrado] = useState("")
  const [search, setSearch] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [seleccion, setSeleccion] = useState<ReadonlyMap<number, MatriculadoEstrategia>>(new Map())
  /** Clave del filtro con el que se pidió «Seleccionar todos»; null si no hay selección total vigente. */
  const [todosDe, setTodosDe] = useState<string | null>(null)
  const [cargandoTodos, setCargandoTodos] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(search), ESPERA_MS)
    return () => clearTimeout(t)
  }, [search])

  const detalle = useEstrategiaQuery(estrategia.id, { pageIndex: 0, pageSize: 1 })
  const grados = useGradosEstrategiaQuery(estrategia.id)
  const filtro = useMemo(() => ({ grado, search: busqueda }), [grado, busqueda])
  const claveFiltro = `${grado}|${busqueda.trim()}`
  const lista = useMatriculadosEstrategiaQuery(estrategia.id, { ...filtro, pageIndex, pageSize: PAGINA })

  const filas = lista.data?.rows ?? []
  const totalCount = lista.data?.totalCount ?? 0
  const paginas = Math.max(1, Math.ceil(totalCount / PAGINA))
  const requisitos = detalle.data?.requisitos_ingreso?.trim() || null

  const gradoOpciones = useMemo(
    () => (grados.data ?? []).map((g) => ({ value: String(g.fk_tgrado), label: g.grado_nombre })),
    [grados.data],
  )

  const cambiarFiltro = useCallback((siguiente: { grado?: string; search?: string }) => {
    if (siguiente.grado !== undefined) setGrado(siguiente.grado)
    if (siguiente.search !== undefined) setSearch(siguiente.search)
    setPageIndex(0)
  }, [])

  const alternar = (m: MatriculadoEstrategia) => {
    setTodosDe(null)
    setSeleccion((prev) => {
      const siguiente = new Map(prev)
      if (siguiente.has(m.fk_tmatricula)) siguiente.delete(m.fk_tmatricula)
      else siguiente.set(m.fk_tmatricula, m)
      return siguiente
    })
  }

  /** «Seleccionar todos»: todos los del filtro actual (todas las páginas) que aún no son beneficiarios. */
  const alternarTodos = async () => {
    if (todosDe === claveFiltro) {
      setSeleccion(new Map())
      setTodosDe(null)
      return
    }
    setCargandoTodos(true)
    try {
      const siguiente = new Map(seleccion)
      for (let pagina = 0; pagina * PAGINA_TODOS < totalCount; pagina++) {
        const rows = await pedirMatriculados(estrategia.id, { ...filtro, pageIndex: pagina, pageSize: PAGINA_TODOS })
        for (const m of rows) if (!m.ya_es_beneficiario) siguiente.set(m.fk_tmatricula, m)
      }
      setSeleccion(siguiente)
      setTodosDe(claveFiltro)
    } catch (e) {
      s.setError(e)
    } finally {
      setCargandoTodos(false)
    }
  }

  const seleccionados = [...seleccion.values()]
  /** Regla 43: con requisitos de ingreso, los que no están En edad se avisan antes de agregar (no bloquea). */
  const fueraDeEdad = requisitos ? seleccionados.filter((m) => m.situacion_edad !== "EN_EDAD") : []

  const errorFecha = s.intento
    ? errorFechaIngreso(fecha, { desde: estrategia.fecha_inicio, hasta: estrategia.fecha_fin })
    : undefined
  const errorSeleccion = s.intento && seleccionados.length === 0 ? "Elija al menos un estudiante." : undefined

  const mut = useAgregarBeneficiarios({
    mutationConfig: {
      onSuccess: (filasAgregadas) => {
        const n = filasAgregadas.length
        notify(n === 1 ? "Beneficiario agregado." : `${n} beneficiarios agregados.`, { variant: "success" })
        const advertencias = filasAgregadas.map((f) => f.advertencia).filter((a): a is string => Boolean(a))
        if (advertencias.length > 0) notify(advertencias.join(" "), { variant: "warning" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const agregar = () => {
    s.setIntento(true)
    s.setError(null)
    if (errorFechaIngreso(fecha, { desde: estrategia.fecha_inicio, hasta: estrategia.fecha_fin }) || seleccionados.length === 0 || !fecha) {
      enfocarPrimerError()
      return
    }
    mut.mutate({ id: estrategia.id, MATRICULAS: seleccionados.map((m) => m.fk_tmatricula), FECHA_INGRESO: fechaParaBackend(fecha) })
  }

  return {
    fecha,
    setFecha,
    errorFecha,
    errorSeleccion,
    errorBackend: s.error,
    search,
    grado,
    gradoOpciones,
    cambiarFiltro,
    filas,
    totalCount,
    cargando: lista.isPending,
    errorLista: lista.isError ? lista.error : null,
    pageIndex,
    paginas,
    setPageIndex,
    seleccion,
    alternar,
    alternarTodos,
    todosMarcado: todosDe === claveFiltro && seleccionados.length > 0,
    cargandoTodos,
    seleccionados: seleccionados.length,
    fueraDeEdad: fueraDeEdad.length,
    requisitos,
    pending: mut.isPending,
    agregar,
  }
}
