import { http, HttpResponse, delay } from "msw"

import { nextId } from "@/mocks/db/next-id"
import {
  establecimientoInactivoDb,
  establecimientosSupervisorDb,
  supervisoresDb,
  tiposDocumentoXlDb,
  toSupervisor,
  type SupervisorMock,
} from "@/mocks/db/supervisores-territoriales"

// Misma forma y mismos errores que el back real (V328–V329.1): `{ rows: [{ resultado }] }`,
// 409 documento o correo repetidos, 400 sin establecimientos o con uno nuevo inactivo, 404 inexistente.
const resultado = (data: unknown) => HttpResponse.json({ rows: [{ resultado: data }] })
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })

interface Body {
  TIPO_DOCUMENTO?: number
  NUMERO_DOCUMENTO?: string
  PRIMER_NOMBRE?: string
  SEGUNDO_NOMBRE?: string | null
  PRIMER_APELLIDO?: string
  SEGUNDO_APELLIDO?: string | null
  CORREO?: string
  DEPENDENCIA?: string | null
  TODOS_ESTABLECIMIENTOS?: boolean
  ESTABLECIMIENTOS?: number[]
  ACTIVO?: boolean
}

function repetido(body: Body, excluir?: number): string | null {
  const otros = supervisoresDb.filter((s) => s.pkSupervisor !== excluir)
  if (otros.some((s) => s.pkTipo === body.TIPO_DOCUMENTO && s.numeroDocumento === body.NUMERO_DOCUMENTO))
    return "El documento ya está registrado para otro Supervisor territorial."
  if (otros.some((s) => s.correo.toLowerCase() === body.CORREO?.toLowerCase()))
    return "El correo ya está registrado para otro Supervisor territorial."
  return null
}

/** fn_suptr_validar_establecimientos: uno ya a cargo que se inactivó puede quedarse. */
function alcanceInvalido(body: Body, actual?: SupervisorMock): string | null {
  if (body.TODOS_ESTABLECIMIENTOS) return null
  const ids = body.ESTABLECIMIENTOS ?? []
  if (ids.length === 0) return "Seleccione al menos un establecimiento, o active Todos los establecimientos."
  const nuevoInactivo = ids.some(
    (pk) =>
      !establecimientosSupervisorDb.some((e) => e.pk === pk) &&
      !(pk === establecimientoInactivoDb.pk && actual?.establecimientoIds.includes(pk)),
  )
  return nuevoInactivo ? "Solo se pueden asignar establecimientos activos." : null
}

function datos(body: Body) {
  return {
    pkTipo: body.TIPO_DOCUMENTO!,
    numeroDocumento: body.NUMERO_DOCUMENTO!,
    primerNombre: body.PRIMER_NOMBRE!,
    segundoNombre: body.SEGUNDO_NOMBRE ?? null,
    primerApellido: body.PRIMER_APELLIDO!,
    segundoApellido: body.SEGUNDO_APELLIDO ?? null,
    correo: body.CORREO!,
    dependencia: body.DEPENDENCIA?.trim() || null,
    todosEstablecimientos: Boolean(body.TODOS_ESTABLECIMIENTOS),
    establecimientoIds: body.TODOS_ESTABLECIMIENTOS ? [] : [...new Set(body.ESTABLECIMIENTOS ?? [])],
  }
}

const buscar = (id: unknown) => supervisoresDb.find((s) => s.pkSupervisor === Number(id))

export const supervisoresTerritorialesHandlers = [
  http.get("/api/eval-col/catalogos/supervisores-territoriales", async () => {
    await delay(150)
    return resultado({ tiposDocumento: tiposDocumentoXlDb, establecimientos: establecimientosSupervisorDb })
  }),

  http.get("/api/eval-col/supervisores-territoriales", async () => {
    await delay(200)
    return resultado(supervisoresDb.map(toSupervisor).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")))
  }),

  http.get("/api/eval-col/supervisores-territoriales/:id", async ({ params }) => {
    await delay(150)
    const s = buscar(params.id)
    return s ? resultado(toSupervisor(s)) : error(404, "No existe el Supervisor territorial solicitado.")
  }),

  http.post("/api/eval-col/supervisores-territoriales", async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as Body
    const fallo = repetido(body) ?? alcanceInvalido(body)
    if (fallo) return error(fallo.startsWith("El ") ? 409 : 400, fallo)
    const activo = body.ACTIVO ?? true
    const nuevo: SupervisorMock = {
      pkSupervisor: nextId(supervisoresDb.map((s) => s.pkSupervisor)),
      pkUsuario: null,
      ...datos(body),
      activo,
      pendienteActivacion: activo,
    }
    supervisoresDb.push(nuevo)
    return resultado({ supervisor: toSupervisor(nuevo), invitar: activo, cuentaExistente: false })
  }),

  // Antes que `/:id`: MSW usa el primer match.
  http.put("/api/eval-col/supervisores-territoriales/:id/estado", async ({ params, request }) => {
    await delay(250)
    const s = buscar(params.id)
    if (!s) return error(404, "No existe el Supervisor territorial solicitado.")
    s.activo = Boolean(((await request.json()) as Body).ACTIVO)
    return resultado(toSupervisor(s))
  }),

  http.put("/api/eval-col/supervisores-territoriales/:id", async ({ params, request }) => {
    await delay(300)
    const s = buscar(params.id)
    if (!s) return error(404, "No existe el Supervisor territorial solicitado.")
    const body = (await request.json()) as Body
    const fallo = repetido(body, s.pkSupervisor) ?? alcanceInvalido(body, s)
    if (fallo) return error(fallo.startsWith("El ") ? 409 : 400, fallo)
    const correoAnterior = s.correo.toLowerCase() !== body.CORREO?.toLowerCase() ? s.correo : null
    Object.assign(s, datos(body), {
      activo: body.ACTIVO ?? s.activo,
      pendienteActivacion: correoAnterior ? true : s.pendienteActivacion,
    })
    return resultado({ supervisor: toSupervisor(s), correoAnterior })
  }),
]
