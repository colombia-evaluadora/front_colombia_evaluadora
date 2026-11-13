import { delay, http, HttpResponse } from "msw"

import { matriculaDb } from "@/mocks/db/matricula"

import {
  cambiarGradoLote,
  cambiarGrupoLote,
  complementariaDe,
  emparejamiento,
  gruposDe,
  previaCambioGrado,
  previaReingreso,
  reactivarLote,
  reingresarLote,
  retirarLote,
} from "@/mocks/db/acciones-lote"

const BASE = "*/api/eval-col/cobertura-academica/matricula/lote"
const FILES = "*/api/files/eval-col/cobertura-academica/matricula/lote"

const idsDe = async (request: Request) => ((await request.json()) as { IDS: number[] }).IDS ?? []
const idsForm = (form: FormData) => JSON.parse(String(form.get("IDS") ?? "[]")) as number[]

export const accionesLoteHandlers = [
  http.post(`${BASE}/retirar/previa`, async ({ request }) => {
    await delay(200)
    const pks = await idsDe(request)
    return HttpResponse.json({ rows: pks.map((pk) => ({ pk_matricula: pk, complementaria: complementariaDe(pk) })) })
  }),
  http.post(`${BASE}/complementarias`, async ({ request }) => {
    await delay(150)
    const pks = await idsDe(request)
    return HttpResponse.json({ rows: pks.map((pk) => ({ pk_matricula: pk, complementaria: complementariaDe(pk) })) })
  }),
  http.post(`${BASE}/retirar`, async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as { IDS: number[]; FECHA_RETIRO: string; FK_TLV_MOTIVO_RETIRO: number }
    if (!body.FECHA_RETIRO || !body.FK_TLV_MOTIVO_RETIRO)
      return HttpResponse.json({ message: "Indique la fecha y el motivo de retiro." }, { status: 400 })
    return HttpResponse.json({ rows: retirarLote(body.IDS) })
  }),

  http.post(`${BASE}/reingresar/previa`, async ({ request }) => {
    await delay(250)
    const pks = await idsDe(request)
    return HttpResponse.json({ rows: pks.map(previaReingreso).filter(Boolean) })
  }),
  http.post(`${BASE}/reingresar`, async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as { MATRICULAS: { ID: number; FK_TGRUPO: number | null }[] }
    return HttpResponse.json({ rows: reingresarLote(body.MATRICULAS ?? []) })
  }),

  http.get(`${BASE}/grupos-destino`, async ({ request }) => {
    await delay(150)
    const grado = Number(new URL(request.url).searchParams.get("GRADO"))
    return HttpResponse.json({ rows: gruposDe(grado) })
  }),
  http.post(`${BASE}/emparejamiento`, async ({ request }) => {
    await delay(250)
    const body = (await request.json()) as { IDS: number[]; FK_TGRUPO: number | null }
    return HttpResponse.json({ rows: [{ emparejamiento: emparejamiento(body.IDS, body.FK_TGRUPO) }] })
  }),
  http.post(`${BASE}/cambiar-grupo`, async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as { IDS: number[]; FK_TGRUPO: number }
    return HttpResponse.json({ rows: cambiarGrupoLote(body.IDS, body.FK_TGRUPO) })
  }),

  http.post(`${BASE}/cambiar-grado/previa`, async ({ request }) => {
    await delay(250)
    return HttpResponse.json({ rows: [{ previa: previaCambioGrado(await idsDe(request)) }] })
  }),
  http.post(`${FILES}/cambiar-grado`, async ({ request }) => {
    await delay(450)
    const form = await request.formData()
    const acta = form.get("ACTA")
    if (acta instanceof File && acta.size > 10 * 1024 * 1024)
      return HttpResponse.json({ message: "El acta supera los 10 MB." }, { status: 400 })
    const rows = cambiarGradoLote(
      idsForm(form),
      String(form.get("TIPO")),
      Number(form.get("FK_TGRUPO")),
      String(form.get("MOTIVO") ?? ""),
      acta instanceof File,
    )
    return HttpResponse.json({ rows })
  }),

  http.post(`${FILES}/reactivar`, async ({ request }) => {
    await delay(450)
    const form = await request.formData()
    return HttpResponse.json({
      rows: reactivarLote(idsForm(form), String(form.get("MOTIVO") ?? "")),
    })
  }),

  http.post(`${BASE}/hojas`, async ({ request }) => {
    await delay(500)
    return pdf(`Hojas de matrícula: ${(await idsDe(request)).join(", ")}`)
  }),
  http.get(`${BASE}/constancias/configuracion`, async () => {
    await delay(100)
    return HttpResponse.json({ rows: [{ numeracion: true }] })
  }),
  http.post(`${BASE}/constancias`, async ({ request }) => {
    await delay(600)
    const body = (await request.json()) as { IDS: number[]; DIRIGIDA_A: string; BORRADOR: string }
    const dirigida = (body.DIRIGIDA_A ?? "").trim()
    if (dirigida.length < 3 || dirigida.length > 150)
      return HttpResponse.json({ message: "«Dirigida a» debe tener entre 3 y 150 caracteres." }, { status: 400 })
    const noCursando = body.IDS.filter((pk) => matriculaDb.find((m) => Number(m.id) === pk)?.status !== "Cursando")
    if (noCursando.length)
      return HttpResponse.json({ message: "La constancia de estudio solo se genera para matrículas Cursando." }, { status: 400 })
    return pdf(`Constancias de estudio (${body.BORRADOR === "S" ? "borrador" : "numeradas"}) dirigidas a ${dirigida}: ${body.IDS.join(", ")}`)
  }),
  http.get("*/api/eval-col/cobertura-academica/matricula/:id/paquete-soporte/previa", async ({ params }) => {
    await delay(200)
    const pk = Number(params.id)
    return HttpResponse.json({
      rows: [
        {
          documento_identidad: pk % 4 !== 0,
          boletin: pk % 5 === 0 ? null : "Boletín del período P1",
          hoja_firmada: pk % 3 !== 0,
        },
      ],
    })
  }),
  http.post("*/api/eval-col/cobertura-academica/matricula/:id/paquete-soporte", async ({ params }) => {
    await delay(600)
    return pdf(`Paquete de soporte de la matrícula ${String(params.id)}`)
  }),
]

function pdf(texto: string) {
  return new HttpResponse(new Blob([`%PDF-1.4\n% ${texto} (mock)\n%%EOF`], { type: "application/pdf" }), {
    headers: { "Content-Type": "application/pdf" },
  })
}
