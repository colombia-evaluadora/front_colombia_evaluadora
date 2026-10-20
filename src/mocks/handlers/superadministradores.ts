import { http, HttpResponse, delay } from "msw"

import { findUserByToken } from "@/mocks/db/auth"
import { nextId } from "@/mocks/db/next-id"
import {
  superadministradoresDb,
  tiposDocumentoXlDb,
  toSuperadministrador,
} from "@/mocks/db/superadministradores"

// Misma forma y mismos errores que el back real (V322–V325): `{ rows: [{ resultado }] }`,
// 409 documento/correo repetidos y último activo, 400 inactivarse a sí mismo.
const resultado = (data: unknown) => HttpResponse.json({ rows: [{ resultado: data }] })
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })

function solicitante(request: Request) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /i, "") ?? ""
  return findUserByToken(token)?.email
}

interface Body {
  TIPO_DOCUMENTO?: number
  NUMERO_DOCUMENTO?: string
  PRIMER_NOMBRE?: string
  SEGUNDO_NOMBRE?: string | null
  PRIMER_APELLIDO?: string
  SEGUNDO_APELLIDO?: string | null
  CORREO?: string
  ACTIVO?: boolean
}

function repetido(body: Body, excluir?: number): string | null {
  const otros = superadministradoresDb.filter((s) => s.pkSuperadministrador !== excluir)
  if (
    otros.some(
      (s) => s.pkTipo === body.TIPO_DOCUMENTO && s.numeroDocumento === body.NUMERO_DOCUMENTO,
    )
  )
    return "El documento ya está registrado para otro Superadministrador."
  if (otros.some((s) => s.correo.toLowerCase() === body.CORREO?.toLowerCase()))
    return "El correo ya está registrado para otro Superadministrador."
  return null
}

export const superadministradoresHandlers = [
  http.get("/api/eval-col/catalogos/superadministradores/tipos-documento", async () => {
    await delay(150)
    return resultado(tiposDocumentoXlDb)
  }),

  http.get("/api/eval-col/superadministradores", async ({ request }) => {
    await delay(200)
    const email = solicitante(request)
    return resultado(
      superadministradoresDb
        .map((s) => toSuperadministrador(s, email))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    )
  }),

  http.post("/api/eval-col/superadministradores", async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as Body
    const fallo = repetido(body)
    if (fallo) return error(409, fallo)
    const nuevo = {
      pkSuperadministrador: nextId(superadministradoresDb.map((s) => s.pkSuperadministrador)),
      pkUsuario: null,
      pkTipo: body.TIPO_DOCUMENTO!,
      numeroDocumento: body.NUMERO_DOCUMENTO!,
      primerNombre: body.PRIMER_NOMBRE!,
      segundoNombre: body.SEGUNDO_NOMBRE ?? null,
      primerApellido: body.PRIMER_APELLIDO!,
      segundoApellido: body.SEGUNDO_APELLIDO ?? null,
      correo: body.CORREO!,
      activo: true,
      pendienteActivacion: true,
    }
    superadministradoresDb.push(nuevo)
    return resultado({
      superadministrador: toSuperadministrador(nuevo, solicitante(request)),
      invitar: true,
      cuentaExistente: false,
    })
  }),

  http.put("/api/eval-col/superadministradores/:id/estado", async ({ params, request }) => {
    await delay(250)
    const s = superadministradoresDb.find((x) => x.pkSuperadministrador === Number(params.id))
    if (!s) return error(404, "No existe el Superadministrador solicitado.")
    const activo = Boolean(((await request.json()) as Body).ACTIVO)
    const email = solicitante(request)
    if (!activo) {
      if (s.correo === email) return error(400, "No puede inactivarse a sí mismo.")
      if (!superadministradoresDb.some((x) => x !== s && x.activo)) {
        const nombre = `${s.primerNombre} ${s.primerApellido}`
        return error(
          409,
          `No se puede inactivar a ${nombre} porque es el único Superadministrador activo de la plataforma.`,
        )
      }
    }
    s.activo = activo
    return resultado(toSuperadministrador(s, email))
  }),

  http.put("/api/eval-col/superadministradores/:id", async ({ params, request }) => {
    await delay(300)
    const s = superadministradoresDb.find((x) => x.pkSuperadministrador === Number(params.id))
    if (!s) return error(404, "No existe el Superadministrador solicitado.")
    const body = (await request.json()) as Body
    const fallo = repetido(body, s.pkSuperadministrador)
    if (fallo) return error(409, fallo)
    const correoAnterior = s.correo.toLowerCase() !== body.CORREO?.toLowerCase() ? s.correo : null
    Object.assign(s, {
      pkTipo: body.TIPO_DOCUMENTO!,
      numeroDocumento: body.NUMERO_DOCUMENTO!,
      primerNombre: body.PRIMER_NOMBRE!,
      segundoNombre: body.SEGUNDO_NOMBRE ?? null,
      primerApellido: body.PRIMER_APELLIDO!,
      segundoApellido: body.SEGUNDO_APELLIDO ?? null,
      correo: body.CORREO!,
      pendienteActivacion: correoAnterior ? true : s.pendienteActivacion,
    })
    return resultado({
      superadministrador: toSuperadministrador(s, solicitante(request)),
      correoAnterior,
    })
  }),
]
