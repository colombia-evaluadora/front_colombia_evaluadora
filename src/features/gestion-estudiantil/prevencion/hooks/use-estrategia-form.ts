import { useEffect, useMemo, useState } from "react"

import { queueNotice } from "@/components/notice/notice-context"
import { parseDateValue } from "@/lib/date-value"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useCrearEstrategia, useModificarEstrategia } from "@/features/gestion-estudiantil/prevencion/api/mutations/estrategias"
import {
  useOpcionesPeriodosAcademicosQuery,
  useOpcionesResponsablesQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-opciones-prevencion-query"
import type { EstrategiaDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import { validarEstrategia } from "@/features/gestion-estudiantil/prevencion/utils/formularios-estrategias"

const ESPERA_MS = 300

/** `inicial` = la estrategia que se modifica; sin ella, el formulario crea. */
export function useEstrategiaForm(inicial?: EstrategiaDetalle) {
  const { volver, irEstrategiaEditar } = useNavegacionPrevencion()
  const s = useEstadoDialogo()
  const editando = inicial != null
  const { establecimientoId } = useAmbitoPrevencion(inicial ? String(inicial.fk_tsede) : "")

  const [nombre, setNombre] = useState(inicial?.nombre ?? "")
  // Tipo y responsable: lo elegido gana; si no, lo de la estrategia (el tipo se resuelve por código cuando carga la lista).
  const [tipoElegido, setTipoElegido] = useState<string | null>(null)
  const [periodoElegido, setPeriodoElegido] = useState("")
  const [inicio, setInicio] = useState<Date | undefined>(() => (inicial ? parseDateValue(inicial.fecha_inicio.slice(0, 10)) : undefined))
  const [fin, setFin] = useState<Date | undefined>(() =>
    inicial?.fecha_fin ? parseDateValue(inicial.fecha_fin.slice(0, 10)) : undefined,
  )
  const [responsableElegido, setResponsableElegido] = useState<string | null>(null)
  const [fuente, setFuente] = useState(inicial?.fuente_financiacion ?? "")
  const [meta, setMeta] = useState(inicial?.meta != null ? String(inicial.meta) : "")
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "")
  const [requisitos, setRequisitos] = useState(inicial?.requisitos_ingreso ?? "")

  const tipos = useCatalogo("TIPO_ESTRATEGIA_PERMANENCIA")
  const tipoOpciones = useMemo(() => tipos.map((t) => ({ value: t.value, label: t.label })), [tipos])
  const tipo = tipoElegido ?? tipos.find((t) => t.codigo === inicial?.tipo_valor)?.value ?? ""

  const periodos = useOpcionesPeriodosAcademicosQuery(establecimientoId)
  const periodoOpciones = useMemo(() => {
    const lista = (periodos.data ?? []).map((p) => ({
      value: String(p.fk_tperiodo_academico),
      label: `${p.nombre} · ${p.sede_nombre}`,
    }))
    // El período guardado sigue visible aunque la lista de opciones ya no lo traiga.
    if (inicial && !lista.some((o) => o.value === String(inicial.fk_tperiodo_academico)))
      lista.push({ value: String(inicial.fk_tperiodo_academico), label: inicial.periodo_nombre })
    return lista
  }, [periodos.data, inicial])
  const periodo = editando ? String(inicial.fk_tperiodo_academico) : periodoElegido
  const periodoDatos = periodos.data?.find((p) => String(p.fk_tperiodo_academico) === periodo) ?? null
  const limites = useMemo(
    () => (periodoDatos ? { desde: periodoDatos.fecha_inicio, hasta: periodoDatos.fecha_fin } : null),
    [periodoDatos],
  )

  const [texto, setTexto] = useState("")
  const [busqueda, setBusqueda] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), ESPERA_MS)
    return () => clearTimeout(t)
  }, [texto])
  const responsables = useOpcionesResponsablesQuery({ establecimiento: establecimientoId, search: busqueda })
  const responsableActual = responsables.data?.find((o) => o.es_usuario_actual)
  const responsable =
    responsableElegido ?? (inicial ? String(inicial.fk_tfuncionario_responsable) : responsableActual ? String(responsableActual.fk_tfuncionario) : "")
  const responsableOpciones = useMemo(() => {
    const lista = (responsables.data ?? []).map((o) => ({ value: String(o.fk_tfuncionario), label: o.nombre }))
    // El responsable guardado sigue visible aunque la búsqueda del servidor ya no lo traiga.
    if (inicial && !lista.some((o) => o.value === String(inicial.fk_tfuncionario_responsable)))
      lista.push({ value: String(inicial.fk_tfuncionario_responsable), label: inicial.responsable_nombre })
    return lista
  }, [responsables.data, inicial])

  const valores = { nombre, tipo, periodo, inicio, fin, responsable, fuente, meta, descripcion, requisitos }
  const errores = validarEstrategia(valores, limites)
  const error = (c: keyof typeof errores) => (s.intento ? errores[c] : undefined)

  const crear = useCrearEstrategia({
    mutationConfig: {
      onSuccess: (r) => {
        queueNotice("Estrategia creada. Ya puede agregar beneficiarios.", { variant: "success" })
        irEstrategiaEditar(r.id, true)
      },
      onError: (e: Error) => s.setError(e),
    },
  })
  const modificar = useModificarEstrategia({
    mutationConfig: {
      onSuccess: () => {
        queueNotice("Estrategia modificada.", { variant: "success" })
        volver()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const guardar = () => {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0 || !inicio) {
      enfocarPrimerError()
      return
    }
    const comun = {
      NOMBRE: nombre,
      FK_TIPO: Number(tipo),
      FECHA_INICIO: fechaParaBackend(inicio),
      FECHA_FIN: fin ? fechaParaBackend(fin) : null,
      FK_RESPONSABLE: Number(responsable),
      FUENTE_FINANCIACION: fuente.trim() || null,
      META: meta.trim() ? Number(meta) : null,
      DESCRIPCION: descripcion.trim(),
      REQUISITOS_INGRESO: requisitos.trim() || null,
    }
    if (inicial) modificar.mutate({ id: inicial.id, ...comun })
    else crear.mutate({ PERIODO_ACADEMICO: Number(periodo), ...comun })
  }

  return {
    editando,
    valores,
    set: {
      nombre: setNombre,
      tipo: setTipoElegido,
      periodo: setPeriodoElegido,
      inicio: setInicio,
      fin: setFin,
      responsable: setResponsableElegido,
      fuente: setFuente,
      meta: setMeta,
      descripcion: setDescripcion,
      requisitos: setRequisitos,
    },
    tipoOpciones,
    periodoOpciones,
    limites,
    responsableOpciones,
    onBuscarResponsable: setTexto,
    error,
    errorBackend: s.error,
    pending: crear.isPending || modificar.isPending,
    guardar,
    volver,
  }
}
