import { http, HttpResponse, delay } from "msw"

import { nextId } from "@/mocks/db/next-id"
import {
  administradoresDb,
  tiposDocumentoXlDb,
  toAdministrador,
  type AdministradorMock,
} from "@/mocks/db/administradores-territoriales"

// Misma forma y mismos errores que el back real (V333–V353): `{ rows: [{ resultado }] }`,
// 409 documento o correo repetidos, 400 dependencia fuera de 3–150, 404 inexistente.
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
  ACTIVO?: boolean
}

function repetido(body: Body, excluir?: number): string | null {
  const otros = administradoresDb.filter((a) => a.pkAdministrador !== excluir)
  if (otros.some((a) => a.pkTipo === body.TIPO_DOCUMENTO && a.numeroDocumento === body.NUMERO_DOCUMENTO))
    return "El documento ya está registrado para otro Administrador territorial."
  if (otros.some((a) => a.correo.toLowerCase() === body.CORREO?.toLowerCase()))
    return "El correo ya está registrado para otro Administrador territorial."
  return null
}

function dependenciaInvalida(body: Body): string | null {
  const d = body.DEPENDENCIA?.trim() ?? ""
  return d && (d.length < 3 || d.length > 150) ? "La dependencia debe tener entre 3 y 150 caracteres." : null
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
  }
}

const buscar = (id: unknown) => administradoresDb.find((a) => a.pkAdministrador === Number(id))
const NO_EXISTE = "No existe el Administrador territorial solicitado."

export const administradoresTerritorialesHandlers = [
  http.get("/api/eval-col/catalogos/administradores-territoriales", async () => {
    await delay(150)
    return resultado({ tiposDocumento: tiposDocumentoXlDb })
  }),

  http.get("/api/eval-col/administradores-territoriales", async () => {
    await delay(200)
    return resultado(administradoresDb.map(toAdministrador).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")))
  }),

  http.get("/api/eval-col/administradores-territoriales/:id", async ({ params }) => {
    await delay(150)
    const a = buscar(params.id)
    return a ? resultado(toAdministrador(a)) : error(404, NO_EXISTE)
  }),

  http.post("/api/eval-col/administradores-territoriales", async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as Body
    const fallo = repetido(body)
    if (fallo) return error(409, fallo)
    const invalida = dependenciaInvalida(body)
    if (invalida) return error(400, invalida)
    const activo = body.ACTIVO ?? true
    const nuevo: AdministradorMock = {
      pkAdministrador: nextId(administradoresDb.map((a) => a.pkAdministrador)),
      pkUsuario: null,
      ...datos(body),
      activo,
      pendienteActivacion: activo,
    }
    administradoresDb.push(nuevo)
    return resultado({ administrador: toAdministrador(nuevo), invitar: activo, cuentaExistente: false })
  }),

  // Antes que `/:id`: MSW usa el primer match.
  http.put("/api/eval-col/administradores-territoriales/:id/estado", async ({ params, request }) => {
    await delay(250)
    const a = buscar(params.id)
    if (!a) return error(404, NO_EXISTE)
    a.activo = Boolean(((await request.json()) as Body).ACTIVO)
    return resultado(toAdministrador(a))
  }),

  http.put("/api/eval-col/administradores-territoriales/:id", async ({ params, request }) => {
    await delay(300)
    const a = buscar(params.id)
    if (!a) return error(404, NO_EXISTE)
    const body = (await request.json()) as Body
    const fallo = repetido(body, a.pkAdministrador)
    if (fallo) return error(409, fallo)
    const invalida = dependenciaInvalida(body)
    if (invalida) return error(400, invalida)
    const correoAnterior = a.correo.toLowerCase() !== body.CORREO?.toLowerCase() ? a.correo : null
    Object.assign(a, datos(body), {
      activo: body.ACTIVO ?? a.activo,
      pendienteActivacion: correoAnterior ? true : a.pendienteActivacion,
    })
    return resultado({ administrador: toAdministrador(a), correoAnterior })
  }),
]
