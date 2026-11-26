import type { CodigoRow } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"
import type {
  AccesoConfiguracion,
  ClasificacionRow,
  EfectoSancion,
  NivelesConvivencia,
  PlazosDisciplinario,
  SancionRow,
} from "@/features/gestion-estudiantil/configuracion/api/types"
import type { ParametrosRiesgo } from "@/features/gestion-estudiantil/prevencion/api/types"
import type { PlazoRemisiones } from "@/features/gestion-estudiantil/reintegracion/api/types"

// Configuración de Gestión estudiantil (/app/gestion-estudiantil/configuracion): datos del prototipo.
// Un solo establecimiento (el id 1 de `/gestion-estudiantil/opciones/sedes`, mocks/handlers/informes.ts).
// Las listas de valores van con pk estables (84xx) para que filtros y formularios crucen por pk.

export const ESTABLECIMIENTO_CONFIGURACION = 1

interface FilaLista {
  pk_lista_valor: number
  nombre: string
  valor: string
  accion: null
}

const lista = (base: number, filas: [valor: string, nombre: string][]): FilaLista[] =>
  filas.map(([valor, nombre], i) => ({ pk_lista_valor: base + i + 1, nombre, valor, accion: null }))

/** TIPO_COMPORTAMIENTO: el front decide «Negativo» por NOMBRE (fn_observador_tipo_es_negativo). */
export const TIPO_COMPORTAMIENTO_MOCK = lista(8400, [
  ["POSITIVO", "Positivo"],
  ["NEGATIVO", "Negativo"],
])

/** TIPO_SITUACION (Ley 1620): VALOR TIPO_I/II/III, como lo compara Convivencia. */
export const TIPO_SITUACION_MOCK = lista(8410, [
  ["TIPO_I", "Tipo I"],
  ["TIPO_II", "Tipo II"],
  ["TIPO_III", "Tipo III"],
])

export const INSTANCIA_DISCIPLINARIA_MOCK = lista(8420, [
  ["COORDINADOR", "Coordinador"],
  ["RECTOR", "Rector"],
  ["CONSEJO_DIRECTIVO", "Consejo Directivo"],
  ["COMITE_CONVIVENCIA", "Comité Escolar de Convivencia"],
])

/** AVISO_ACUDIENTE_SM_SEGUIMIENTO: el PUT de parámetros guarda el VALOR (SIEMPRE o SOLO_ORIENTACION). */
export const AVISO_SM_MOCK = lista(8430, [
  ["SIEMPRE", "Siempre"],
  ["SOLO_ORIENTACION", "Solo si orientación lo indica"],
])

/** CAUSA_INASISTENCIA: C03, C04, C06 y C10 son las cuatro reservadas fijas (V698). */
export const CAUSA_INASISTENCIA_MOCK = lista(8440, [
  ["C01", "Enfermedad"],
  ["C02", "Calamidad doméstica"],
  ["C03", "Dificultades económicas"],
  ["C04", "Condiciones familiares"],
  ["C05", "Transporte"],
  ["C06", "Problemas de convivencia, acoso o violencia"],
  ["C10", "Presunta situación de trabajo infantil o explotación"],
])

export const CAUSAS_FIJAS = ["C03", "C04", "C06", "C10"]

/** Las que el establecimiento agregó a las fijas (ninguna al empezar). */
export const causasReservadasDb: { agregadas: string[] } = { agregadas: [] }

/** Efectos de sanción del sector (no oficial: llegan los cinco). */
export const EFECTOS_SANCION_MOCK: EfectoSancion[] = [
  { fk_tlv: 8451, codigo: "NINGUNO", nombre: "Ninguno", exige_duracion: false },
  { fk_tlv: 8452, codigo: "MATRICULA_OBSERVACION", nombre: "Matrícula en observación", exige_duracion: true },
  { fk_tlv: 8453, codigo: "SUSPENSION_ASISTENCIA", nombre: "Suspensión de asistencia", exige_duracion: true },
  { fk_tlv: 8454, codigo: "NO_RENOVACION_CUPO", nombre: "No renovación del cupo", exige_duracion: false },
  { fk_tlv: 8455, codigo: "CANCELACION_MATRICULA", nombre: "Cancelación de la matrícula", exige_duracion: false },
]

export const accesoConfiguracionDb: AccesoConfiguracion = {
  puede_ver: true,
  puede_crear: true,
  puede_editar: true,
  puede_eliminar: true,
  puede_editar_umbrales: true,
}

export const nivelesConvivenciaDb: NivelesConvivencia = {
  fk_testablecimiento: ESTABLECIMIENTO_CONFIGURACION,
  umbral_medio: null,
  umbral_alto: null,
  configurado: false,
  puede_editar: true,
}

export const plazosDisciplinarioDb: PlazosDisciplinario = { dias_descargos: 3, dias_recursos: 5, configurado: true }

const tipo = (valor: string) => TIPO_COMPORTAMIENTO_MOCK.find((t) => t.valor === valor)!
const situacion = (valor: string) => TIPO_SITUACION_MOCK.find((s) => s.valor === valor)!

/** Registro sin `total_count` (se calcula al listar). */
export type CodigoMock = Omit<CodigoRow, "total_count">

export function filaCodigo(
  id: number,
  codigo: string,
  descripcion: string,
  tipoValor: string,
  situacionValor: string | null,
  habilitado = true,
  en_uso = false,
): CodigoMock {
  const t = tipo(tipoValor)
  const s = situacionValor ? situacion(situacionValor) : null
  return {
    id,
    fk_establecimiento: ESTABLECIMIENTO_CONFIGURACION,
    codigo,
    descripcion,
    fk_tlv_tipo: t.pk_lista_valor,
    tipo_nombre: t.nombre,
    fk_tlv_situacion: s?.pk_lista_valor ?? null,
    situacion_codigo: s?.valor ?? null,
    situacion_nombre: s?.nombre ?? null,
    habilitado,
    en_uso,
  }
}

export const codigosAnotacionDb: CodigoMock[] = [
  filaCodigo(1, "P03", "Solidaridad con sus compañeros", "POSITIVO", null),
  filaCodigo(2, "P05", "Participación destacada en clase", "POSITIVO", null),
  filaCodigo(3, "N02", "Retardo injustificado", "NEGATIVO", "TIPO_I", true, true),
  filaCodigo(4, "N04", "Conflicto con compañeros en el aula", "NEGATIVO", "TIPO_I"),
  filaCodigo(5, "N07", "Agresión verbal", "NEGATIVO", "TIPO_II", true, true),
  filaCodigo(6, "N09", "Uso del celular en clase", "NEGATIVO", "TIPO_I", false),
  filaCodigo(7, "N15", "Agresión física con lesiones", "NEGATIVO", "TIPO_III"),
]

export type ClasificacionMock = Omit<ClasificacionRow, "total_count">

export const clasificacionesDb: ClasificacionMock[] = [
  {
    id: 1,
    fk_establecimiento: ESTABLECIMIENTO_CONFIGURACION,
    nombre: "Leve",
    descripcion: "Afecta levemente el ambiente escolar, sin daño a otras personas.",
    habilitado: true,
    en_uso: true,
  },
  {
    id: 2,
    fk_establecimiento: ESTABLECIMIENTO_CONFIGURACION,
    nombre: "Grave",
    descripcion: "Afecta la convivencia o los derechos de otras personas.",
    habilitado: true,
    en_uso: false,
  },
  {
    id: 3,
    fk_establecimiento: ESTABLECIMIENTO_CONFIGURACION,
    nombre: "Gravísima",
    descripcion: "Afecta gravemente la integridad de otras personas o puede constituir un delito.",
    habilitado: true,
    en_uso: false,
  },
]

export type SancionMock = Omit<SancionRow, "total_count">

export function filaSancion(
  id: number,
  nombre: string,
  instanciaValor: string,
  tiene_duracion: boolean,
  efectoCodigo: string,
  habilitado = true,
  en_uso = false,
  descripcion: string | null = null,
): SancionMock {
  const i = INSTANCIA_DISCIPLINARIA_MOCK.find((x) => x.valor === instanciaValor)!
  const e = EFECTOS_SANCION_MOCK.find((x) => x.codigo === efectoCodigo)!
  return {
    id,
    fk_establecimiento: ESTABLECIMIENTO_CONFIGURACION,
    nombre,
    descripcion,
    fk_tlv_instancia: i.pk_lista_valor,
    instancia_nombre: i.nombre,
    tiene_duracion,
    fk_tlv_efecto: e.fk_tlv,
    efecto_codigo: e.codigo,
    efecto_nombre: e.nombre,
    habilitado,
    en_uso,
  }
}

export const sancionesDb: SancionMock[] = [
  filaSancion(1, "Amonestación escrita", "COORDINADOR", false, "NINGUNO", true, true),
  filaSancion(2, "Actividad pedagógica reparadora", "COORDINADOR", true, "NINGUNO"),
  filaSancion(3, "Suspensión de clases", "RECTOR", true, "SUSPENSION_ASISTENCIA", true, true),
  filaSancion(4, "Matrícula en observación", "RECTOR", true, "MATRICULA_OBSERVACION"),
  filaSancion(5, "No renovación del cupo", "CONSEJO_DIRECTIVO", false, "NO_RENOVACION_CUPO"),
  filaSancion(6, "Compromiso de convivencia con seguimiento", "COMITE_CONVIVENCIA", true, "NINGUNO"),
  filaSancion(7, "Cancelación de la matrícula", "CONSEJO_DIRECTIVO", false, "CANCELACION_MATRICULA"),
  filaSancion(8, "Trabajo escrito de reflexión", "COORDINADOR", false, "NINGUNO", false),
]

export const parametrosRiesgoDb: ParametrosRiesgo = {
  fk_testablecimiento: ESTABLECIMIENTO_CONFIGURACION,
  inasist_consec_alerta: 3,
  caida_ra_alerta: 1.5,
  caida_ra_referencia: 0.5,
  areas_reprobadas_alerta: 2,
  inasist_consec_intervencion: 5,
  inasist_consec_reintegracion: 10,
  inasist_alternadas_reintegracion: 15,
  plazo_incumplimiento_semanas: 2,
  plazo_contacto_dias: 2,
  plazo_intervencion_dias: 3,
  anotaciones_negativas_alerta: 3,
  compromisos_incumplidos_alerta: 1,
  condiciones_alerta: ["VICTIMA_CONFLICTO", "MADRE_CABEZA_FAMILIA"],
  es_predeterminado: false,
  aviso_sm_seguimiento: "SIEMPRE",
  aviso_sm_seguimiento_nombre: "Siempre",
  puede_editar: true,
}

/** Servicio social: pk de GRADOS como en select-catalog (pk = VALOR + 1: Décimo 11, Undécimo 12). */
export const servicioSocialDb: { horas: number; anticipacion: number; grados: number[]; es_predeterminado: boolean } = {
  horas: 80,
  anticipacion: 2,
  grados: [11, 12],
  es_predeterminado: false,
}

export const plazoRemisionesDb: PlazoRemisiones = {
  fk_testablecimiento: ESTABLECIMIENTO_CONFIGURACION,
  plazo_seguimiento_dias: 5,
  es_predeterminado: false,
  puede_editar: true,
}
