import { useQuery } from "@tanstack/react-query"

import type { CatalogosFijos } from "@/features/coverage/matricula/api/query/catalogos-fijos"
import {
  MATRICULA_CATALOG_CATEGORIA,
  type MatriculaCatalogKey,
  type MatriculaCatalogOption,
} from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import type { CreateMatriculaInput } from "@/features/coverage/matricula/api/types/matricula"
import type { DepartmentOption } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import type { PeriodoOpcionCupo } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { publicService } from "@/features/publico/consultar/api/consulta-publica"

/**
 * Inscripción pública (U.2, sso V425/V426): filas públicas de query-service por
 * `POST /eval-col/public/service`. El gate del registro es el código de 6 dígitos que
 * llega al correo del acudiente (15 min, 5 intentos); los límites por correo e IP los
 * aplica el backend. Captcha: las filas tienen `CAPTCHA='false'` hasta decidir el
 * proveedor; al encenderlo, el token del widget viaja en el header `X-Captcha-Token`
 * (ver `CaptchaVerifier` del SSO) y aquí solo hay que agregarlo a `publicService`.
 */
export const UUID_CONTEXTO = "eval-col-inscripcion-publica-contexto-v1"
export const UUID_REGISTRO_CODIGO = "eval-col-inscripcion-publica-registro-codigo-v1"
export const UUID_REGISTRAR = "eval-col-inscripcion-publica-registrar-v1"

export interface CatalogosPublicosRow {
  listas?: Record<string, MatriculaCatalogOption[]>
  etnias?: CatalogItem[]
  discapacidades?: CatalogItem[]
  municipios?: { id: number; nombre: string; departamento: string }[]
}

export interface ContextoInscripcion {
  habilitada: boolean
  maxOpciones?: number
  opciones: PeriodoOpcionCupo[]
  catalogos?: CatalogosPublicosRow
}

export async function fetchContextoInscripcion(): Promise<ContextoInscripcion> {
  const d = await publicService<ContextoInscripcion>(UUID_CONTEXTO, {})
  return { habilitada: Boolean(d?.habilitada), maxOpciones: d?.maxOpciones, opciones: d?.opciones ?? [], catalogos: d?.catalogos }
}

export const contextoInscripcionKey = ["inscripcion-publica", "contexto"] as const

export function useContextoInscripcionQuery() {
  return useQuery({ queryKey: contextoInscripcionKey, queryFn: fetchContextoInscripcion, staleTime: 5 * 60_000 })
}

/** Listas por categoría del backend → catálogos fijos de las secciones de matrícula. */
export function toCatalogosFijos(c: CatalogosPublicosRow | undefined): CatalogosFijos {
  const fijos: CatalogosFijos = { etnias: c?.etnias ?? [], discapacidades: c?.discapacidades ?? [] }
  for (const key of Object.keys(MATRICULA_CATALOG_CATEGORIA) as MatriculaCatalogKey[]) {
    fijos[key] = c?.listas?.[MATRICULA_CATALOG_CATEGORIA[key]] ?? []
  }
  return fijos
}

export const motivosAnulacionDe = (c: CatalogosPublicosRow | undefined) => c?.listas?.MOTIVO_ANULACION_INSCRIPCION ?? []

/** Municipios planos → departamentos con sus municipios (lo que piden las secciones de domicilio). */
export function toDepartamentos(municipios: CatalogosPublicosRow["municipios"]): DepartmentOption[] {
  const porDepto = new Map<string, DepartmentOption["municipalities"]>()
  for (const m of municipios ?? []) {
    const lista = porDepto.get(m.departamento) ?? []
    lista.push({ id: m.id, name: m.nombre })
    porDepto.set(m.departamento, lista)
  }
  return Array.from(porDepto, ([name, municipalities]) => ({ name, municipalities }))
}

/** Pide el código al correo del acudiente. Devuelve el mensaje si el backend no lo envió (límites). */
export async function pedirCodigoRegistro(correo: string): Promise<string | null> {
  const d = await publicService<{ enviado: boolean; mensaje?: string }>(UUID_REGISTRO_CODIGO, {
    "BODY.CORREO": correo.trim().toLowerCase(),
  })
  return d?.enviado ? null : d?.mensaje || "No fue posible enviar el código. Intente de nuevo."
}

interface PersonaPublica {
  tipoDocumento: number
  documento: string
  primerNombre: string
  segundoNombre: string
  primerApellido: string
  segundoApellido: string
  genero: number
  fechaNacimiento: string | null
  telefono: string | null
}

export interface RegistroInput {
  datos: Pick<CreateMatriculaInput, "student" | "studentContact" | "guardian" | "guardianContact">
  correo: string
  codigo: string
  /** `{periodo, grado}` ya resueltos de la cascada. */
  opciones: { periodo: number; grado: number }[]
  documentoHermano: string | null
  paisOrigen: string | null
  lenguaMaterna: string | null
  condicionMigratoria: string | null
  autorizaDatos: boolean
}

export type ResultadoRegistro =
  | { registrada: true; numeroInscripcion: string; autorizacionPendiente: boolean; mensaje: string }
  | { registrada: false; mensaje: string; intentosRestantes: number | null }

/** Body del uuid de registro (exportado para probar el contrato). */
export function toRegistroParams(input: RegistroInput): Record<string, unknown> {
  const { student, studentContact, guardian, guardianContact } = input.datos
  const aspirante: PersonaPublica = {
    tipoDocumento: Number(student.documentType),
    documento: student.documentNumber.trim(),
    primerNombre: student.firstName.trim(),
    segundoNombre: student.secondName.trim(),
    primerApellido: student.lastName.trim(),
    segundoApellido: student.secondLastName.trim(),
    genero: Number(student.gender),
    fechaNacimiento: student.birthDate || null,
    telefono: studentContact.phone || null,
  }
  const acudiente: PersonaPublica = {
    tipoDocumento: Number(guardian.documentType),
    documento: guardian.documentNumber.trim(),
    primerNombre: guardian.firstName.trim(),
    segundoNombre: guardian.secondName.trim(),
    primerApellido: guardian.lastName.trim(),
    segundoApellido: guardian.secondLastName.trim(),
    genero: Number(guardian.gender),
    fechaNacimiento: null,
    telefono: guardianContact.phone || null,
  }
  // JSONB viaja como texto JSON; los opcionales vacíos no se mandan (el validador de longitudes los rechazaría).
  const params: Record<string, unknown> = {
    "BODY.CORREO": input.correo.trim().toLowerCase(),
    "BODY.CODIGO": input.codigo,
    "BODY.ASPIRANTE": JSON.stringify(aspirante),
    "BODY.ACUDIENTE": JSON.stringify(acudiente),
    "BODY.FK_TLV_PARENTESCO": Number(guardian.relationship),
    "BODY.OPCIONES": JSON.stringify(input.opciones),
    "BODY.AUTORIZA_DATOS": input.autorizaDatos,
  }
  if (input.documentoHermano) params["BODY.DOCUMENTO_HERMANO"] = input.documentoHermano
  if (input.paisOrigen) params["BODY.PAIS_ORIGEN"] = input.paisOrigen
  if (input.lenguaMaterna) params["BODY.LENGUA_MATERNA"] = input.lenguaMaterna
  if (input.condicionMigratoria) params["BODY.CONDICION_MIGRATORIA"] = input.condicionMigratoria
  return params
}

export async function registrarInscripcion(input: RegistroInput): Promise<ResultadoRegistro> {
  const d = await publicService<{
    registrada: boolean
    numeroInscripcion?: string
    autorizacionPendiente?: boolean
    mensaje?: string
    intentosRestantes?: number | null
  }>(UUID_REGISTRAR, toRegistroParams(input))
  if (!d?.registrada) {
    return {
      registrada: false,
      mensaje: d?.mensaje || "No fue posible registrar la inscripción.",
      intentosRestantes: d?.intentosRestantes ?? null,
    }
  }
  const numero = d.numeroInscripcion ?? ""
  return {
    registrada: true,
    numeroInscripcion: numero,
    autorizacionPendiente: d.autorizacionPendiente === true,
    mensaje: d.mensaje || `Inscripción ${numero} registrada.`,
  }
}
