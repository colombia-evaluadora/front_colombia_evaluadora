import { useEffect, useMemo, useState } from "react"

import { getErrorMessage, isConflictError } from "@/lib/api-client"
import { useNotify } from "@/components/notice/notice-context"

import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import {
  useCrearAcompConsumo,
  useCrearAcompEmbarazo,
  useModificarAcompConsumo,
  useModificarAcompEmbarazo,
} from "@/features/gestion-estudiantil/prevencion/api/mutations/acompanamientos"
import {
  useAcompanamientoQuery,
  useContextoMatriculaQuery,
  useOpcionesAtencionesAcompQuery,
  useOpcionesResponsablesAcompQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-acompanamientos-query"
import type { ResultadoEscritura, TipoAcompanamiento } from "@/features/gestion-estudiantil/prevencion/api/types"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"
import { useSelectorEstudiantePrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-selector-estudiante-prevencion"
import {
  consumoParaBackend,
  embarazoParaBackend,
  validarAcomp,
  valoresAcompVacios,
  valoresDesdeDetalle,
  type ValoresAcomp,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-acompanamiento"

const aOpciones = (l: { value: string; label: string }[]) => l.map((o) => ({ value: o.value, label: o.label }))

interface Opciones {
  /** Nuevo: el tipo viene de la ruta. */
  tipo?: TipoAcompanamiento
  /** Modificar: el tipo y los valores salen del detalle. */
  acompId?: number
}

/** Estado, validación y envío de Nuevo / Modificar acompañamiento (G.8.EMB.3, G.8.CON.3). */
export function useAcompanamientoForm({ tipo: tipoRuta, acompId }: Opciones) {
  const { notify } = useNotify()
  const { volver, irAcomp } = useNavegacionPrevencion()
  const s = useEstadoDialogo()
  const editar = acompId != null
  const detalleQ = useAcompanamientoQuery(acompId)
  const detalle = detalleQ.data
  const tipo: TipoAcompanamiento = detalle?.tipo ?? tipoRuta ?? "EMBARAZO"

  const { establecimientoId } = useAmbitoPrevencion("")
  const selector = useSelectorEstudiantePrevencion({ establecimiento: establecimientoId, saludMental: true })

  const [v, setV] = useState<ValoresAcomp>(valoresAcompVacios)
  const [cargado, setCargado] = useState(false)
  useEffect(() => {
    if (detalle && !cargado) {
      setV(valoresDesdeDetalle(detalle))
      setCargado(true)
    }
  }, [detalle, cargado])
  const set = (parcial: Partial<ValoresAcomp>) => setV((prev) => ({ ...prev, ...parcial }))

  // En Modificar el estudiante no cambia (el endpoint no lo recibe).
  const matricula = editar ? (detalle ? Number(detalle.contexto.fk_tmatricula) : undefined) : selector.matricula
  const estudiante = editar ? String(matricula ?? "") : selector.estudiante
  // Nuevo: el contexto de Cobertura del estudiante elegido (en Modificar viene en el detalle).
  const contextoQ = useContextoMatriculaQuery(selector.matricula, !editar)

  // Listas (TLV): etiquetas y códigos del catálogo, nunca valores quemados.
  const situaciones = useCatalogo("SITUACION_ACOMP_EMBARAZO")
  const respuestas = useCatalogo("RESPUESTA_ACOMPANAMIENTO")
  const origenes = useCatalogo("ORIGEN_INFO_CONSUMO")
  const sustancias = useCatalogo("SUSTANCIA_CONSUMO")
  const lugares = useCatalogo("LUGAR_CONSUMO")

  const atencionesQ = useOpcionesAtencionesAcompQuery(matricula, tipo === "EMBARAZO")
  const [buscarResponsable, setBuscarResponsable] = useState("")
  const responsablesQ = useOpcionesResponsablesAcompQuery({ matricula, soloOrientacion: true, search: buscarResponsable })

  const atencionOpciones = useMemo(
    () =>
      (atencionesQ.data ?? []).map((a) => ({
        value: String(a.id),
        label: [formatFecha(a.fecha), "Atención", a.motivo_nombre].filter(Boolean).join(" · "),
      })),
    [atencionesQ.data],
  )
  const responsableOpciones = useMemo(() => {
    const lista = (responsablesQ.data ?? []).map((r) => ({ value: String(r.fk_tfuncionario), label: r.nombre }))
    // El responsable guardado sigue visible aunque la búsqueda no lo traiga.
    if (detalle && !lista.some((o) => o.value === String(detalle.fk_tfuncionario_responsable)))
      lista.push({ value: String(detalle.fk_tfuncionario_responsable), label: detalle.responsable_nombre })
    return lista
  }, [responsablesQ.data, detalle])

  // Nuevo: el usuario (primera fila, es_usuario_actual) queda como Responsable por defecto.
  const actual = responsablesQ.data?.find((r) => r.es_usuario_actual)
  useEffect(() => {
    if (!editar && actual && !v.responsable) setV((prev) => ({ ...prev, responsable: String(actual.fk_tfuncionario) }))
  }, [editar, actual, v.responsable])

  // Al cambiar de estudiante, la atención de origen deja de valer.
  const [ultimaMatricula, setUltimaMatricula] = useState(matricula)
  if (!editar && matricula !== ultimaMatricula) {
    setUltimaMatricula(matricula)
    setV((prev) => ({ ...prev, atencion: "" }))
  }

  const codigos = { sustancia: codigoDe(sustancias, v.sustancia), lugar: codigoDe(lugares, v.lugar) }
  const errores = validarAcomp(tipo, { ...v, estudiante }, codigos)
  const error = (c: keyof ValoresAcomp) => (s.intento ? errores[c] : undefined)

  const [duplicado, setDuplicado] = useState<string | null>(null)

  const onSuccess = (r: ResultadoEscritura) => {
    notify(editar ? "Acompañamiento modificado." : "Acompañamiento registrado: queda Abierto.", { variant: "success" })
    irAcomp(r?.id ?? acompId!, true)
  }
  const onError = (e: Error) => {
    // 409 del aviso de duplicado (fn_prevencion_acomp_validar_duplicado): se advierte y se permite continuar.
    if (!editar && isConflictError(e)) setDuplicado(getErrorMessage(e))
    else s.setError(e)
  }
  const cfg = { mutationConfig: { onSuccess, onError } }
  const crearEmb = useCrearAcompEmbarazo(cfg)
  const crearCon = useCrearAcompConsumo(cfg)
  const modEmb = useModificarAcompEmbarazo(cfg)
  const modCon = useModificarAcompConsumo(cfg)
  const pending = crearEmb.isPending || crearCon.isPending || modEmb.isPending || modCon.isPending

  const enviar = (crearDeTodosModos = false) => {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0) {
      enfocarPrimerError()
      return
    }
    setDuplicado(null)
    if (tipo === "EMBARAZO") {
      const datos = embarazoParaBackend(v)
      if (editar) modEmb.mutate({ id: acompId, ...datos })
      else crearEmb.mutate({ ...datos, MATRICULA: Number(estudiante), CREAR_DE_TODOS_MODOS: crearDeTodosModos })
    } else {
      const datos = consumoParaBackend(v, codigos)
      if (editar) modCon.mutate({ id: acompId, ...datos })
      else crearCon.mutate({ ...datos, MATRICULA: Number(estudiante), CREAR_DE_TODOS_MODOS: crearDeTodosModos })
    }
  }

  const opcionEstudiante = selector.opciones.find((o) => o.value === selector.estudiante)

  return {
    tipo,
    editar,
    detalle,
    cargando: editar && detalleQ.isPending,
    errorCarga: editar && detalleQ.isError ? (detalleQ.error ?? true) : null,
    selector,
    opcionEstudiante,
    contexto: editar ? (detalle?.contexto ?? null) : (contextoQ.data ?? null),
    matricula,
    v,
    set,
    error,
    errorBackend: s.error,
    listas: {
      situaciones: aOpciones(situaciones),
      respuestas,
      origenes: aOpciones(origenes),
      sustancias: aOpciones(sustancias),
      lugares: aOpciones(lugares),
    },
    codigos,
    atencionOpciones,
    responsableOpciones,
    onBuscarResponsable: setBuscarResponsable,
    pending,
    guardar: () => enviar(false),
    duplicado,
    cerrarDuplicado: () => setDuplicado(null),
    crearDeTodosModos: () => enviar(true),
    volver,
  }
}
