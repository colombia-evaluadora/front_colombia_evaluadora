import { env } from "@/config/env"

/**
 * Datos de la VISTA PREVIA de Verificar un documento (U.4).
 *
 * El servicio real hoy solo verifica boletines (`/reportes/public/boletin/...`,
 * página `features/verificacion`) y devuelve menos datos de los que pide la
 * guía: tipo de documento, DANE, titular y documento enmascarados, grado,
 * estado Anulado, fecha de la versión nueva, otros documentos (carné), ver el
 * contenido con el documento completo e intentos restantes. Mientras tanto,
 * los códigos de esta lista se resuelven aquí; cualquier otro código sigue
 * yendo a la verificación real del boletín.
 *
 * Como en Inscribir y Consultar (#1058): la vista previa solo existe con mocks.
 * Con el backend real (test/producción) no se simula nada y todo código va a la
 * verificación real.
 */

export type EstadoDocumento = "VIGENTE" | "REEMPLAZADO" | "ANULADO"

export interface DocumentoVerificado {
  codigo: string
  tipo: "INFORME" | "CARNE"
  estado: EstadoDocumento
  /** Fecha de la versión que lo reemplazó (estado REEMPLAZADO). */
  reemplazadoEl?: string
  detalle: { etiqueta: string; valor: string }[]
  /** Solo los documentos con contenido (no el carné) se pueden ver o comprobar. */
  contenido?: InformePeriodo
}

export interface InformePeriodo {
  institucion: string
  dane: string
  nit: string
  ciudad: string
  generado: { fecha: string; hora: string }
  estudiante: string
  documentoEnmascarado: string
  /** Documento completo del estudiante: el que hay que escribir para ver el contenido. */
  documentoCompleto: string
  datos: { etiqueta: string; valor: string }[]
  areas: { nombre: string; ih: number; notas: (string | null)[]; asignaturas: { nombre: string; ih: number; notas: (string | null)[]; detalle?: string }[] }[]
}

export const MAX_INTENTOS_CONTENIDO = 5
export const HORAS_BLOQUEO_CONTENIDO = 24

/** Prefijos de la vista previa: con mocks, un código con ellos no va al servicio real. */
const PREFIJOS_DEMO = ["K7QM-", "C4RN-"]
export const esCodigoDemo = (codigo: string) =>
  env.ENABLE_API_MOCKING && PREFIJOS_DEMO.some((p) => codigo.trim().toUpperCase().startsWith(p))

const INFORME: InformePeriodo = {
  institucion: "Institución Educativa IE Central",
  dane: "168001000123",
  nit: "890.200.123-4",
  ciudad: "Bucaramanga, Santander",
  generado: { fecha: "15/04/2027", hora: "10:42" },
  estudiante: "Valentina Rojas Peña",
  documentoEnmascarado: "TI ******5432",
  documentoCompleto: "1098765432",
  datos: [
    { etiqueta: "Sede", valor: "IE Central" },
    { etiqueta: "Nivel", valor: "Media" },
    { etiqueta: "Grado / Grupo / Jornada", valor: "10° · 10°A · Mañana" },
    { etiqueta: "Año · Período", valor: "2027 · Período 2" },
    { etiqueta: "Puesto", valor: "4 de 36" },
    { etiqueta: "Rendimiento académico", valor: "8,1" },
    { etiqueta: "Áreas reprobadas", valor: "1" },
    { etiqueta: "Áreas aprobadas", valor: "8" },
    { etiqueta: "Áreas sin calificar", valor: "2" },
  ],
  areas: [
    {
      nombre: "Matemáticas",
      ih: 5,
      notas: ["6,5", "8,0", null, null],
      asignaturas: [
        { nombre: "Trigonometría", ih: 4, notas: ["6,0", "8,1", null, null], detalle: "R 6,0 / C 5,2" },
        { nombre: "Estadística", ih: 1, notas: ["8,4", "7,6", null, null] },
      ],
    },
    {
      nombre: "Humanidades",
      ih: 7,
      notas: ["8,3", "8,5", null, null],
      asignaturas: [
        { nombre: "Lengua castellana", ih: 4, notas: ["8,0", "8,4", null, null] },
        { nombre: "Inglés", ih: 3, notas: ["8,7", "8,6", null, null] },
      ],
    },
    {
      nombre: "Ciencias naturales",
      ih: 6,
      notas: ["7,9", "8,2", null, null],
      asignaturas: [
        { nombre: "Física", ih: 3, notas: ["7,5", "8,0", null, null] },
        { nombre: "Química", ih: 3, notas: ["8,3", "8,4", null, null] },
      ],
    },
  ],
}

const DETALLE_INFORME = [
  { etiqueta: "Documento", valor: "Informe de período" },
  { etiqueta: "Establecimiento", valor: "IE Central · DANE 168001000123" },
  { etiqueta: "Titular", valor: "Valentina R. P. (estudiante)" },
  { etiqueta: "Documento de identidad", valor: "TI …5432" },
  { etiqueta: "Grado", valor: "10° · 10°A" },
  { etiqueta: "Período", valor: "2027 · Período 2" },
  { etiqueta: "Generado", valor: "15/04/2027 10:42" },
]

const DOCUMENTOS: DocumentoVerificado[] = [
  { codigo: "K7QM-4XPA-9TRB", tipo: "INFORME", estado: "VIGENTE", detalle: DETALLE_INFORME, contenido: INFORME },
  {
    codigo: "K7QM-4XPA-9TRR",
    tipo: "INFORME",
    estado: "REEMPLAZADO",
    reemplazadoEl: "02/05/2027",
    detalle: DETALLE_INFORME,
    contenido: INFORME,
  },
  { codigo: "K7QM-4XPA-9TRA", tipo: "INFORME", estado: "ANULADO", detalle: DETALLE_INFORME, contenido: INFORME },
  {
    codigo: "C4RN-2027-ANA6",
    tipo: "CARNE",
    estado: "VIGENTE",
    detalle: [
      { etiqueta: "Documento", valor: "Carné estudiantil" },
      { etiqueta: "Establecimiento", valor: "IE Central · DANE 168001000123" },
      { etiqueta: "Estudiante", valor: "Ana S. P. G." },
      { etiqueta: "Documento de identidad", valor: "TI …5432" },
      { etiqueta: "Grado", valor: "6° · 6°A" },
      { etiqueta: "Vigencia", valor: "2027" },
      { etiqueta: "Generado", valor: "03/02/2027 09:15" },
    ],
  },
]

/** Los códigos de ejemplo, para mostrarlos en la vista previa. */
export const EJEMPLOS_DEMO = [...DOCUMENTOS.map((d) => d.codigo), "K7QM-4XPA-9TRX"]

export function buscarDocumentoDemo(codigo: string): DocumentoVerificado | null {
  return DOCUMENTOS.find((d) => d.codigo === codigo.trim().toUpperCase()) ?? null
}
