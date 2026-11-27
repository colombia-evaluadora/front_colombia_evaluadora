import { anulacionPendiente, retiroSolicitadoPor } from "@/mocks/db/solicitud-retiro"
import { registrarAutorizacion, sinAutorizacion } from "@/mocks/db/autorizacion-datos"
import { complementariaDe, origenAdscripcionDe, puedeAgregarComplementaria, tipoDe } from "@/mocks/db/complementaria"
import { metodologiaDe, metodologiaNombre } from "@/mocks/db/metodologia"

// Nuevo: sin matrícula el año anterior en la entidad territorial (variedad fija por pk).
const esNuevo = (pk: number) => pk % 5 === 1
import { tieneSnapshotPendiente } from "@/mocks/db/notas-homologadas"
import { retirosTraslado } from "@/mocks/db/acciones-lote"
import { http, HttpResponse, delay } from "msw"

import {
  applyBulkMatriculaChange,
  deleteMatriculaById,
  findActiveMatriculaByDocument,
  getMatriculaDetails,
  insertMatricula,
  matriculaDb,
  updateMatriculaDetails,
} from "@/mocks/db/matricula"
import {
  findMatriculaConfigCampo,
  matriculaFieldConfigDb,
} from "@/mocks/db/matricula-field-config"
import { CAMPUSES, GRADES } from "@/mocks/db/reservations"
import { jornadasDb } from "@/mocks/db/academic-period/jornadas"
import { formatGrade } from "@/features/coverage/shared/api/ui-mappings"
import type {
  BulkMatriculaChangeRequest,
  BulkMatriculaChangeResult,
  CreateMatriculaInput,
  CreateMatriculaResult,
  ExportResult,
  Matricula,
  MatriculaDetailResult,
  MatriculaDetails,
  MatriculaDocumentCheckResult,
  MatriculaHomologationInfo,
  MatriculaMutationResult,
  MatriculaQueryFilters,
  MatriculaQueryRequest,
} from "@/features/coverage/matricula/api/types/matricula"

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

function matches(value: string, needle: string): boolean {
  return value.toLowerCase().includes(needle.toLowerCase())
}

// Body plano que manda `toListRequest` en `use-matricula-query.ts`.
interface MatriculaListRequestBody {
  SEARCH: string | null
  TIPO?: string | null
  STATUSES: Matricula["status"][] | null
  CAMPUS: string | null
  SHIFT: string | null
  GRADE: number | null
  GROUP: string | null
  METODOLOGIA?: number | null
  SOLICITUD?: "CON_SOLICITUD" | null
  NUEVO?: "S" | "N" | null
  PAGEINDEX: number
  PAGESIZE: number
  SORTBY: string | null
  SORTDIR: "asc" | "desc" | null
}

// camelCase -> snake_case, como manda fn_matricula_listar (V200) — mismo
// criterio que `toRawMatriculaFieldConfig` arriba. `total_count` viaja
// repetido por fila (window count real), no como envelope aparte.
function toRawMatriculaRow(row: Matricula, totalCount: number, totalEstudiantes: number) {
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
    // Columnas de exportación (Regla 47); el back aún no las manda.
    birth_date: "2011-02-03",
    address: "Cl 45 # 12-30",
    phone: "310 455 1020",
    guardian_relationship: row.guardian ? "Madre" : null,
    guardian_email: row.guardian ? "acudiente@correo.com" : null,
    asignaturas: "11",
    soportes: "Documento de identidad",
    status: row.status,
    has_grades: row.hasGrades,
    age_situation: row.ageSituation ?? "SIN_CALCULAR",
    retiro_solicitado: retiroSolicitadoPor(Number(row.id)) ? "S" : "N",
    retiro_solicitado_por: retiroSolicitadoPor(Number(row.id)),
    ...(() => {
      const t = row.status === "Retirado" ? retirosTraslado.get(Number(row.id)) : undefined
      return {
        retiro_traslado: t ? ("S" as const) : ("N" as const),
        acta_retiro: t?.acta ?? null,
        fecha_retiro: t?.fecha ?? null,
        simpade_ingresado: t?.simpade ? ("S" as const) : ("N" as const),
        simpade_fecha_ingreso: t?.simpade?.fechaIngreso ?? null,
        simpade_fk_funcionario: t?.simpade?.funcionarioId ?? null,
      }
    })(),
    anulacion_pendiente: anulacionPendiente(Number(row.id)) ? "S" : "N",
    snapshot_pendiente: tieneSnapshotPendiente(row.id) ? "S" : "N",
    tipo_matricula: tipoDe(Number(row.id)),
    tiene_complementaria: complementariaDe(Number(row.id)) ? "S" : "N",
    origen_adscripcion: origenAdscripcionDe(Number(row.id)),
    puede_agregar_complementaria: puedeAgregarComplementaria(row) ? "S" : "N",
    sin_autorizacion: sinAutorizacion(Number(row.id)) ? "S" : "N",
    // Mock: una de cada siete con posible duplicado (informe de calidad C1).
    posible_duplicado: Number(row.id) % 7 === 0 ? "S" : "N",
    nuevo: esNuevo(Number(row.id)) ? "S" : "N",
    metodologia_grupo: metodologiaNombre(metodologiaDe(Number(row.id))),
    total_count: totalCount,
    total_estudiantes: totalEstudiantes,
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
    if (filters.tipo && tipoDe(Number(row.id)) !== filters.tipo) return false
    if (filters.metodologia != null && metodologiaDe(Number(row.id)) !== filters.metodologia) return false
    if (filters.nuevo && (esNuevo(Number(row.id)) ? "S" : "N") !== filters.nuevo) return false
    if (
      filters.solicitud === "CON_SOLICITUD" &&
      !retiroSolicitadoPor(Number(row.id)) &&
      !anulacionPendiente(Number(row.id))
    ) {
      return false
    }

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
        // Variedad fija por pk para ver cada bloqueo de Editar.
        tipo_matricula: tipoDe(pk),
        tiene_complementaria: complementariaDe(pk) ? ("S" as const) : ("N" as const),
        postulacion_registrada: pk % 3 === 1 ? ("S" as const) : ("N" as const),
        retiro_solicitado_por: retiroSolicitadoPor(pk),
        anulacion_pendiente: anulacionPendiente(pk) ? ("S" as const) : ("N" as const),
        sin_autorizacion: sinAutorizacion(pk) ? ("S" as const) : ("N" as const),
        origen_adscripcion: origenAdscripcionDe(pk),
        fk_tlv_internado: toNum(details.academic.internado ?? ""),
        fk_tlv_pais_origen: toNum(details.student.paisOrigen ?? ""),
        fk_tlv_lengua_materna: toNum(details.student.lenguaMaterna ?? ""),
        fk_tlv_condicion_migratoria: toNum(details.student.condicionMigratoria ?? ""),
        fk_tlv_apoyo_academico: toNum(details.complementary.apoyoAcademico ?? ""),
        fk_tlv_trastorno: toNum(details.complementary.trastorno ?? ""),
        fk_tlv_srpa: toNum(details.complementary.srpa ?? ""),
        fecha_inicio_medida: details.complementary.srpaInicio || null,
        fecha_fin_medida: details.complementary.srpaFin || null,
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
  http.post("*/api/eval-col/cobertura-academica/matricula/:id/autorizacion-datos", async ({ params, request }) => {
    await delay(300)
    const pk = Number(params.id)
    const { ACUDIENTE } = (await request.json()) as { ACUDIENTE: string }
    if (!sinAutorizacion(pk)) return HttpResponse.json({ message: "La matrícula ya tiene la autorización de datos." }, { status: 409 })
    registrarAutorizacion(pk, ACUDIENTE)
    return HttpResponse.json({ rows: [{ pk_tmatricula: pk }] })
  }),

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

    // Todos los grados en cada período: Inscripciones resuelve el grado de cada opción por
    // nombre en el período de su sede, y un subconjunto al azar hacía fallar el alta.
    const grados = [...GRADES]

    return HttpResponse.json({
      // `codigo` es `TGRADO.CODIGO` (confirmado contra una respuesta real,
      // ver `fetchGrados`): ya es el valor ordinal del grado, no hace falta
      // resolverlo por nombre contra el catálogo `GRADOS`.
      rows: grados.map((codigo, index) => ({
        id: mixHash(hashString(`grado-${periodoId}-${codigo}`)) % 1000000,
        nombre: formatGrade(codigo),
        grado: formatGrade(codigo),
        codigo,
        teaching_level_id: 1,
        teaching_level_name: "",
        grado_siguiente: null,
        grado_siguiente_name: null,
        tiene_grado_siguiente: false,
        total_count: index === 0 ? grados.length : grados.length,
      })),
    })
  }),

  // Informes y reportes (3.9): un período 2026 Abierto y uno 2025 Cerrado por sede y jornada.
  http.get("*/api/eval-col/informes-reportes/periodos", async () => {
    await delay(150)
    const pares = [...new Set(matriculaDb.map((m) => `${m.campus}|${m.shift}`))]
    const rows = pares.flatMap((par, i) => {
      const [sede, jornada] = par.split("|")
      return [2026, 2025].map((anio) => ({
        id: anio * 100 + i,
        nombre: `Período ${anio}`,
        anio,
        sede,
        jornada,
        establecimiento: matriculaDb[0]?.institution ?? "",
        estado: anio === 2026 ? "ABIERTO" : "CERRADO",
      }))
    })
    return HttpResponse.json({ rows })
  }),

  // Informe de matrícula (C.4.MAT.1): conteos por grupo de la base del mock.
  http.post("*/api/eval-col/informes-reportes/matricula/query", async () => {
    await delay(200)
    const grupos = new Map<string, Matricula[]>()
    for (const m of matriculaDb) {
      const k = `${m.grade}|${m.group}|${m.campus}|${m.shift}`
      grupos.set(k, [...(grupos.get(k) ?? []), m])
    }
    const rows = [...grupos.entries()].map(([k, ms]) => {
      const [grado, grupo, sede, jornada] = k.split("|")
      const principales = ms.filter((m) => m.tipo !== "COMPLEMENTARIA").length
      const adscritos = ms.filter((m) => m.tipo === "COMPLEMENTARIA" && m.origenAdscripcion).length
      return {
        grado_codigo: Number(grado),
        grado: formatGrade(Number(grado)),
        grupo,
        sede,
        jornada,
        principales,
        complementarias: ms.length - principales - adscritos,
        adscritos,
        total: ms.length,
        extraedad: ms.filter((m) => m.ageSituation === "EXTRAEDAD").length,
      }
    })
    return HttpResponse.json({ rows: rows.sort((a, b) => a.grado_codigo - b.grado_codigo) })
  }),

  // Nivelaciones pendientes (C.4.MAT.2): dos estudiantes de ejemplo.
  http.post("*/api/eval-col/informes-reportes/nivelaciones/query", async () => {
    await delay(200)
    const base = matriculaDb.slice(0, 2)
    const rows = base.flatMap((m, i) =>
      [
        { asignatura: "Matemáticas", periodos: "P1", motivo: "Reingreso" },
        { asignatura: "Inglés", periodos: i ? "P1,P2" : "P1", motivo: i ? "Traslado sin homologar" : "Reingreso" },
      ].map((n) => ({
        matricula_id: Number(m.id),
        documento: m.documentNumber,
        estudiante: `${m.firstName} ${m.lastName}`,
        grupo: m.group,
        responsable: "María López",
        ...n,
      })),
    )
    return HttpResponse.json({ rows: rows.map((r) => ({ ...r, total_count: rows.length })) })
  }),

  http.post("*/api/eval-col/informes-reportes/matriculados/query", async ({ request }) => {
    await delay(250)
    const body = (await request.json()) as MatriculaListRequestBody & { ANIO?: number | null; SITUACION_EDAD?: string | null }
    const filters: MatriculaQueryFilters = {
      search: body.SEARCH ?? undefined,
      statuses: body.STATUSES ?? undefined,
      campus: body.CAMPUS ?? undefined,
      shift: body.SHIFT ?? undefined,
      grade: body.GRADE ?? undefined,
      group: body.GROUP ?? undefined,
      metodologia: body.METODOLOGIA ?? undefined,
      nuevo: body.NUEVO ?? undefined,
      tipo: (body.TIPO as MatriculaQueryFilters["tipo"]) ?? undefined,
    }
    const sorting: MatriculaQueryRequest["sorting"] = body.SORTBY ? [{ id: body.SORTBY, desc: body.SORTDIR === "desc" }] : []
    // Las impares quedan en el período Cerrado de 2025.
    const anioDe = (m: Matricula) => (Number(m.id) % 2 ? 2025 : 2026)
    const filtered = applySorting(applyFilters(matriculaDb, filters), sorting).filter(
      (m) =>
        (!body.ANIO || anioDe(m) === body.ANIO) &&
        (!body.SITUACION_EDAD || (m.ageSituation ?? "SIN_CALCULAR") === body.SITUACION_EDAD),
    )
    const size = body.PAGESIZE > 0 ? body.PAGESIZE : 10
    const page = filtered.slice(body.PAGEINDEX * size, body.PAGEINDEX * size + size)
    const estudiantes = new Set(filtered.map((r) => r.documentNumber)).size
    return HttpResponse.json({
      rows: page.map((m) => ({
        ...toRawMatriculaRow(m, filtered.length, estudiantes),
        anio: anioDe(m),
        periodo: `Período ${anioDe(m)}`,
        periodo_estado: anioDe(m) === 2025 ? "CERRADO" : "ABIERTO",
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
      metodologia: body.METODOLOGIA ?? undefined,
      solicitud: body.SOLICITUD ?? undefined,
      nuevo: body.NUEVO ?? undefined,
      tipo: (body.TIPO as MatriculaQueryFilters["tipo"]) ?? undefined,
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
      rows: page.map((row) => toRawMatriculaRow(row, totalCount, new Set(filtered.map((r) => r.documentNumber)).size)),
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

    return HttpResponse.json<CreateMatriculaResult>({ matricula, homologation, failedOtherDocuments: [] })
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
      // Pendiente en el back: período de esa matrícula y si es de otro establecimiento (SOL.1).
      periodo: matricula ? { id: 1, label: "2026 · Anual · Ciclo 1" } : null,
      otroEstablecimiento: matricula ? Number(matricula.id) % 3 === 0 : false,
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

  // Altas de persona que usan matrícula e inscripción cuando el documento no existe.
  http.post("*/api/auth/register/usuario", async () => {
    await delay(200)
    const pkTusuario = 900_000 + Math.floor(Math.random() * 90_000)
    return HttpResponse.json({ idUser: pkTusuario, pkTusuario, pkFuncionario: null, email: "" })
  }),
  http.post("*/api/eval-col/cobertura-academica/usuario-administrado", async () => {
    await delay(200)
    return HttpResponse.json({ rows: [{ pk_tusuario: 900_000 + Math.floor(Math.random() * 90_000) }] })
  }),
]
