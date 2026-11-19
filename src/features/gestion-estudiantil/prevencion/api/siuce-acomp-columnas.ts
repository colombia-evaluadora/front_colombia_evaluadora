import type { ColumnaSiuce } from "@/features/gestion-estudiantil/convivencia/api/siuce-columnas"

import type { TipoAcompanamiento } from "@/features/gestion-estudiantil/prevencion/api/types"

const I = "Identificación y contexto"
const S = "Situación"
const A = "Acciones y remisiones"
const C = "Soportes y Cierre"

const CONTEXTO: ColumnaSiuce[] = [
  { clave: "id", rotulo: "Número de acompañamiento", grupo: I },
  { clave: "estudiante", rotulo: "Estudiante", grupo: I },
  { clave: "documento", rotulo: "Documento", grupo: I },
  { clave: "sede", rotulo: "Sede", grupo: I },
  { clave: "jornada", rotulo: "Jornada", grupo: I },
  { clave: "periodo_academico", rotulo: "Período Académico", grupo: I },
  { clave: "grado_grupo", rotulo: "Grado/Grupo", grupo: I },
  { clave: "estado_matricula", rotulo: "Estado de matrícula", grupo: I },
]

const FINAL: ColumnaSiuce[] = [
  { clave: "estado", rotulo: "Estado", grupo: S },
  { clave: "acciones", rotulo: "Acciones y remisiones", grupo: A },
  { clave: "cerrado_en", rotulo: "Fecha y hora del cierre", grupo: C },
  { clave: "resumen_cierre", rotulo: "Resumen del cierre", grupo: C },
]

/**
 * Claves de `prevencion-embarazo-siuce` / `prevencion-consumo-siuce` del reporting-service (columnas del wrapper
 * `fn_prevencion_acomp_*_siuce`, V690), en su orden. El backend da una sola hoja con las acciones en una celda.
 */
export const SIUCE_ACOMP_COLUMNAS: Record<TipoAcompanamiento, ColumnaSiuce[]> = {
  EMBARAZO: [
    ...CONTEXTO,
    { clave: "situacion", rotulo: "Situación de acompañamiento", grupo: S },
    { clave: "fecha_conocimiento", rotulo: "Fecha de conocimiento", grupo: S },
    { clave: "responsable", rotulo: "Responsable", grupo: S },
    { clave: "semanas_gestacion", rotulo: "Semanas de gestación informadas", grupo: S },
    { clave: "fecha_estimada_parto", rotulo: "Fecha estimada de parto informada", grupo: S },
    { clave: "fuente_gestacion", rotulo: "Fuente de la información de gestación", grupo: S },
    { clave: "fecha_info_gestacion", rotulo: "Fecha de la información", grupo: S },
    { clave: "progenitor_conocido", rotulo: "Progenitor conocido", grupo: S },
    { clave: "acompanamiento_progenitor", rotulo: "Acompañamiento del progenitor", grupo: S },
    { clave: "apoyo_acudiente", rotulo: "Apoyo del acudiente", grupo: S },
    { clave: "descripcion", rotulo: "Descripción y necesidades de continuidad", grupo: S },
    { clave: "acuerdos", rotulo: "Acuerdos de continuidad educativa", grupo: S },
    ...FINAL,
  ],
  CONSUMO: [
    ...CONTEXTO,
    { clave: "fecha_conocimiento", rotulo: "Fecha de conocimiento", grupo: S },
    { clave: "responsable", rotulo: "Responsable", grupo: S },
    { clave: "origen_informacion", rotulo: "Origen de la información", grupo: S },
    { clave: "fuente_informacion", rotulo: "Fuente de la información", grupo: S },
    { clave: "fecha_informacion", rotulo: "Fecha de la información", grupo: S },
    { clave: "sustancia", rotulo: "Sustancia presunta", grupo: S },
    { clave: "lugar", rotulo: "Lugar informado", grupo: S },
    { clave: "semanas_consumo", rotulo: "Tiempo de consumo informado (semanas)", grupo: S },
    { clave: "senales_riesgo", rotulo: "Señales de riesgo informadas", grupo: S },
    { clave: "semanas_senales", rotulo: "Tiempo de señales de riesgo informado (semanas)", grupo: S },
    { clave: "descripcion", rotulo: "Descripción de lo observado o informado", grupo: S },
    { clave: "acuerdos", rotulo: "Necesidades y acuerdos de continuidad educativa", grupo: S },
    ...FINAL,
  ],
}
