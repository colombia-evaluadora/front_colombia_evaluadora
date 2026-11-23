import { useEffect, useMemo, useState } from "react"

import { getErrorMessage } from "@/lib/api-client"
import { useNotify } from "@/components/notice/notice-context"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import { useAbrirCaso } from "@/features/gestion-estudiantil/reintegracion/api/mutations/casos"
import {
  useOpcionesMatriculasQuery,
  useOpcionesProfesionalesQuery,
  useOpcionesRazonesQuery,
} from "@/features/gestion-estudiantil/reintegracion/api/query/use-opciones-query"
import type { OpcionMatricula } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { useNavegacionReintegracion } from "@/features/gestion-estudiantil/reintegracion/hooks/use-navegacion-reintegracion"
import {
  errorOtraRazon,
  MOTIVO_APERTURA_MAX,
  RAZONES_VACIAS,
  razonesParaBackend,
  type RazonesForm,
} from "@/features/gestion-estudiantil/reintegracion/utils/razones"

const ESPERA_MS = 300
const ORIGEN_APERTURA = "APERTURA_MANUAL"
/** El backend responde 23505/409 con este texto cuando el estudiante ya tiene un caso abierto. */
const YA_ABIERTO = /ya tiene un caso de reintegraci/i
const etiquetaMatricula = (o: OpcionMatricula) => `${o.estudiante_nombre} · ${o.grado_grupo} · ${o.jornada_nombre}`

/** Estado, validación y envío de «Abrir caso» (G.9.ABR.1). Origen y fecha de apertura no se piden. */
export function useAbrirCasoForm() {
  const { notify } = useNotify()
  const { irBandeja, irCaso } = useNavegacionReintegracion()
  const s = useEstadoDialogo()
  const { establecimientoId } = useOpcionesCascada("", "")

  const [matricula, setMatricula] = useState("")
  const [texto, setTexto] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [elegidas, setElegidas] = useState<Record<string, OpcionMatricula>>({})
  const [motivo, setMotivo] = useState("")
  const [profesional, setProfesional] = useState("")
  const [alta, setAlta] = useState(false)
  const [razones, setRazones] = useState<RazonesForm>(RAZONES_VACIAS)
  // Error de «ya tiene un caso abierto» que respondió el backend: va en el campo Estudiante, no en el banner.
  const [errorCasoAbierto, setErrorCasoAbierto] = useState<string | null>(null)

  // Etiqueta del origen «Apertura manual» desde la Lista de Valores, no texto fijo.
  const origenNombre = useCatalogo("ORIGEN_CASO_REINTEGRACION").find((o) => o.codigo === ORIGEN_APERTURA)?.label ?? ""
  // Fecha local de hoy (no `toISOString`, que en la tarde-noche cae en el día siguiente).
  const fechaApertura = useMemo(() => formatFecha(fechaParaBackend(new Date())), [])

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), ESPERA_MS)
    return () => clearTimeout(t)
  }, [texto])

  const matriculas = useOpcionesMatriculasQuery({ establecimiento: establecimientoId, search: busqueda }).data
  const razonesOpciones = useOpcionesRazonesQuery().data ?? []

  const filas = useMemo(() => {
    const mapa = new Map<string, OpcionMatricula>()
    for (const o of matriculas ?? []) mapa.set(String(o.fk_tmatricula), o)
    for (const [k, o] of Object.entries(elegidas)) if (!mapa.has(k)) mapa.set(k, o)
    return mapa
  }, [matriculas, elegidas])
  const matriculaOpciones = useMemo<Opcion[]>(
    () => [...filas.entries()].map(([value, o]) => ({ value, label: etiquetaMatricula(o) })),
    [filas],
  )
  const elegida = filas.get(matricula)

  const profesionales = useOpcionesProfesionalesQuery(elegida?.fk_tsede ?? null, elegida?.fk_tlv_jornada ?? null)
  const profesionalOpciones = useMemo<Opcion[]>(
    () => (profesionales.data ?? []).map((p) => ({ value: String(p.fk_tusuario), label: p.nombre })),
    [profesionales.data],
  )

  const elegirMatricula = (v: string) => {
    const fila = filas.get(v)
    if (fila) setElegidas((e) => ({ ...e, [v]: fila }))
    setMatricula(v)
    setErrorCasoAbierto(null)
    // El profesional depende de la sede y jornada de la matrícula.
    setProfesional("")
  }

  const errores: Partial<Record<"matricula" | "motivo" | "otraRazon" | "profesional", string>> = {}
  if (!matricula) errores.matricula = "El estudiante es obligatorio."
  else if (elegida?.caso_abierto) errores.matricula = `${elegida.estudiante_nombre} ya tiene un caso de reintegración abierto.`
  else if (errorCasoAbierto) errores.matricula = errorCasoAbierto
  const largo = motivo.trim().length
  if (largo === 0) errores.motivo = "El motivo de apertura es obligatorio."
  else if (largo > MOTIVO_APERTURA_MAX) errores.motivo = `El motivo de apertura admite máximo ${MOTIVO_APERTURA_MAX} caracteres.`
  const otra = errorOtraRazon(razones, razonesOpciones)
  if (otra) errores.otraRazon = otra
  if (!profesional) errores.profesional = "El profesional de trabajo social es obligatorio."
  // El aviso de caso abierto se ve en cuanto se elige el estudiante, antes de guardar.
  const error = (c: keyof typeof errores) =>
    c === "matricula" && (elegida?.caso_abierto || errorCasoAbierto) ? errores.matricula : s.intento ? errores[c] : undefined

  const mut = useAbrirCaso({
    mutationConfig: {
      onSuccess: ({ id }) => {
        notify("Caso de reintegración abierto.", { variant: "success" })
        irCaso(id, true)
      },
      onError: (e: Error) => {
        const mensaje = getErrorMessage(e)
        if (YA_ABIERTO.test(mensaje)) {
          setErrorCasoAbierto(mensaje)
          enfocarPrimerError()
        } else s.setError(e)
      },
    },
  })

  const guardar = () => {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0) {
      enfocarPrimerError()
      return
    }
    mut.mutate({
      MATRICULA: Number(matricula),
      MOTIVO: motivo,
      FK_PROFESIONAL: Number(profesional),
      ALTA_COMPLEJIDAD: alta,
      ...razonesParaBackend(razones, razonesOpciones),
    })
  }

  return {
    volver: irBandeja,
    sinEstablecimiento: establecimientoId == null,
    matricula,
    matriculaOpciones,
    onBuscarMatricula: setTexto,
    elegirMatricula,
    motivo,
    setMotivo,
    profesional,
    setProfesional,
    profesionalOpciones,
    origenNombre,
    fechaApertura,
    alta,
    setAlta,
    razones,
    setRazones,
    razonesOpciones,
    error,
    errorBackend: s.error,
    pending: mut.isPending,
    guardar,
  }
}
