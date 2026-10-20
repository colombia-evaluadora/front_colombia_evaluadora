import { http, HttpResponse, delay } from "msw"

import { calendariosDb, cortesDb, edadesDb, gradosDb } from "@/mocks/db/parametros-edad"

// Misma forma y errores que el back real (`fn_parametroedad_*`): `{ rows: [{ resultado }] }`,
// 404 si el valor no es de la lista, 400 por validación y 409 por duplicado al agregar.
const resultado = (data: unknown) => HttpResponse.json({ rows: [{ resultado: data }] })
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })

const diasDelMes = (mes: number) => new Date(2023, mes, 0).getDate()
const orden = <T extends { pkListaValor: number }>(lista: T[], pk: number) =>
  lista.findIndex((v) => v.pkListaValor === pk)

function listar() {
  return {
    grados: [...edadesDb]
      .sort(([a], [b]) => orden(gradosDb, a) - orden(gradosDb, b))
      .map(([pk, edad]) => ({
        pkGrado: pk,
        grado: gradosDb.find((g) => g.pkListaValor === pk)?.nombre ?? "",
        edad,
      })),
    calendarios: [...cortesDb]
      .sort(([a], [b]) => orden(calendariosDb, a) - orden(calendariosDb, b))
      .map(([pk, c]) => ({
        pkCalendario: pk,
        calendario: calendariosDb.find((v) => v.pkListaValor === pk)?.nombre ?? "",
        ...c,
      })),
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

  http.put("/api/eval-col/parametros-edad/grados/:grado/eliminar", async ({ params }) => {
    await delay(200)
    const pk = Number(params.grado)
    const grado = gradosDb.find((g) => g.pkListaValor === pk)
    if (!grado) return error(404, `No existe el grado ${pk}`)
    if (!edadesDb.delete(pk))
      return error(404, `El grado ${grado.nombre} no tiene edad recomendada`)
    return resultado({ pkGrado: pk })
  }),

  http.put("/api/eval-col/parametros-edad/grados/:grado", async ({ params, request }) => {
    await delay(200)
    const pk = Number(params.grado)
    const body = (await request.json()) as { EDAD?: number; NUEVO?: boolean }
    if (!gradosDb.some((g) => g.pkListaValor === pk)) return error(404, `No existe el grado ${pk}`)
    if (body.NUEVO && edadesDb.has(pk)) return error(409, "El grado ya tiene una edad recomendada.")
    const edad = Number(body.EDAD)
    if (!Number.isInteger(edad) || edad < 2 || edad > 25)
      return error(400, "La edad recomendada debe estar entre 2 y 25 años")
    edadesDb.set(pk, edad)
    return resultado({ pkGrado: pk, edad })
  }),

  http.put("/api/eval-col/parametros-edad/calendarios/:calendario/eliminar", async ({ params }) => {
    await delay(200)
    const pk = Number(params.calendario)
    const calendario = calendariosDb.find((c) => c.pkListaValor === pk)
    if (!calendario) return error(404, `No existe el calendario ${pk}`)
    if (!cortesDb.delete(pk))
      return error(404, `El calendario ${calendario.nombre} no tiene fecha de corte`)
    return resultado({ pkCalendario: pk })
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
