import { delay, http, HttpResponse } from "msw"

import { employeesDb } from "@/mocks/db/employees"

import type { Employee } from "@/features/establishment/employees/api/types/employee"

// Funcionarios por establecimiento (sso V579.x). El mock no modela establecimientos por
// funcionario: todos pertenecen al que se pida y el EE es Oficial. Soporte y anexos viven aquí.
const soporte = new Set<number>()
const anexos = new Map<number, { id: number; fileId: number; name: string; description: string; fileName: string; size: number; createdAt: string }[]>()
let siguienteAnexo = 1

const nombreDe = (e: Employee) =>
  [e.person.firstName, e.person.middleName, e.person.lastName, e.person.secondLastName].filter(Boolean).join(" ")
const estadoDe = (e: Employee) => (e.permissions.some((p) => p.status === "ACTIVE") ? "A" : "I")
const enmascarar = (correo: string) => {
  const [local, dominio = ""] = correo.split("@")
  return `${local.slice(0, 2)}****@${dominio.slice(0, 2)}***.${dominio.split(".").pop()}`
}

function filaListado(e: Employee, total: number) {
  return {
    pk_empleado: e.id,
    tipo_documento: e.person.documentType?.code ?? "CC",
    numero_documento: e.person.identification,
    nombre_completo: nombreDe(e),
    usuario_soporte: soporte.has(e.id as number),
    roles: [...new Map(e.permissions.map((p) => [p.role.id, { id: p.role.id, nombre: p.role.name }])).values()],
    designaciones: [],
    estado: estadoDe(e),
    estado_label: estadoDe(e) === "A" ? "Activo" : "Inactivo",
    total_count: total,
  }
}

function fichaDe(e: Employee) {
  return {
    pk_empleado: e.id,
    fk_tlv_tipo_documento: e.person.documentType?.id ?? null,
    tipo_documento_nombre: e.person.documentType?.name ?? null,
    tipo_documento: e.person.documentType?.code ?? null,
    identificacion: e.person.identification,
    primer_nombre: e.person.firstName,
    segundo_nombre: e.person.middleName ?? null,
    primer_apellido: e.person.lastName,
    segundo_apellido: e.person.secondLastName ?? null,
    fecha_nacimiento: e.person.birthDate?.slice(0, 10) ?? null,
    fk_tlv_genero: e.person.gender?.id ?? null,
    genero_nombre: e.person.gender?.name ?? null,
    correo_electronico: e.person.email,
    telefono: e.person.phone,
    contacto_protegido: false,
    usuario_soporte: soporte.has(e.id as number),
    fk_tarchivo_foto: e.person.photoArchivoId ?? null,
    estado: estadoDe(e),
    ee_oficial: true,
    fk_tlv_clase_funcionario: e.employeeClass?.id ?? null,
    clase_funcionario_nombre: e.employeeClass?.name ?? null,
    fk_tlv_nivel_esenanza: e.educationLevel?.id ?? null,
    nivel_esenanza_nombre: e.educationLevel?.name ?? null,
    fk_tlv_estatuto_docente: null,
    estatuto_docente_nombre: null,
    fk_tlv_grado_escalafon: e.grade?.id ?? null,
    grado_escalafon_nombre: e.grade?.name ?? null,
    fk_tlv_nivel_educativo: e.highestEducationLevel?.id ?? null,
    nivel_educativo_nombre: e.highestEducationLevel?.name ?? null,
    fk_tlv_fuente_recurso: e.fundingSource?.id ?? null,
    fuente_recurso_nombre: e.fundingSource?.name ?? null,
    fk_tlv_tipo_vinculacion: e.employmentType?.id ?? null,
    tipo_vinculacion_nombre: e.employmentType?.name ?? null,
    direccion: e.address,
    designaciones: [],
    permisos: e.permissions.map((p, i) => ({
      id: p.id ?? i + 1,
      orden: p.order,
      role: p.role,
      campus: { id: p.campus.id, name: p.campus.name, dane: p.campus.dane },
      workSchedule: p.workSchedule,
      status: p.status,
      principalDe: null,
    })),
    archivos: anexos.get(e.id as number) ?? [],
    puede_editar: true,
    puede_corregir_identidad: true,
  }
}

const buscar = (id: unknown) => employeesDb.find((e) => e.id === Number(id))
const noEncontrado = () => HttpResponse.json({ message: "No se encontró el funcionario." }, { status: 404 })

export const funcionariosHandlers = [
  http.post("*/api/eval-col/establecimientos/funcionarios/query", async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as {
      filters?: { search?: string | null; statuses?: string[] }
      pageIndex?: number
      pageSize?: number
    }
    const texto = (body.filters?.search ?? "").toLowerCase()
    const estados = body.filters?.statuses ?? []
    const filtrados = employeesDb.filter(
      (e) =>
        (!texto || nombreDe(e).toLowerCase().includes(texto) || e.person.identification.includes(texto)) &&
        (estados.length === 0 || estados.includes(estadoDe(e))),
    )
    const size = body.pageSize || 10
    const page = body.pageIndex ?? 0
    const rows = filtrados.slice(page * size, page * size + size).map((e) => filaListado(e, filtrados.length))
    return HttpResponse.json({ rows })
  }),

  http.get("*/api/eval-col/establecimientos/funcionarios/establecimiento", async ({ request }) => {
    await delay(100)
    const id = Number(new URL(request.url).searchParams.get("establecimiento") ?? 1)
    return HttpResponse.json({ rows: [{ establecimiento_id: id, nombre: "Establecimiento", oficial: true }] })
  }),

  http.get("*/api/eval-col/establecimientos/funcionarios/por-documento", async ({ request }) => {
    await delay(200)
    const numero = new URL(request.url).searchParams.get("identificacion") ?? ""
    const e = employeesDb.find((x) => x.person.identification === numero)
    if (!e) return HttpResponse.json({ rows: [] })
    return HttpResponse.json({
      rows: [
        {
          pk_tusuario: e.person.id ?? e.id,
          pk_funcionario: e.id,
          fk_tlv_tipo_documento: e.person.documentType?.id,
          identificacion: e.person.identification,
          primer_nombre: e.person.firstName,
          segundo_nombre: e.person.middleName ?? null,
          primer_apellido: e.person.lastName,
          segundo_apellido: e.person.secondLastName ?? null,
          fecha_nacimiento: e.person.birthDate?.slice(0, 10) ?? null,
          fk_tlv_genero: e.person.gender?.id ?? null,
          genero_nombre: e.person.gender?.name ?? null,
          correo_protegido: enmascarar(e.person.email),
          telefono_protegido: `${e.person.phone.slice(0, 3)}***${e.person.phone.slice(-4)}`,
          fk_tarchivo_foto: null,
          vinculado: true,
        },
      ],
    })
  }),

  http.get("*/api/eval-col/establecimientos/funcionarios/:id/ficha", async ({ params }) => {
    await delay(200)
    const e = buscar(params.id)
    return e ? HttpResponse.json({ rows: [fichaDe(e)] }) : noEncontrado()
  }),

  ...["*/api/eval-col/establecimientos/funcionarios/:id/ficha", "*/api/files/eval-col/establecimientos/funcionarios/:id/ficha"].map(
    (ruta) =>
      http.post(ruta, async ({ params, request }) => {
        await delay(300)
        const e = buscar(params.id)
        if (!e) return noEncontrado()
        const body = request.headers.get("content-type")?.includes("json")
          ? ((await request.json()) as Record<string, unknown>)
          : Object.fromEntries((await request.formData()).entries())
        const anterior = e.person.email
        if (String(body.CON_CONTACTO) === "true") {
          e.person.email = String(body.CORREO ?? e.person.email)
          e.person.phone = String(body.TELEFONO ?? "")
        }
        if (String(body.CON_COMPLEMENTARIA) === "true") e.address = String(body.DIRECCION ?? "")
        const cambio = anterior.toLowerCase() !== e.person.email.toLowerCase()
        return HttpResponse.json({
          rows: [{ ficha: { pkFuncionario: e.id, correoCambio: cambio, correoAnterior: cambio ? anterior : null } }],
        })
      }),
  ),

  http.put("*/api/eval-col/establecimientos/funcionarios/:id/usuario-soporte", async ({ params, request }) => {
    await delay(200)
    const { SOPORTE } = (await request.json()) as { SOPORTE: boolean }
    if (SOPORTE) soporte.add(Number(params.id))
    else soporte.delete(Number(params.id))
    return HttpResponse.json({ rows: [{ soporte: { pkFuncionario: Number(params.id), usuarioSoporte: SOPORTE } }] })
  }),

  http.post("*/api/files/eval-col/establecimientos/funcionarios/:id/corregir-identidad", async ({ params, request }) => {
    await delay(300)
    const e = buscar(params.id)
    if (!e) return noEncontrado()
    const form = await request.formData()
    e.person.firstName = String(form.get("PRIMER_NOMBRE") ?? e.person.firstName)
    e.person.lastName = String(form.get("PRIMER_APELLIDO") ?? e.person.lastName)
    e.person.identification = String(form.get("IDENTIFICACION") ?? e.person.identification)
    return HttpResponse.json({ rows: [{ correccion: { pkFuncionario: e.id, pkCorreccion: Date.now() } }] })
  }),

  http.post("*/api/files/eval-col/establecimientos/funcionarios/:id/archivos", async ({ params, request }) => {
    await delay(300)
    const form = await request.formData()
    const archivo = form.get("ARCHIVO")
    const lista = anexos.get(Number(params.id)) ?? []
    const id = siguienteAnexo++
    lista.unshift({
      id,
      fileId: id,
      name: String(form.get("NOMBRE") ?? ""),
      description: String(form.get("DESCRIPCION") ?? ""),
      fileName: archivo instanceof File ? archivo.name : "archivo",
      size: archivo instanceof File ? archivo.size : 0,
      createdAt: new Date().toISOString(),
    })
    anexos.set(Number(params.id), lista)
    return HttpResponse.json({ rows: [{ archivo: { id } }] })
  }),

  http.patch("*/api/eval-col/establecimientos/funcionarios/archivos/:id", async ({ params }) => {
    await delay(200)
    for (const [funcionario, lista] of anexos) {
      anexos.set(funcionario, lista.filter((a) => a.id !== Number(params.id)))
    }
    return HttpResponse.json({ rows: [{ archivo: { id: Number(params.id), eliminado: true } }] })
  }),
]
