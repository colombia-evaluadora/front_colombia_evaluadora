import type {
  CitacionRow,
  HistorialCitacion,
  ItemCompromiso,
  CompromisoRow,
} from "@/features/gestion-estudiantil/citaciones/api/types"

// Datos de Citaciones y compromisos (Gestión Estudiantil 4.1 y 4.2) con la forma de las filas reales
// (V609-V615): snake_case, estados por código. Los pk de catálogo son inventados pero estables: los
// filtros del listado viajan por pk de TLISTA_VALOR (motivo, tipo, jornada).

export interface CatalogoMock {
  pk: number
  valor: string
  nombre: string
}

export const ESTADOS_CITACION_MOCK: CatalogoMock[] = [
  { pk: 301, valor: "POR_PROGRAMAR", nombre: "Por programar" },
  { pk: 302, valor: "PROGRAMADA", nombre: "Programada" },
  { pk: 303, valor: "CONFIRMADA", nombre: "Confirmada" },
  { pk: 304, valor: "ASISTIO", nombre: "Asistió" },
  { pk: 305, valor: "NO_ASISTIO", nombre: "No asistió" },
  { pk: 306, valor: "CANCELADA", nombre: "Cancelada" },
  { pk: 307, valor: "REALIZADA", nombre: "Realizada" },
]

export const MOTIVOS_CITACION_MOCK: CatalogoMock[] = [
  { pk: 311, valor: "ANOTACION", nombre: "Anotación" },
  { pk: 312, valor: "CASO_CONVIVENCIA", nombre: "Caso de convivencia" },
  { pk: 313, valor: "DILIGENCIA_DESCARGOS", nombre: "Diligencia de descargos" },
  { pk: 314, valor: "SENAL_SALUD_MENTAL", nombre: "Señal de salud mental" },
  { pk: 315, valor: "PLAN_ACOMPANAMIENTO", nombre: "Plan de acompañamiento" },
  { pk: 316, valor: "SITUACION_ACADEMICA", nombre: "Situación académica" },
  { pk: 317, valor: "COMPROMISO", nombre: "Compromiso" },
  { pk: 318, valor: "OTRO", nombre: "Otro" },
]

/** Motivos que solo genera el sistema (`fn_citacion_validar_motivo`). */
export const MOTIVOS_SOLO_SISTEMA = ["CASO_CONVIVENCIA", "DILIGENCIA_DESCARGOS", "SENAL_SALUD_MENTAL"]

export const TIPOS_COMPROMISO_MOCK: CatalogoMock[] = [
  { pk: 321, valor: "ACADEMICO", nombre: "Académico" },
  { pk: 322, valor: "CONVIVENCIA", nombre: "Convivencia" },
]

export const RESPONSABLES_COMPROMISO_MOCK: CatalogoMock[] = [
  { pk: 331, valor: "ESTUDIANTE", nombre: "Estudiante" },
  { pk: 332, valor: "ACUDIENTE", nombre: "Acudiente" },
  { pk: 333, valor: "INSTITUCION", nombre: "Institución" },
]

export const ESTADOS_COMPROMISO_MOCK: CatalogoMock[] = [
  { pk: 341, valor: "PENDIENTE_ACEPTACION", nombre: "Pendiente de aceptación" },
  { pk: 342, valor: "VIGENTE", nombre: "Vigente" },
  { pk: 343, valor: "CUMPLIDO", nombre: "Cumplido" },
  { pk: 344, valor: "INCUMPLIDO", nombre: "Incumplido" },
]

export const SEDES_MOCK = [
  { pk: 3, nombre: "IE Central" },
  { pk: 4, nombre: "Sede Norte" },
]

export const JORNADAS_MOCK = [
  { pk: 12, nombre: "Mañana" },
  { pk: 13, nombre: "Tarde" },
]

export const GRUPOS_MOCK = [
  { fk_tgrupo: 77, fk_tsede: 3, fk_tlv_jornada: 12, grupo_etiqueta: "Quinto A" },
  { fk_tgrupo: 78, fk_tsede: 3, fk_tlv_jornada: 12, grupo_etiqueta: "Sexto B" },
  { fk_tgrupo: 79, fk_tsede: 3, fk_tlv_jornada: 13, grupo_etiqueta: "Séptimo A" },
  { fk_tgrupo: 80, fk_tsede: 4, fk_tlv_jornada: 12, grupo_etiqueta: "Noveno A" },
]

/** El usuario que el mock considera «quien atiende» para `es_propia`/`es_propio`. */
export const FUNCIONARIO_ACTUAL_MOCK = 89

export const FUNCIONARIOS_MOCK = [
  { pk: 88, nombre: "Carlos Medina Ríos" },
  { pk: 89, nombre: "Juan Ramírez Soto" },
]

export interface EstudianteMock {
  matricula: number
  nombre: string
  documento: string
  acudiente: string
  grupo: number
  grado_grupo: string
  sede: number
  jornada: number
}

export const ESTUDIANTES_MOCK: EstudianteMock[] = [
  { matricula: 5531, nombre: "Luis Pérez Rincón", documento: "1020304050", acudiente: "Rosa Rincón", grupo: 77, grado_grupo: "Quinto A", sede: 3, jornada: 12 },
  { matricula: 5532, nombre: "Sara Gil Moreno", documento: "1020304051", acudiente: "Marta León", grupo: 78, grado_grupo: "Sexto B", sede: 3, jornada: 12 },
  { matricula: 5533, nombre: "Tomás Díaz Arango", documento: "1020304052", acudiente: "Nelly Arango", grupo: 79, grado_grupo: "Séptimo A", sede: 3, jornada: 13 },
  { matricula: 5534, nombre: "Kevin Suárez Mora", documento: "1020304053", acudiente: "Gloria Suárez", grupo: 80, grado_grupo: "Noveno A", sede: 4, jornada: 12 },
  { matricula: 5535, nombre: "Ana Ruiz Gómez", documento: "1020304054", acudiente: "Pablo Ruiz", grupo: 77, grado_grupo: "Quinto A", sede: 3, jornada: 12 },
]

const pad = (n: number) => String(n).padStart(2, "0")

/** `yyyy-MM-ddTHH:mm:00` a `dias` días de hoy (hora local de Colombia, sin zona), como el TIMESTAMP real. */
function enDias(dias: number, hora: number, minuto = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hora)}:${pad(minuto)}:00`
}

const soloFecha = (dias: number) => enDias(dias, 0).slice(0, 10)

const porValor = (lista: CatalogoMock[], valor: string) => lista.find((c) => c.valor === valor)!
const funcionario = (pk: number) => FUNCIONARIOS_MOCK.find((f) => f.pk === pk)!

type SemillaCitacion = Pick<CitacionRow, "id" | "fecha_programada" | "estado_valor"> &
  Partial<CitacionRow> & { estudiante: number; motivo: string; atiende: number }

export function construirCitacion(semilla: SemillaCitacion): CitacionRow {
  const { estudiante, motivo: motivoValor, atiende: atiendeId, ...s } = semilla
  const est = ESTUDIANTES_MOCK.find((e) => e.matricula === estudiante)!
  const motivo = porValor(MOTIVOS_CITACION_MOCK, motivoValor)
  const estado = porValor(ESTADOS_CITACION_MOCK, s.estado_valor)
  const atiende = funcionario(atiendeId)
  const sede = SEDES_MOCK.find((x) => x.pk === est.sede)!
  const jornada = JORNADAS_MOCK.find((x) => x.pk === est.jornada)!
  return {
    fk_tmatricula: est.matricula,
    estudiante_nombre: est.nombre,
    estudiante_documento: est.documento,
    fk_tgrupo: est.grupo,
    grado_grupo: est.grado_grupo,
    fk_tsede: sede.pk,
    sede_nombre: sede.nombre,
    fk_tlv_jornada: jornada.pk,
    jornada_nombre: jornada.nombre,
    acudiente_nombre: est.acudiente,
    fk_tlv_motivo: motivo.pk,
    motivo_valor: motivo.valor,
    motivo_nombre: motivo.nombre,
    estado_nombre: estado.nombre,
    fk_tfuncionario_atiende: atiende.pk,
    atiende_nombre: atiende.nombre,
    fk_tfuncionario_cita: atiende.pk,
    cita_nombre: atiende.nombre,
    lugar: "Coordinación",
    texto_acudiente: "Citamos para revisar la situación de su estudiante.",
    texto_fijo: false,
    es_automatica: false,
    origen_tipo: null,
    origen_id: null,
    resumen: null,
    motivo_cancelacion: null,
    es_propia: atiende.pk === FUNCIONARIO_ACTUAL_MOCK,
    total_count: 0,
    ...s,
  } as CitacionRow
}

const TEXTO_FIJO_CONVIVENCIA =
  "Hubo una situación de convivencia que involucra a su estudiante y requiere su presencia."

export const citacionesDb: CitacionRow[] = [
  construirCitacion({
    id: 101, estudiante: 5531, motivo: "CASO_CONVIVENCIA", estado_valor: "POR_PROGRAMAR", fecha_programada: null,
    atiende: 88, lugar: null, es_automatica: true, texto_fijo: true, texto_acudiente: TEXTO_FIJO_CONVIVENCIA,
    origen_tipo: "CASO_CONVIVENCIA", origen_id: 14,
  }),
  construirCitacion({
    id: 102, estudiante: 5534, motivo: "CASO_CONVIVENCIA", estado_valor: "PROGRAMADA", fecha_programada: enDias(3, 14),
    atiende: 88, lugar: "Coordinación, sede Norte", es_automatica: true, texto_fijo: true,
    texto_acudiente: TEXTO_FIJO_CONVIVENCIA, origen_tipo: "CASO_CONVIVENCIA", origen_id: 15,
  }),
  construirCitacion({
    id: 103, estudiante: 5532, motivo: "ANOTACION", estado_valor: "PROGRAMADA", fecha_programada: enDias(5, 9),
    atiende: 89, lugar: "Salón 6B", origen_tipo: "ANOTACION", origen_id: 220,
    texto_acudiente: "Citamos para conversar sobre una anotación reciente de su estudiante.",
  }),
  construirCitacion({
    id: 104, estudiante: 5533, motivo: "SITUACION_ACADEMICA", estado_valor: "CONFIRMADA", fecha_programada: enDias(2, 15, 30),
    atiende: 89, lugar: "Sala de profesores",
    texto_acudiente: "Citamos para revisar el desempeño académico del periodo.",
  }),
  // Ya pasó y sigue Programada: habilita «Registrar asistencia» para quien atiende (89).
  construirCitacion({
    id: 108, estudiante: 5535, motivo: "SITUACION_ACADEMICA", estado_valor: "PROGRAMADA", fecha_programada: enDias(-1, 10),
    atiende: 89, lugar: "Sala de profesores",
    texto_acudiente: "Citamos para revisar las notas de matemáticas.",
  }),
  // Segunda ya vencida de quien atiende (89): permite probar «No asistió» además de «Asistió».
  construirCitacion({
    id: 110, estudiante: 5531, motivo: "SITUACION_ACADEMICA", estado_valor: "CONFIRMADA", fecha_programada: enDias(-2, 8),
    atiende: 89, lugar: "Salón 5A",
    texto_acudiente: "Citamos para conversar sobre las tareas pendientes de su estudiante.",
  }),
  construirCitacion({
    id: 105, estudiante: 5532, motivo: "SITUACION_ACADEMICA", estado_valor: "ASISTIO", fecha_programada: enDias(-5, 10),
    atiende: 89, lugar: "Sala de profesores", resumen: "La acudiente asistió y se acordó un plan de refuerzo en matemáticas.",
  }),
  construirCitacion({
    id: 106, estudiante: 5533, motivo: "CASO_CONVIVENCIA", estado_valor: "NO_ASISTIO", fecha_programada: enDias(-7, 14),
    atiende: 88, lugar: "Coordinación", es_automatica: true, texto_fijo: true, texto_acudiente: TEXTO_FIJO_CONVIVENCIA,
    origen_tipo: "CASO_CONVIVENCIA", origen_id: 12, resumen: "La acudiente no se presentó ni avisó.",
  }),
  construirCitacion({
    id: 107, estudiante: 5534, motivo: "ANOTACION", estado_valor: "CANCELADA", fecha_programada: enDias(-9, 7, 30),
    atiende: 88, lugar: "Coordinación", origen_tipo: "ANOTACION", origen_id: 198,
    motivo_cancelacion: "La acudiente informó que no puede asistir esa semana.",
  }),
  construirCitacion({
    id: 109, estudiante: 5535, motivo: "DILIGENCIA_DESCARGOS", estado_valor: "POR_PROGRAMAR", fecha_programada: null,
    atiende: 89, lugar: null, es_automatica: true, origen_tipo: "PROCESO_DISCIPLINARIO", origen_id: 6,
    texto_acudiente: "Se le cita a la diligencia de descargos de su estudiante.",
  }),
]

export const historialDb: Record<number, HistorialCitacion[]> = {
  106: [
    {
      evento: "INASISTENCIA",
      fecha_programada: enDias(-7, 14),
      lugar: "Coordinación",
      resumen: "La acudiente no se presentó ni avisó.",
      registrado_en: enDias(-7, 15),
    },
  ],
}

type SemillaCompromiso = Pick<CompromisoRow, "id" | "fecha" | "fecha_revision" | "estado_valor"> &
  Partial<CompromisoRow> & { estudiante: number; tipo: string; creador: number }

export function construirCompromiso(semilla: SemillaCompromiso): CompromisoRow {
  const { estudiante, tipo: tipoValor, creador, ...s } = semilla
  const est = ESTUDIANTES_MOCK.find((e) => e.matricula === estudiante)!
  const tipo = porValor(TIPOS_COMPROMISO_MOCK, tipoValor)
  const estado = porValor(ESTADOS_COMPROMISO_MOCK, s.estado_valor)
  const crea = funcionario(creador)
  const sede = SEDES_MOCK.find((x) => x.pk === est.sede)!
  const jornada = JORNADAS_MOCK.find((x) => x.pk === est.jornada)!
  return {
    fk_tmatricula: est.matricula,
    estudiante_nombre: est.nombre,
    estudiante_documento: est.documento,
    fk_tgrupo: est.grupo,
    grado_grupo: est.grado_grupo,
    fk_tsede: sede.pk,
    sede_nombre: sede.nombre,
    fk_tlv_jornada: jornada.pk,
    jornada_nombre: jornada.nombre,
    fk_tlv_tipo: tipo.pk,
    tipo_valor: tipo.valor,
    tipo_nombre: tipo.nombre,
    estado_nombre: estado.nombre,
    origen_tipo: null,
    origen_id: null,
    aceptado_presencialmente: false,
    fk_tarchivo_soporte: null,
    observacion_resultado: null,
    fk_tfuncionario_crea: crea.pk,
    crea_nombre: crea.nombre,
    es_propio: crea.pk === FUNCIONARIO_ACTUAL_MOCK,
    total_count: 0,
    ...s,
  } as CompromisoRow
}

const item = (id: number, descripcion: string, responsable: string, plazoDias: number): ItemCompromiso => {
  const r = porValor(RESPONSABLES_COMPROMISO_MOCK, responsable)
  return { id, descripcion, fk_tlv_responsable: r.pk, responsable: r.nombre, plazo: soloFecha(plazoDias) }
}

export const compromisosDb: CompromisoRow[] = [
  construirCompromiso({
    id: 40, estudiante: 5535, tipo: "ACADEMICO", estado_valor: "PENDIENTE_ACEPTACION", fecha: soloFecha(-2),
    fecha_revision: soloFecha(28), creador: 89,
  }),
  construirCompromiso({
    id: 41, estudiante: 5532, tipo: "ACADEMICO", estado_valor: "PENDIENTE_ACEPTACION", fecha: soloFecha(-4),
    fecha_revision: soloFecha(26), creador: 88, origen_tipo: "CITACION", origen_id: 105,
  }),
  construirCompromiso({
    id: 42, estudiante: 5533, tipo: "CONVIVENCIA", estado_valor: "VIGENTE", fecha: soloFecha(-20),
    fecha_revision: soloFecha(10), creador: 89, aceptado_presencialmente: true, fk_tarchivo_soporte: 9001,
  }),
  construirCompromiso({
    id: 43, estudiante: 5531, tipo: "ACADEMICO", estado_valor: "CUMPLIDO", fecha: soloFecha(-50),
    fecha_revision: soloFecha(-20), creador: 89, aceptado_presencialmente: true, fk_tarchivo_soporte: 9002,
    observacion_resultado: "Entregó todos los talleres a tiempo.",
  }),
  construirCompromiso({
    id: 44, estudiante: 5534, tipo: "ACADEMICO", estado_valor: "INCUMPLIDO", fecha: soloFecha(-60),
    fecha_revision: soloFecha(-30), creador: 88, observacion_resultado: "No aceptado",
  }),
]

export const itemsDb: Record<number, ItemCompromiso[]> = {
  40: [item(400, "Entregar el taller de matemáticas completo.", "ESTUDIANTE", 14)],
  41: [
    item(410, "Asistir a las tutorías de refuerzo los martes.", "ESTUDIANTE", 20),
    item(411, "Firmar el cuaderno de seguimiento cada semana.", "ACUDIENTE", 26),
  ],
  42: [
    item(420, "Pedir disculpas por escrito al compañero afectado.", "ESTUDIANTE", -15),
    item(421, "Acompañar al estudiante en el cumplimiento del plan.", "ACUDIENTE", 10),
  ],
  43: [item(430, "Entregar los talleres pendientes de ciencias.", "ESTUDIANTE", -30)],
  44: [item(440, "Presentar el proyecto de lectura del periodo.", "ESTUDIANTE", -35)],
}
