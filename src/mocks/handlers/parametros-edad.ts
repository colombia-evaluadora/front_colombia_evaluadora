import { http, HttpResponse, delay } from "msw"

import {
  validarCortes,
  type Cortes,
} from "@/features/administration/parametros-edad/api/types"
import {
  calendariosDb,
  cortesDb,
  cortesDefectoDb,
  edadesDb,
  gradosDb,
} from "@/mocks/db/parametros-edad"

// Misma forma y errores que el back real (`fn_parametroedad_*`): `{ rows: [{ resultado }] }`,
// 404 si el valor no es de la lista, 400 por validación y 409 por duplicado al agregar.
const resultado = (data: unknown) => HttpResponse.json({ rows: [{ resultado: data }] })
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })

const diasDelMes = (mes: number) => new Date(2023, mes, 0).getDate()
const orden = <T extends { pkListaValor: number }>(lista: T[], pk: number) =>
  lista.findIndex((v) => v.pkListaValor === pk)
const aCorte = (v: unknown) => (v == null || v === "" ? null : Number(v))

interface CortesBody {
  BAJA_EDAD_HASTA?: number | null
  PREEXTRAEDAD_DESDE?: number | null
  EXTRAEDAD_DESDE?: number | null
}

function listar() {
  return {
    grados: [...edadesDb]
      .sort(([a], [b]) => orden(gradosDb, a) - orden(gradosDb, b))
      .map(([pk, e]) => ({
        pkGrado: pk,
        grado: gradosDb.find((g) => g.pkListaValor === pk)?.nombre ?? "",
        ...e,
      })),
    calendarios: [...cortesDb]
      .sort(([a], [b]) => orden(calendariosDb, a) - orden(calendariosDb, b))
      .map(([pk, c]) => ({
        pkCalendario: pk,
        calendario: calendariosDb.find((v) => v.pkListaValor === pk)?.nombre ?? "",
        ...c,
      })),
    cortesDefecto: { ...cortesDefectoDb },
  }
}

export const parametrosEdadHandlers = [
  // Solo las dos listas que usa esta vista; el resto sigue al siguiente handler.
  http.get("/api/eval-col/listas-valor", async ({ request }) => {
    const categoria = new URL(request.url).searchParams.get("CATEGORIA")
    if (categoria === "GRADOS") return resultado(gradosDb)
    if (categoria === "CALENDARIO") return resultado(calendariosDb)
  }),

  http.get("/api/eval-col/parametros-edad", async () => {
    await delay(200)
    return resultado(listar())
  }),

  // Ruta estática antes que las `:id`: MSW usa el primer match.
  http.put("/api/eval-col/parametros-edad/cortes", async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as CortesBody
    const cortes = {
      bajaEdadHasta: aCorte(body.BAJA_EDAD_HASTA),
      preextraedadDesde: aCorte(body.PREEXTRAEDAD_DESDE),
      extraedadDesde: aCorte(body.EXTRAEDAD_DESDE),
    }
    if (Object.values(cortes).some((v) => v == null))
      return error(400, "Los tres cortes por defecto son obligatorios.")
    const mensaje = validarCortes(cortes as Cortes)
    if (mensaje) return error(400, mensaje)
    Object.assign(cortesDefectoDb, cortes)
    return resultado(cortes)
  }),

  http.put("/api/eval-col/parametros-edad/grados/:grado", async ({ params, request }) => {
    await delay(200)
    const pk = Number(params.grado)
    const body = (await request.json()) as { EDAD?: number; NUEVO?: boolean } & CortesBody
    if (!gradosDb.some((g) => g.pkListaValor === pk)) return error(404, `No existe el grado ${pk}`)
    if (body.NUEVO && edadesDb.has(pk)) return error(409, "El grado ya tiene una edad recomendada.")
    const edad = Number(body.EDAD)
    if (!Number.isInteger(edad) || edad < 2 || edad > 25)
      return error(400, "La edad recomendada debe estar entre 2 y 25 años")
    const cortes = {
      bajaEdadHasta: aCorte(body.BAJA_EDAD_HASTA),
      preextraedadDesde: aCorte(body.PREEXTRAEDAD_DESDE),
      extraedadDesde: aCorte(body.EXTRAEDAD_DESDE),
    }
    const mensaje = validarCortes({
      bajaEdadHasta: cortes.bajaEdadHasta ?? cortesDefectoDb.bajaEdadHasta,
      preextraedadDesde: cortes.preextraedadDesde ?? cortesDefectoDb.preextraedadDesde,
      extraedadDesde: cortes.extraedadDesde ?? cortesDefectoDb.extraedadDesde,
    })
    if (mensaje) return error(400, mensaje)
    edadesDb.set(pk, { edad, ...cortes })
    return resultado({ pkGrado: pk, edad, ...cortes })
  }),

  http.put("/api/eval-col/parametros-edad/calendarios/:calendario", async ({ params, request }) => {
    await delay(200)
    const pk = Number(params.calendario)
    const body = (await request.json()) as { MES?: number; DIA?: number; NUEVO?: boolean }
    if (!calendariosDb.some((c) => c.pkListaValor === pk))
      return error(404, `No existe el calendario ${pk}`)
    if (body.NUEVO && cortesDb.has(pk))
      return error(409, "El calendario ya tiene una fecha de corte.")
    const mes = Number(body.MES)
    const dia = Number(body.DIA)
    if (!(mes >= 1 && mes <= 12))
      return error(400, "El mes de la fecha de corte debe estar entre 1 y 12")
    if (mes === 2 && dia === 29)
      return error(400, "La fecha de corte no puede ser el 29 de febrero")
    if (!(dia >= 1 && dia <= diasDelMes(mes)))
      return error(400, `El día ${dia} no existe en el mes ${mes}`)
    cortesDb.set(pk, { mes, dia })
    return resultado({ pkCalendario: pk, mes, dia })
  }),
]
