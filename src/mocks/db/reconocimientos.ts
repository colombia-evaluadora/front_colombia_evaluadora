import type {
  AnulacionReconocimiento,
  ReconocimientoDetalle,
  ReconocimientoRow,
  SugerenciaPuesto,
} from "@/features/gestion-estudiantil/reconocimientos/api/types"
import { JORNADA_INFORME, PERIODOS_INFORME, SEDE_INFORME } from "@/mocks/db/informes"

/** Mismo contrato de V624-V630. Sede, jornada y períodos son los de la cascada de Informes que ya sirve el mock. */
export const ESTABLECIMIENTO_RECONOCIMIENTO_MOCK = SEDE_INFORME.fk_testablecimiento
export { JORNADA_INFORME, SEDE_INFORME }

export interface CatalogoReconocimientoMock {
  pk: number
  valor: string
  nombre: string
}

/** `TIPO_RECONOCIMIENTO` (Anexo A de Administración): el front muestra el nombre, nunca el código. */
export const TIPOS_RECONOCIMIENTO_MOCK: CatalogoReconocimientoMock[] = [
  { pk: 401, valor: "IZADA_BANDERA", nombre: "Izada de bandera" },
  { pk: 402, valor: "MEJOR_DESEMPENO", nombre: "Mejor desempeño académico" },
  { pk: 403, valor: "MEJOR_COMPORTAMIENTO", nombre: "Mejor comportamiento" },
  { pk: 404, valor: "PARTICIPACION_EVENTO", nombre: "Participación en evento" },
  { pk: 405, valor: "MERITO_DEPORTIVO", nombre: "Mérito deportivo" },
  { pk: 406, valor: "MERITO_ARTISTICO", nombre: "Mérito artístico" },
  { pk: 407, valor: "MERITO_CULTURAL", nombre: "Mérito cultural" },
  { pk: 408, valor: "MERITO_CIENTIFICO", nombre: "Mérito científico" },
  { pk: 409, valor: "SERVICIO_COMUNIDAD", nombre: "Servicio a la comunidad" },
  { pk: 410, valor: "OTRO", nombre: "Otro" },
]

/** El funcionario que el mock considera «usuario actual» (`es_usuario_actual`). */
export const FUNCIONARIO_ACTUAL_RECONOCIMIENTO_MOCK = 89

export const OTORGANTES_MOCK = [
  { fk_tfuncionario: 88, nombre: "Carlos Medina Ríos" },
  { fk_tfuncionario: 89, nombre: "Juan Ramírez Soto" },
  { fk_tfuncionario: 90, nombre: "Carolina Medina Pardo" },
]

export interface EstudianteReconocimientoMock {
  matricula: number
  nombre: string
  documento: string
  grupo: number
  grado_grupo: string
}

export const ESTUDIANTES_RECONOCIMIENTO_MOCK: EstudianteReconocimientoMock[] = [
  { matricula: 5531, nombre: "Luis Pérez Rincón", documento: "1020304050", grupo: 77, grado_grupo: "5°A" },
  { matricula: 5532, nombre: "Sara Gil Moreno", documento: "1020304051", grupo: 78, grado_grupo: "6°B" },
  { matricula: 5533, nombre: "Tomás Díaz Arango", documento: "1020304052", grupo: 79, grado_grupo: "7°B" },
  { matricula: 5535, nombre: "Ana Ruiz Gómez", documento: "1020304054", grupo: 80, grado_grupo: "6°A" },
  { matricula: 5536, nombre: "Mateo Herrera Lozano", documento: "1020304055", grupo: 78, grado_grupo: "6°B" },
  { matricula: 5537, nombre: "Camila Vargas Peña", documento: "1020304056", grupo: 81, grado_grupo: "11°A" },
]

const tipo = (valor: string) => TIPOS_RECONOCIMIENTO_MOCK.find((t) => t.valor === valor)!
const otorgante = (pk: number) => OTORGANTES_MOCK.find((o) => o.fk_tfuncionario === pk)!
const periodo = (id: number) => PERIODOS_INFORME.find((p) => p.id === id)!

interface Semilla {
  id: number
  fecha: string
  estudiante: number
  tipo: string
  motivo: string
  otorga: number
  periodo: number | null
  anulado?: boolean
  puede_modificar?: boolean
  puede_anular?: boolean
  es_sugerencia_puesto?: boolean
}

export function construirReconocimiento(s: Semilla): ReconocimientoRow {
  const est = ESTUDIANTES_RECONOCIMIENTO_MOCK.find((e) => e.matricula === s.estudiante)!
  const t = tipo(s.tipo)
  const o = otorgante(s.otorga)
  return {
    id: s.id,
    fecha: s.fecha,
    fk_tmatricula: est.matricula,
    estudiante_nombre: est.nombre,
    estudiante_documento: est.documento,
    grado_grupo: est.grado_grupo,
    fk_tlv_tipo: t.pk,
    tipo_valor: t.valor,
    tipo_nombre: t.nombre,
    motivo: s.motivo,
    fk_tfuncionario_otorga: o.fk_tfuncionario,
    otorgado_por: o.nombre,
    fk_tperiodo_evaluacion: s.periodo,
    periodo_evaluacion_nombre: s.periodo ? periodo(s.periodo).nombre : null,
    es_sugerencia_puesto: s.es_sugerencia_puesto ?? false,
    anulado: s.anulado ?? false,
    puede_modificar: s.puede_modificar ?? !s.anulado,
    puede_anular: s.puede_anular ?? !s.anulado,
    total_count: 0,
  }
}

export const reconocimientosDb: ReconocimientoRow[] = [
  construirReconocimiento({ id: 701, fecha: "2026-04-28", estudiante: 5533, tipo: "MERITO_CIENTIFICO", motivo: "Feria municipal de ciencia", otorga: 88, periodo: 202 }),
  construirReconocimiento({ id: 702, fecha: "2026-04-15", estudiante: 5535, tipo: "IZADA_BANDERA", motivo: "Día del idioma", otorga: 90, periodo: 202, puede_modificar: false, puede_anular: false }),
  construirReconocimiento({ id: 703, fecha: "2026-04-10", estudiante: 5531, tipo: "MEJOR_DESEMPENO", motivo: "Puesto 1 en 5°A · Primer período", otorga: 89, periodo: 201, es_sugerencia_puesto: true }),
  construirReconocimiento({ id: 704, fecha: "2026-03-18", estudiante: 5532, tipo: "MEJOR_COMPORTAMIENTO", motivo: "Representante del grupo en el consejo estudiantil", otorga: 89, periodo: 201, anulado: true }),
  construirReconocimiento({ id: 705, fecha: "2026-08-12", estudiante: 5536, tipo: "SERVICIO_COMUNIDAD", motivo: "Apoyo a compañeros con dificultades de lectura", otorga: 90, periodo: 203, puede_anular: false }),
]

/** Detalle extra por id: actividad, soporte, autor del registro y anulación. */
export const detallesReconocimientoDb: Record<number, Omit<ReconocimientoDetalle, keyof Omit<ReconocimientoRow, "total_count">>> = {
  701: { fk_tactividad: 301, actividad_nombre: "Feria de ciencia municipal", fk_tarchivo_soporte: 9101, soporte_nombre: "certificado-feria.pdf", registrado_por: "Carlos Medina Ríos", anulacion: null },
  702: { fk_tactividad: null, actividad_nombre: null, fk_tarchivo_soporte: null, soporte_nombre: null, registrado_por: "Carolina Medina Pardo", anulacion: null },
  703: { fk_tactividad: null, actividad_nombre: null, fk_tarchivo_soporte: null, soporte_nombre: null, registrado_por: "Juan Ramírez Soto", anulacion: null },
  704: {
    fk_tactividad: null,
    actividad_nombre: null,
    fk_tarchivo_soporte: null,
    soporte_nombre: null,
    registrado_por: "Juan Ramírez Soto",
    anulacion: { fecha: "2026-03-20", motivo: "Registrado al estudiante equivocado.", por: "Carlos Medina Ríos" } satisfies AnulacionReconocimiento,
  },
  705: { fk_tactividad: null, actividad_nombre: null, fk_tarchivo_soporte: null, soporte_nombre: null, registrado_por: "Carolina Medina Pardo", anulacion: null },
}

/** Puesto 1 del último período cerrado (el segundo): dos sugerencias, una de cada grupo. */
export const sugerenciasDb: SugerenciaPuesto[] = [
  {
    fk_tmatricula: 5536,
    estudiante_nombre: "Mateo Herrera Lozano",
    estudiante_documento: "1020304055",
    grado_grupo: "6°B",
    fk_tperiodo_evaluacion: 202,
    periodo_evaluacion_nombre: periodo(202).nombre,
    fecha_cierre: periodo(202).fechaFin,
    motivo_sugerido: `Puesto 1 en 6°B · ${periodo(202).nombre}`,
    fk_tlv_tipo_sugerido: 402,
  },
  {
    fk_tmatricula: 5537,
    estudiante_nombre: "Camila Vargas Peña",
    estudiante_documento: "1020304056",
    grado_grupo: "11°A",
    fk_tperiodo_evaluacion: 202,
    periodo_evaluacion_nombre: periodo(202).nombre,
    fecha_cierre: periodo(202).fechaFin,
    motivo_sugerido: `Puesto 1 en 11°A · ${periodo(202).nombre}`,
    fk_tlv_tipo_sugerido: 402,
  },
]

export const ACTIVIDADES_RECONOCIMIENTO_MOCK = [
  { id: 301, nombre: "Feria de ciencia municipal" },
  { id: 302, nombre: "Torneo interclases de fútbol" },
  { id: 303, nombre: "Izada de bandera del 20 de julio" },
]
