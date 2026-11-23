// Bloque 14 (archivo de soporte) por matrícula, con la revisión de cada soporte (Regla 73)
// y los documentos requeridos del convenio de la complementaria por adscripción.
import { origenAdscripcionDe, tipoDe } from "@/mocks/db/complementaria"

type Tipo = "FOTO" | "DOCUMENTO_IDENTIDAD" | "CERTIFICADO_ESTUDIOS" | "CERTIFICADO_MEDICO" | "HOJA_FIRMADA" | "OTRO"
type Revision = "SIN_REVISAR" | "SOPORTADO" | "SOPORTADO_OBSERVACIONES" | "NO_SOPORTADO"

export interface SoporteRow {
  pk_tmatricula_archivo: number
  tipo: Tipo
  fk_tarchivo: number
  archivo_nombre: string
  archivo_tamano: number
  subido_por: string
  subido_at: string
  revision: Revision
  observacion: string | null
  revisado_por: string | null
  revisado_at: string | null
}

export interface DocumentoConvenioRow {
  pk_tdocumento: number
  nombre: string
  entregado: "S" | "N"
}

const FUNCIONARIO = "Claudia Ríos"
let siguientePk = 70_000
// Los ids de archivo del mock no chocan con los de otros mocks de view-token.
let siguienteArchivo = 880_000
// Bytes subidos en esta pestaña: la vista previa los muestra con un object URL.
const binarios = new Map<number, string>()

const porMatricula = new Map<string, SoporteRow[]>()
const convenio = new Map<string, DocumentoConvenioRow[]>()

function fila(tipo: Tipo, nombre: string, tamano: number, revision: Revision, observacion: string | null = null): SoporteRow {
  return {
    pk_tmatricula_archivo: siguientePk++,
    tipo,
    fk_tarchivo: siguienteArchivo++,
    archivo_nombre: nombre,
    archivo_tamano: tamano,
    subido_por: FUNCIONARIO,
    subido_at: "2027-02-10",
    revision,
    observacion,
    revisado_por: revision === "SIN_REVISAR" ? null : FUNCIONARIO,
    revisado_at: revision === "SIN_REVISAR" ? null : "2027-02-12",
  }
}

// Mismo ejemplo que el prototipo (C.1.EDI.1): tres fijos cargados, la hoja sin cargar y tres otros.
function semilla(): SoporteRow[] {
  return [
    fila("DOCUMENTO_IDENTIDAD", "ti-ana-perez.pdf", 1_258_291, "SOPORTADO"),
    fila(
      "CERTIFICADO_ESTUDIOS",
      "certificado-2026.pdf",
      655_360,
      "SOPORTADO_OBSERVACIONES",
      "La fecha de nacimiento del certificado no coincide con la de la matrícula.",
    ),
    fila("CERTIFICADO_MEDICO", "certificado-medico.pdf", 389_120, "SIN_REVISAR"),
    fila("OTRO", "carta-eps.pdf", 215_040, "SIN_REVISAR"),
    fila("OTRO", "remision-medica.pdf", 97_280, "SOPORTADO"),
    fila("FOTO", "foto-carne.jpg", 153_600, "SIN_REVISAR"),
  ]
}

export function soportesDe(matriculaId: string): SoporteRow[] {
  let filas = porMatricula.get(matriculaId)
  if (!filas) {
    filas = semilla()
    porMatricula.set(matriculaId, filas)
  }
  return filas
}

export function cargarSoporte(
  matriculaId: string,
  tipo: Tipo,
  pk: number | null,
  archivo: File,
): string | null {
  if (!["application/pdf", "image/jpeg", "image/png"].includes(archivo.type)) return "Solo PDF, JPG o PNG."
  if (archivo.size > 10 * 1024 * 1024) return "El archivo supera los 10 MB."
  const filas = soportesDe(matriculaId)
  const fkArchivo = siguienteArchivo++
  binarios.set(fkArchivo, URL.createObjectURL(archivo))
  const nuevo = (): SoporteRow => ({
    ...fila(tipo, archivo.name, archivo.size, "SIN_REVISAR"),
    fk_tarchivo: fkArchivo,
    subido_at: new Date().toISOString().slice(0, 10),
  })
  // Reemplazar, o volver a adjuntar un fijo: la revisión vuelve a Sin revisar (Regla 73).
  const i =
    pk != null
      ? filas.findIndex((f) => f.pk_tmatricula_archivo === pk)
      : tipo !== "OTRO"
        ? filas.findIndex((f) => f.tipo === tipo)
        : -1
  if (pk != null && i < 0) return "El soporte no existe."
  if (i >= 0) filas[i] = { ...nuevo(), pk_tmatricula_archivo: filas[i].pk_tmatricula_archivo }
  else filas.push(nuevo())
  return null
}

export function revisarSoporte(
  matriculaId: string,
  pk: number,
  resultado: Revision,
  observacion: string | null,
): string | null {
  const s = soportesDe(matriculaId).find((f) => f.pk_tmatricula_archivo === pk)
  if (!s) return "El soporte no existe."
  if (!["SOPORTADO", "SOPORTADO_OBSERVACIONES", "NO_SOPORTADO"].includes(resultado)) return "Elija el resultado."
  const largo = (observacion ?? "").trim().length
  if (resultado !== "SOPORTADO" && (largo < 10 || largo > 500)) return "La observación debe tener de 10 a 500 caracteres."
  Object.assign(s, {
    revision: resultado,
    observacion: largo ? observacion : null,
    revisado_por: FUNCIONARIO,
    revisado_at: new Date().toISOString().slice(0, 10),
  })
  return null
}

export function quitarSoporte(matriculaId: string, pk: number): string | null {
  const filas = soportesDe(matriculaId)
  const i = filas.findIndex((f) => f.pk_tmatricula_archivo === pk)
  if (i < 0) return "El soporte no existe."
  if (filas[i].tipo !== "OTRO") return "Los soportes fijos no se quitan: se reemplazan."
  filas.splice(i, 1)
  return null
}

/** Solo la complementaria por adscripción tiene documentos del convenio. */
export function documentosConvenioDe(matriculaId: string): DocumentoConvenioRow[] {
  const pk = Number(matriculaId)
  if (tipoDe(pk) !== "COMPLEMENTARIA" || !origenAdscripcionDe(pk)) return []
  let docs = convenio.get(matriculaId)
  if (!docs) {
    docs = [
      { pk_tdocumento: 1, nombre: "Formato de inscripción del convenio", entregado: "S" },
      { pk_tdocumento: 2, nombre: "Carta de autorización del acudiente", entregado: "N" },
      { pk_tdocumento: 3, nombre: "Copia del carné de salud", entregado: "N" },
    ]
    convenio.set(matriculaId, docs)
  }
  return docs
}

export function marcarDocumentoConvenio(matriculaId: string, pk: number, entregado: "S" | "N"): string | null {
  const d = documentosConvenioDe(matriculaId).find((x) => x.pk_tdocumento === pk)
  if (!d) return "El documento no existe en el convenio."
  d.entregado = entregado
  return null
}

const PDF_VACIO = `data:application/pdf;base64,${btoa(
  "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
)}`

/** URL de vista previa de un archivo de este mock, o null si no es suyo. */
export function urlSoporte(fkArchivo: number): string | null {
  if (binarios.has(fkArchivo)) return binarios.get(fkArchivo) as string
  for (const filas of porMatricula.values()) {
    if (filas.some((f) => f.fk_tarchivo === fkArchivo)) return PDF_VACIO
  }
  return null
}
