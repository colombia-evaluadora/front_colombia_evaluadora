"use no memo"

import { useCallback, useMemo, useState } from "react"

import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { enfocarPrimerError, errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import {
  useCrearActividad,
  useModificarActividad,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/mutations/actividades"
import { useResponsablesQuery } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-actividades-query"
import { usePeriodoAcademicoDeJornada } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-periodo-academico-query"
import { useParametrosServicioSocialQuery } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-servicio-social-query"
import {
  TIPO_SERVICIO_SOCIAL,
  type ActividadDetalle,
  type EstadoActividad,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { useNavegacionActividades } from "@/features/gestion-estudiantil/actividades-extracurriculares/hooks/use-navegacion-actividades"
import { encolarExito } from "@/features/gestion-estudiantil/actividades-extracurriculares/utils/avisos"
import {
  dateAFechaIso,
  enteroPositivo,
  fechaIsoADate,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/utils/formatos-actividad"

export const NOMBRE_MIN = 3
export const NOMBRE_MAX = 100
export const HORARIO_MAX = 150
export const EXTERNO_MAX = 150
export const DESCRIPCION_MAX = 1000

export type CampoActividad =
  | "nombre"
  | "tipo"
  | "responsable"
  | "sede"
  | "jornada"
  | "inicio"
  | "fin"
  | "cupo"
  | "grados"
  | "supervisor"

/**
 * Estado, validación y envío del formulario de la actividad (G.5.ACT.NUE): crea (sin `actividad`) o modifica.
 * Al modificar, Sede, Jornada, Período y Estado no cambian. El Período Académico no se elige: sale de la
 * Jornada de la sede (la cascada de Informes lo trae por jornada).
 */
export function useActividadForm(actividad?: ActividadDetalle) {
  const edicion = actividad != null
  const { irListado, irActividad } = useNavegacionActividades()
  const s = useEstadoDialogo()

  const [nombre, setNombre] = useState(actividad?.nombre ?? "")
  const [tipo, setTipo] = useState(actividad ? String(actividad.fk_tlv_tipo) : "")
  const [sede, setSede] = useState(actividad ? String(actividad.fk_tsede) : "")
  const [jornada, setJornada] = useState(actividad ? String(actividad.fk_tlv_jornada) : "")
  const [responsable, setResponsable] = useState(actividad ? String(actividad.fk_tfuncionario_responsable) : "")
  const [inicio, setInicio] = useState<Date | undefined>(fechaIsoADate(actividad?.fecha_inicio))
  const [fin, setFin] = useState<Date | undefined>(fechaIsoADate(actividad?.fecha_fin))
  const [horario, setHorario] = useState(actividad?.horario ?? "")
  const [cupo, setCupo] = useState(actividad?.cupo != null ? String(actividad.cupo) : "")
  const [grados, setGrados] = useState<number[]>(actividad?.grados.map((g) => g.pk) ?? [])
  const [registraAsistencia, setRegistraAsistencia] = useState(actividad?.registra_asistencia ?? false)
  const [entidad, setEntidad] = useState(actividad?.entidad_externa ?? "")
  const [supervisor, setSupervisor] = useState(actividad?.supervisor_externo ?? "")
  const [estado, setEstado] = useState<EstadoActividad>("ACTIVA")
  const [descripcion, setDescripcion] = useState(actividad?.descripcion ?? "")

  const tipos = useCatalogo("TIPO_ACTIVIDAD_EXTRA")
  const esServicioSocial = codigoDe(tipos, tipo) === TIPO_SERVICIO_SOCIAL
  const cascada = useOpcionesCascada(sede, jornada)
  const periodo = usePeriodoAcademicoDeJornada(sede, jornada)
  const parametros = useParametrosServicioSocialQuery(esServicioSocial).data
  const responsables = useResponsablesQuery(sede ? Number(sede) : null, jornada ? Number(jornada) : null).data

  const tipoOpciones = useMemo<Opcion[]>(() => tipos.map((t) => ({ value: t.value, label: t.label })), [tipos])

  const responsableOpciones = useMemo<Opcion[]>(() => {
    const lista = (responsables ?? []).map((r) => ({ value: String(r.id), label: r.nombre }))
    // Al modificar, el responsable vigente aparece aunque la lista aún no haya cargado.
    if (
      actividad &&
      responsable === String(actividad.fk_tfuncionario_responsable) &&
      !lista.some((o) => o.value === responsable)
    )
      lista.push({ value: responsable, label: actividad.responsable_nombre })
    return lista
  }, [responsables, actividad, responsable])

  const gradosPermitidos = useCallback(
    (lista: Opcion[]) => {
      if (!esServicioSocial || !parametros) return lista
      // Los grados del servicio social vienen por VALOR del catálogo GRADOS; el grado de la sede, por su código.
      const permitidos = new Set(parametros.grados.map((g) => g.valor))
      return lista.filter((g) => permitidos.has(cascada.gradoCodigos.get(g.value) ?? ""))
    },
    [esServicioSocial, parametros, cascada.gradoCodigos],
  )

  const gradoOpciones = useMemo<Opcion[]>(() => {
    const base = new Map(gradosPermitidos(cascada.gradoOpciones).map((g) => [g.value, g]))
    // Los grados ya guardados se conservan en la lista aunque la cascada sea de otro año o el filtro no los ofrezca.
    for (const g of actividad?.grados ?? [])
      if (!base.has(String(g.pk))) base.set(String(g.pk), { value: String(g.pk), label: g.nombre })
    return [...base.values()]
  }, [cascada.gradoOpciones, actividad, gradosPermitidos])

  const elegirSede = useCallback((v: string) => {
    setSede(v)
    setJornada("")
    setResponsable("")
    setGrados([])
  }, [])
  const elegirJornada = useCallback((v: string) => {
    setJornada(v)
    setResponsable("")
    setGrados([])
  }, [])
  const elegirTipo = useCallback(
    (v: string) => {
      setTipo(v)
      if (codigoDe(tipos, v) === TIPO_SERVICIO_SOCIAL) {
        setRegistraAsistencia(true)
        // Quita los grados que el servicio social no admite.
        if (parametros) {
          const permitidos = new Set(parametros.grados.map((g) => g.valor))
          const validos = new Set(
            cascada.gradoOpciones.filter((g) => permitidos.has(cascada.gradoCodigos.get(g.value) ?? "")).map((g) => Number(g.value)),
          )
          setGrados((gs) => gs.filter((g) => validos.has(g)))
        }
      } else {
        setEntidad("")
        setSupervisor("")
      }
    },
    [tipos, parametros, cascada.gradoOpciones, cascada.gradoCodigos],
  )

  const errores: Partial<Record<CampoActividad, string>> = {}
  const eNombre = errorLargo(nombre, NOMBRE_MIN, NOMBRE_MAX, "El nombre")
  if (eNombre) errores.nombre = eNombre
  if (!tipo) errores.tipo = "El tipo de actividad es obligatorio."
  if (!sede) errores.sede = "La sede es obligatoria."
  if (!jornada) errores.jornada = "La jornada es obligatoria."
  else if (!edicion && periodo.id == null) errores.jornada = "La jornada no tiene un Período Académico vigente."
  if (!responsable) errores.responsable = "El responsable es obligatorio."
  if (!inicio) errores.inicio = "La fecha de inicio es obligatoria."
  if (!fin) errores.fin = "La fecha de fin es obligatoria."
  else if (inicio && fin <= inicio) errores.fin = "La fecha de fin debe ser posterior a la fecha de inicio."
  if (cupo.trim() && enteroPositivo(cupo) == null) errores.cupo = "El cupo debe ser un número entero mayor o igual a 1."
  if (grados.length === 0) errores.grados = "Elija al menos un grado."
  if (entidad.trim() && !supervisor.trim())
    errores.supervisor = "El supervisor externo es obligatorio si hay entidad externa."
  const error = (c: CampoActividad) => (s.intento ? errores[c] : undefined)

  const alExito = ({ id }: { id: number }) => {
    encolarExito(edicion ? "Actividad actualizada." : "Actividad creada.")
    irActividad(id)
  }
  const crear = useCrearActividad({ mutationConfig: { onSuccess: alExito, onError: (e: Error) => s.setError(e) } })
  const modificar = useModificarActividad({
    mutationConfig: { onSuccess: alExito, onError: (e: Error) => s.setError(e) },
  })

  const guardar = () => {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0) {
      enfocarPrimerError()
      return
    }
    const comun = {
      NOMBRE: nombre,
      FK_TIPO: Number(tipo),
      DESCRIPCION: descripcion.trim() || null,
      FK_RESPONSABLE: Number(responsable),
      FECHA_INICIO: dateAFechaIso(inicio!),
      FECHA_FIN: dateAFechaIso(fin!),
      HORARIO: horario.trim() || null,
      GRADOS: grados,
      CUPO: enteroPositivo(cupo),
      ENTIDAD_EXTERNA: esServicioSocial ? entidad.trim() || null : null,
      SUPERVISOR_EXTERNO: esServicioSocial && entidad.trim() ? supervisor.trim() : null,
      REGISTRA_ASISTENCIA: esServicioSocial ? true : registraAsistencia,
    }
    if (actividad) modificar.mutate({ id: actividad.id, ...comun })
    else
      crear.mutate({
        ...comun,
        FK_SEDE: Number(sede),
        FK_JORNADA: Number(jornada),
        FK_PERIODO: periodo.id!,
        ESTA_ACTIVA: estado === "ACTIVA",
      })
  }

  const volver = () => (actividad ? irActividad(actividad.id) : irListado())

  return {
    edicion,
    titulo: edicion ? "Modificar actividad" : "Nueva actividad",
    nombre,
    setNombre,
    tipo,
    elegirTipo,
    tipoOpciones,
    sede,
    elegirSede,
    sedeOpciones: cascada.sedeOpciones,
    jornada,
    elegirJornada,
    jornadaOpciones: cascada.jornadaOpciones,
    periodoNombre: edicion ? actividad.periodo_nombre : periodo.nombre,
    responsable,
    setResponsable,
    responsableOpciones,
    inicio,
    setInicio,
    fin,
    setFin,
    horario,
    setHorario,
    cupo,
    setCupo,
    grados,
    setGrados,
    gradoOpciones,
    registraAsistencia: esServicioSocial ? true : registraAsistencia,
    setRegistraAsistencia,
    esServicioSocial,
    entidad,
    setEntidad,
    supervisor,
    setSupervisor,
    estado,
    setEstado,
    descripcion,
    setDescripcion,
    error,
    errorBackend: s.error,
    pending: crear.isPending || modificar.isPending,
    guardar,
    volver,
  }
}

export type ActividadForm = ReturnType<typeof useActividadForm>
