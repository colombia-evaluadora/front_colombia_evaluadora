import { http, HttpResponse, delay } from "msw"

import {
  applyBulkMatriculaChange,
  deleteMatriculaById,
  findActiveMatriculaByDocument,
  getMatriculaDetails,
  insertMatricula,
  matriculaDb,
  updateMatriculaDetails,
  updateMatriculaRow,
} from "@/mocks/db/matricula"
import {
  findMatriculaConfigCampo,
  matriculaFieldConfigDb,
} from "@/mocks/db/matricula-field-config"
import { CAMPUSES, GRADES } from "@/mocks/db/reservations"
import { jornadasDb } from "@/mocks/db/academic-period/jornadas"
import { formatGrade } from "@/features/coverage/api/ui-mappings"
import type {
  BulkMatriculaChangeRequest,
  BulkMatriculaChangeResult,
  CreateMatriculaInput,
  CreateMatriculaResult,
  ExportFormat,
  ExportResult,
  Matricula,
  MatriculaDetailResult,
  MatriculaDetails,
  MatriculaDocumentCheckResult,
  MatriculaHomologationInfo,
  MatriculaMutationResult,
  MatriculaQueryFilters,
  MatriculaQueryRequest,
} from "@/features/coverage/api/types/matricula"

// snake_case, como manda el backend real — camelCase es solo del lado front
// (ver `toMatriculaFieldConfig` en `use-matricula-field-config-query.ts`).
function toRawMatriculaFieldConfig() {
  return {
    fk_establecimiento: matriculaFieldConfigDb.fkEstablecimiento,
    establecimiento: matriculaFieldConfigDb.establecimiento,
    pk_matricula_config: matriculaFieldConfigDb.pkMatriculaConfig,
    secciones: matriculaFieldConfigDb.secciones.map((seccion) => ({
      seccion: seccion.seccion,
      campos: seccion.campos.map((campo) => ({
        fk_campo: campo.fkCampo,
        nombre: campo.nombre,
        editable: campo.editable,
        requerido: campo.requerido,
        visible: campo.visible,
      })),
    })),
  }
}

// Hash determinista y estable (no criptográfico) — solo para variar
// "aleatoriamente" pero siempre igual el resultado según el string de
// entrada, sin depender de `Math.random()`.
function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function mixHash(value: number): number {
  let x = value
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = x ^ (x >>> 16)
  return Math.abs(x)
}

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

function matches(value: string, needle: string): boolean {
  return value.toLowerCase().includes(needle.toLowerCase())
}

// Body plano que manda `toListRequest` en `use-matricula-query.ts`.
interface MatriculaListRequestBody {
  SEARCH: string | null
  STATUSES: Matricula["status"][] | null
  CAMPUS: string | null
  SHIFT: string | null
  GRADE: number | null
  GROUP: string | null
  PAGEINDEX: number
  PAGESIZE: number
  SORTBY: string | null
  SORTDIR: "asc" | "desc" | null
}

// camelCase -> snake_case, como manda fn_matricula_listar (V200) — mismo
// criterio que `toRawMatriculaFieldConfig` arriba. `total_count` viaja
// repetido por fila (window count real), no como envelope aparte.
function toRawMatriculaRow(row: Matricula, totalCount: number) {
  return {
    id: Number(row.id),
    document_number: row.documentNumber,
    first_name: row.firstName,
    last_name: row.lastName,
    institution: row.institution,
    campus: row.campus,
    shift: row.shift,
    education_level: row.educationLevel,
    grade: row.grade,
    grupo: row.group,
    enrollment_date: row.enrollmentDate,
    guardian: row.guardian || null,
    status: row.status,
    has_grades: row.hasGrades,
    total_count: totalCount,
  }
}

function applyFilters(rows: Matricula[], filters: MatriculaQueryFilters): Matricula[] {
  return rows.filter((row) => {
    if (filters.search) {
      const needle = filters.search
      const matchesSearch =
        matches(row.firstName, needle) ||
        matches(row.lastName, needle) ||
        row.documentNumber.includes(needle) ||
        matches(row.institution, needle) ||
        matches(row.guardian, needle)
      if (!matchesSearch) return false
    }

    if (filters.statuses?.length && !filters.statuses.includes(row.status)) {
      return false
    }

    if (filters.campus && row.campus !== filters.campus) return false
    if (filters.shift && row.shift !== filters.shift) return false
    if (filters.grade != null && row.grade !== filters.grade) return false
    if (filters.group && row.group !== filters.group) return false

    return true
  })
}

function sortValue(row: Matricula, id: string): string | number {
  return (row[id as keyof Matricula] ?? "") as string | number
}

function applySorting(rows: Matricula[], sorting: MatriculaQueryRequest["sorting"]): Matricula[] {
  if (!sorting.length) return rows
  const [{ id, desc }] = sorting
  const sorted = [...rows].sort((a, b) => {
    const av = sortValue(a, id)
    const bv = sortValue(b, id)
    if (av === bv) return 0
    return av > bv ? 1 : -1
  })
  return desc ? sorted.reverse() : sorted
}

function toNum(value: string | undefined): number | null {
  return value ? Number(value) : null
}

function toRawSN(label: string): "S" | "N" | null {
  if (label === "Sí") return "S"
  if (label === "No") return "N"
  return null
}

function toRawMatriculaDetail(matricula: Matricula, details: MatriculaDetails) {
  const pk = Number(matricula.id)

  return {
    matricula: {
      matricula: {
        fk_tsede: 1,
        fk_tgrado: matricula.grade,
        fk_tgrupo: 1,
        fk_tpadre: null,
        fk_enfasis: toNum(details.academic.specialty),
        sede_nombre: matricula.campus,
        grado_nombre: `Grado ${matricula.grade}`,
        grupo_nombre: matricula.group,
        pk_tmatricula: pk,
        fk_testudiante: pk,
        fk_tlv_jornada: 1,
        jornada_nombre: matricula.shift,
        fk_tperiodo_academico: 1,
        created_at: matricula.enrollmentDate,
        estado_matricula_nombre: matricula.status,
      },
      acudientes: details.guardian.firstName
        ? [
            {
              vinculo: { acudiente: "S" as const, fkTlvParentesco: toNum(details.guardian.relationship) },
              telefono: details.guardianContact.phone || null,
              ocupacion: null,
              profesion: details.guardianEmployment.profession || null,
              entidad: details.guardianEmployment.entityName || null,
              fk_tlv_genero: toNum(details.guardian.gender),
              primer_nombre: details.guardian.firstName,
              identificacion: details.guardian.documentNumber,
              segundo_nombre: details.guardian.secondName || null,
              primer_apellido: details.guardian.lastName,
              segundo_apellido: details.guardian.secondLastName || null,
              telefono_entidad: details.guardianEmployment.entityPhone || null,
              direccion_entidad: details.guardianEmployment.entityAddress || null,
              correo_electronico: details.guardianContact.email || null,
              direccion_residencia: details.guardianAddress.address || null,
              fk_tlv_tipo_documento: toNum(details.guardian.documentType),
              fk_tmunicipio_documento: toNum(details.guardian.documentExpedition.municipality),
              fk_tmunicipio_residencia: toNum(details.guardianAddress.municipality),
              cargo_entidad: details.guardianEmployment.entityPosition || null,
            },
          ]
        : [],
      estudiante: {
        telefono: details.studentContact.phone || null,
        fecha_ingreso: matricula.enrollmentDate,
        fk_tlv_genero: toNum(details.student.gender),
        fk_tlv_sisben: toNum(details.complementary.sisben),
        fk_tresguardo: toNum(details.student.ethnicity),
        fk_tpadre: null,
        primer_nombre: details.student.firstName,
        fk_tlv_estrato: toNum(details.complementary.socioeconomicStratum),
        fk_tlv_talento: toNum(details.complementary.talent),
        identificacion: details.student.documentNumber,
        segundo_nombre: details.student.secondName || null,
        primer_apellido: details.student.lastName,
        fecha_nacimiento: details.student.birthDate || null,
        fk_tdiscapacidad: toNum(details.complementary.specialConditions),
        segundo_apellido: details.student.secondLastName || null,
        correo_electronico: details.studentContact.email || null,
        direccion_residencia: details.studentAddress.address || null,
        fk_tlv_tipo_documento: toNum(details.student.documentType),
        fk_tmunicipio_documento: toNum(details.student.documentExpedition.municipality),
        fk_tmunicipio_nacimiento: toNum(details.student.birthPlace.municipality),
        fk_tmunicipio_residencia: toNum(details.studentAddress.municipality),
      },
      socioeconomico: {
        beneficiario_heroe: toRawSN(details.benefits.nationalHeroes),
        institucion_origen: details.previousYear.previousInstitution || null,
        seguridad_social_ars: details.complementary.ars || null,
        seguridad_social_eps: details.complementary.eps || null,
        beneficiario_veterano: toRawSN(details.benefits.publicForceVeteran),
        estudiante_subsidiado: toRawSN(details.benefits.subsidized),
        fk_tlv_fuente_recurso: toNum(details.benefits.fundingSource),
        fk_tmunicipio_victima: toNum(details.conflictVictim.lastExpellingMunicipality),
        ben_hijo_cabeza_familia: toRawSN(details.benefits.headOfHouseholdChildren),
        proviene_otro_municipio: toRawSN(details.originSector.fromAnotherMunicipality),
        proviene_sector_privado: toRawSN(details.originSector.fromPrivateSector),
        fk_tlv_victima_conflicto: toNum(details.conflictVictim.population),
        fk_tlv_condicion_promocion: toNum(details.previousYear.condition),
        beneficiario_cabeza_familia: toRawSN(details.benefits.headOfHouseholdStudent),
        proviene_otro_municipio_cual: details.originSector.whichMunicipality || null,
        fk_tlv_tipo_institucion_origen: null,
        tipo_institucion_origen_nombre: details.previousYear.welfareInstitution || null,
      },
      archivos: [] as unknown[],
    },
  }
}

export const matriculaHandlers = [
  http.get("*/api/eval-col/cobertura-academica/matricula/:id", async ({ params }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const found = idParam ? getMatriculaDetails(idParam) : null

    if (!found) {
      return HttpResponse.json({ message: "Estudiante no encontrado." }, { status: 404 })
    }

    return HttpResponse.json(toRawMatriculaDetail(found.matricula, found.details))
  }),


  http.post("*/api/eval-col/sedes/jornadas-activas", async ({ request }) => {
    await delay(150)
    const { FK_SEDE } = (await request.json()) as { FK_SEDE: number }

    let jornadas = jornadasDb
    if (jornadas.length > 1) {
      // Simula que no todas las sedes ofrecen todas las jornadas, sin dejar
      // la lista vacía.
      const dropIndex = mixHash(hashString(`sede-${FK_SEDE}`)) % jornadas.length
      jornadas = jornadas.filter((_, index) => index !== dropIndex)
    }

    return HttpResponse.json({
      rows: jornadas.map((jornada) => ({ id: jornada.id, nombre: jornada.name })),
    })
  }),

  http.post("*/api/eval-col/sedes/tiene-periodos", async () => {
    await delay(100)
    return HttpResponse.json({ rows: [{ tiene_periodos: true }] })
  }),

  http.post("*/api/eval-col/periodos/resolver-matricula", async ({ request }) => {
    await delay(150)
    const { FK_SEDE, FK_TLV_JORNADA } = (await request.json()) as {
      FK_SEDE: number
      FK_TLV_JORNADA: number
    }
    const periodoId = mixHash(hashString(`periodo-${FK_SEDE}-${FK_TLV_JORNADA}`)) % 100000
    return HttpResponse.json({ rows: [{ periodo_id: periodoId }] })
  }),

  http.post("*/api/eval-col/grados/query/:periodoId", async ({ params }) => {
    await delay(150)
    const periodoId = Array.isArray(params.periodoId) ? params.periodoId[0] : params.periodoId

    const seed = mixHash(hashString(`grados-${periodoId}`))
    const count = 1 + (seed % GRADES.length)
    const offset = seed % GRADES.length
    const grados = Array.from({ length: count }, (_, i) => GRADES[(offset + i) % GRADES.length]).sort(
      (a, b) => a - b,
    )

    return HttpResponse.json({
      // Sin "codigo" -- el back real tampoco lo trae acá. El nombre debe
      // coincidir con el catálogo GRADOS de `select-catalog.ts` (mismo
      // `formatGrade`) para que el join por nombre en `fetchGrados`
      // encuentre el código ordinal.
      rows: grados.map((codigo, index) => ({
        id: mixHash(hashString(`grado-${periodoId}-${codigo}`)) % 1000000,
        nombre: formatGrade(codigo),
        grado: formatGrade(codigo),
        teaching_level_id: 1,
        teaching_level_name: "",
        grado_siguiente: null,
        grado_siguiente_name: null,
        tiene_grado_siguiente: false,
        total_count: index === 0 ? grados.length : grados.length,
      })),
    })
  }),

  http.post("*/api/eval-col/matricula/query", async ({ request }) => {
    await delay(250)

    const body = (await request.json()) as MatriculaListRequestBody
    const filters: MatriculaQueryFilters = {
      search: body.SEARCH ?? undefined,
      statuses: body.STATUSES ?? undefined,
      campus: body.CAMPUS ?? undefined,
      shift: body.SHIFT ?? undefined,
      grade: body.GRADE ?? undefined,
      group: body.GROUP ?? undefined,
    }
    const sorting: MatriculaQueryRequest["sorting"] = body.SORTBY
      ? [{ id: body.SORTBY, desc: body.SORTDIR === "desc" }]
      : []

    const filtered = applySorting(applyFilters(matriculaDb, filters), sorting)

    const totalCount = filtered.length
    const safePageSize = body.PAGESIZE > 0 ? body.PAGESIZE : 10
    const start = body.PAGEINDEX * safePageSize
    const page = filtered.slice(start, start + safePageSize)

    return HttpResponse.json({
      rows: page.map((row) => toRawMatriculaRow(row, totalCount)),
    })
  }),

  // "Cambio de matrícula masivo" (E01HU33) — Sede/Grado/Grupo son cambios
  // independientes, detectados en el front por los campos que el usuario
  // llenó (ver `dialog-modificar-matricula.tsx`).
  http.post("*/api/coverage/matricula/cambio-masivo", async ({ request }) => {
    await delay(400)

    const body = (await request.json()) as BulkMatriculaChangeRequest
    const result = applyBulkMatriculaChange(body)

    return HttpResponse.json<BulkMatriculaChangeResult>(result)
  }),

  http.post("*/api/coverage/matricula/export", async ({ request }) => {
    await delay(600)

    const { ids, format } = (await request.json()) as { ids: string[]; format: ExportFormat }

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${ids.length} estudiante(s) exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("*/api/coverage/matricula/export-all", async ({ request }) => {
    await delay(600)

    const { filters, format } = (await request.json()) as {
      filters: MatriculaQueryFilters
      format: ExportFormat
    }

    const count = applyFilters(matriculaDb, filters).length

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} estudiante(s) exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("*/api/coverage/matricula", async ({ request }) => {
    await delay(300)

    const input = (await request.json()) as CreateMatriculaInput
    const matricula = insertMatricula(input)

    // Simula la detección de notas previas: TODAS las altas "encuentran" que
    // el estudiante ya cursó este grado en otra sede de la misma institución
    // — sin backend real de calificaciones todavía, así el diálogo de
    // homologación se puede probar en cada alta sin depender del azar.
    const otherCampuses = CAMPUSES.filter((campus) => campus !== matricula.campus)
    const homologation: MatriculaHomologationInfo | null =
      otherCampuses.length > 0
        ? {
            previousCampus: otherCampuses[Math.floor(Math.random() * otherCampuses.length)],
            previousInstitution: matricula.institution,
          }
        : null

    return HttpResponse.json<CreateMatriculaResult>({ matricula, homologation })
  }),

  // Endpoint real (`eval-col`, no `coverage`) — ver colección Postman "SSO —
  // configuración de matrícula". La respuesta se arma en snake_case y
  // envuelta en `{rows:[{config:{...}}]}` a propósito, igual que el backend
  // real: es lo que `use-matricula-field-config-query.ts` espera desenvolver.
  http.get("*/api/eval-col/matricula/configuracion", async () => {
    await delay(200)

    return HttpResponse.json({ rows: [{ config: toRawMatriculaFieldConfig() }] })
  }),

  http.put(
    "*/api/eval-col/matricula/configuracion/campo/:campoId",
    async ({ params, request }) => {
      await delay(250)

      const fkCampo = Number(params.campoId)
      const campo = findMatriculaConfigCampo(fkCampo)
      if (!campo) {
        return HttpResponse.json({ message: `El campo ${fkCampo} no existe.` }, { status: 409 })
      }

      const body = (await request.json()) as { requerido?: boolean; visible?: boolean }
      if (body.requerido === undefined && body.visible === undefined) {
        return HttpResponse.json(
          { message: "Hay que mandar al menos uno de requerido/visible." },
          { status: 400 },
        )
      }
      if (!campo.editable) {
        return HttpResponse.json(
          { message: `El campo "${campo.nombre}" no es editable.` },
          { status: 403 },
        )
      }

      if (body.requerido !== undefined) campo.requerido = body.requerido
      if (body.visible !== undefined) campo.visible = body.visible

      return HttpResponse.json({ rows: [{ config: toRawMatriculaFieldConfig() }] })
    },
  ),

  // Misma razón que "config": ruta estática, tiene que ir antes del `:id`.
  http.get("*/api/coverage/matricula/check", async ({ request }) => {
    await delay(300)

    const documentNumber = new URL(request.url).searchParams.get("documentNumber") ?? ""
    const matricula = findActiveMatriculaByDocument(documentNumber)

    return HttpResponse.json<MatriculaDocumentCheckResult>({
      exists: matricula !== null,
      matricula,
    })
  }),

  http.get("*/api/coverage/matricula/:id", async ({ params }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const found = idParam ? getMatriculaDetails(idParam) : null

    if (!found) {
      return HttpResponse.json<MatriculaDetailResult>(
        { status: "error", message: "Estudiante no encontrado.", matricula: null, details: null, files: [] },
        { status: 404 },
      )
    }

    return HttpResponse.json<MatriculaDetailResult>({
      status: "ok",
      message: "",
      matricula: found.matricula,
      details: found.details,
      files: [],
    })
  }),

  http.put("*/api/coverage/matricula/:id", async ({ params, request }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const input = (await request.json()) as CreateMatriculaInput
    const updated = idParam ? updateMatriculaDetails(idParam, input) : null

    if (!updated) {
      return HttpResponse.json<MatriculaMutationResult>(
        { status: "error", message: "Estudiante no encontrado.", matricula: null },
        { status: 404 },
      )
    }

    return HttpResponse.json<MatriculaMutationResult>({
      status: "ok",
      message: "Estudiante actualizado.",
      matricula: updated,
    })
  }),

  http.post("*/api/coverage/matricula/:id/retirar", async ({ params }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const updated = idParam ? updateMatriculaRow(idParam, { status: "Retirado" }) : null

    if (!updated) {
      return HttpResponse.json<MatriculaMutationResult>(
        { status: "error", message: "Estudiante no encontrado.", matricula: null },
        { status: 404 },
      )
    }

    return HttpResponse.json<MatriculaMutationResult>({
      status: "ok",
      message: "Estudiante retirado.",
      matricula: updated,
    })
  }),

  http.post("*/api/coverage/matricula/:id/reingresar", async ({ params }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const updated = idParam ? updateMatriculaRow(idParam, { status: "Cursando" }) : null

    if (!updated) {
      return HttpResponse.json<MatriculaMutationResult>(
        { status: "error", message: "Estudiante no encontrado.", matricula: null },
        { status: 404 },
      )
    }

    return HttpResponse.json<MatriculaMutationResult>({
      status: "ok",
      message: "Estudiante reingresado.",
      matricula: updated,
    })
  }),

  http.delete("*/api/coverage/matricula/:id", async ({ params }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const matricula = matriculaDb.find((item) => item.id === idParam)

    if (!matricula) {
      return HttpResponse.json<ExportResult>(
        { status: "error", message: "Estudiante no encontrado." },
        { status: 404 },
      )
    }

    deleteMatriculaById(matricula.id)

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: "Estudiante eliminado.",
    })
  }),
]
