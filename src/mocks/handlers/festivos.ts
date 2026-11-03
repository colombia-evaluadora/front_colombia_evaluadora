import { http, HttpResponse, delay } from "msw"

import { fechaFestivo, toIso } from "@/features/administration/festivos/lib/fecha-festivo"
import type { Festivo, TipoFecha } from "@/features/administration/festivos/api/types"
import { festivosDb, type FestivoRecord } from "@/mocks/db/festivos"
import { nextId } from "@/mocks/db/next-id"

// Misma forma y errores que el back (`fn_festivo_*`, V337): `{ rows: [{ resultado }] }`,
// 404 inexistente, 400 por validación, 409 por nombre repetido o en uso.
// El mock no tiene períodos comenzados: ningún festivo queda en uso.
const resultado = (data: unknown) => HttpResponse.json({ rows: [{ resultado: data }] })
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })

const diasDelMes = (mes: number) => new Date(2023, mes, 0).getDate()

function aJson(f: FestivoRecord): Festivo {
  const fecha = fechaFestivo(f, new Date().getFullYear())
  return { ...f, fechaAnioEnCurso: fecha ? toIso(fecha) : "", enUso: false }
}

interface FestivoBody {
  NOMBRE?: string
  TIPO_FECHA?: TipoFecha
  MES?: number | null
  DIA?: number | null
  DIAS_PASCUA?: number | null
  TRASLADO_LUNES?: boolean | null
}

/** Valida como `fn_festivo_validar_*`; devuelve el registro o un mensaje de error. */
function leer(body: FestivoBody, pk: number | null): { status: number; message: string } | Omit<FestivoRecord, "pkFestivo" | "habilitado"> {
  const nombre = (body.NOMBRE ?? "").trim()
  if (nombre.length < 3 || nombre.length > 80)
    return { status: 400, message: "El nombre debe tener entre 3 y 80 caracteres." }
  if (festivosDb.some((f) => f.pkFestivo !== pk && f.nombre.toLowerCase() === nombre.toLowerCase()))
    return { status: 409, message: "El nombre ya existe en otro festivo." }
  const tipo = body.TIPO_FECHA
  if (tipo === "PASCUA") {
    const dias = Number(body.DIAS_PASCUA)
    if (body.DIAS_PASCUA == null || !Number.isInteger(dias) || dias < -10 || dias > 100)
      return { status: 400, message: "Los días respecto del Domingo de Pascua deben estar entre -10 y 100." }
    return { nombre, tipoFecha: tipo, mes: null, dia: null, diasPascua: dias, trasladoLunes: Boolean(body.TRASLADO_LUNES) }
  }
  if (tipo !== "FIJA" && tipo !== "LEY_EMILIANI")
    return { status: 400, message: "El tipo de fecha debe ser Fija, Ley Emiliani o Relativa a la Pascua." }
  const mes = Number(body.MES)
  const dia = Number(body.DIA)
  if (!(mes >= 1 && mes <= 12)) return { status: 400, message: "Seleccione el mes del festivo." }
  if (mes === 2 && dia === 29) return { status: 400, message: "La fecha no puede ser el 29 de febrero." }
  if (!(dia >= 1 && dia <= diasDelMes(mes))) return { status: 400, message: `El día ${dia} no existe en el mes ${mes}` }
  return { nombre, tipoFecha: tipo, mes, dia, diasPascua: null, trasladoLunes: false }
}

const porFecha = (a: Festivo, b: Festivo) =>
  a.fechaAnioEnCurso.localeCompare(b.fechaAnioEnCurso) || a.nombre.localeCompare(b.nombre)

export const festivosHandlers = [
  http.get("/api/eval-col/festivos", async () => {
    await delay(200)
    return resultado(festivosDb.map(aJson).sort(porFecha))
  }),

  http.post("/api/eval-col/festivos", async ({ request }) => {
    await delay(200)
    const datos = leer((await request.json()) as FestivoBody, null)
    if ("status" in datos) return error(datos.status, datos.message)
    const nuevo: FestivoRecord = { ...datos, pkFestivo: nextId(festivosDb.map((f) => f.pkFestivo)), habilitado: true }
    festivosDb.push(nuevo)
    return resultado(aJson(nuevo))
  }),

  // Rutas estáticas antes que `/festivos/:id`: MSW usa el primer match.
  http.put("/api/eval-col/festivos/:id/estado", async ({ params, request }) => {
    await delay(200)
    const festivo = festivosDb.find((f) => f.pkFestivo === Number(params.id))
    if (!festivo) return error(404, `No existe el festivo ${params.id}`)
    const body = (await request.json()) as { HABILITADO?: boolean }
    if (typeof body.HABILITADO !== "boolean")
      return error(400, "Indique si el festivo queda activo o inactivo.")
    festivo.habilitado = body.HABILITADO
    return resultado(aJson(festivo))
  }),

  http.put("/api/eval-col/festivos/:id/eliminar", async ({ params }) => {
    await delay(200)
    const i = festivosDb.findIndex((f) => f.pkFestivo === Number(params.id))
    if (i < 0) return error(404, `No existe el festivo ${params.id}`)
    const [eliminado] = festivosDb.splice(i, 1)
    return resultado(aJson(eliminado))
  }),

  http.put("/api/eval-col/festivos/:id", async ({ params, request }) => {
    await delay(200)
    const festivo = festivosDb.find((f) => f.pkFestivo === Number(params.id))
    if (!festivo) return error(404, `No existe el festivo ${params.id}`)
    const datos = leer((await request.json()) as FestivoBody, festivo.pkFestivo)
    if ("status" in datos) return error(datos.status, datos.message)
    Object.assign(festivo, datos)
    return resultado(aJson(festivo))
  }),
]
