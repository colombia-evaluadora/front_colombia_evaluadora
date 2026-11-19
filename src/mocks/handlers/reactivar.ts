import { delay, http, HttpResponse } from "msw"

import { previaReactivar, reactivar } from "@/mocks/db/reactivar"

export const reactivarHandlers = [
  http.get("*/api/eval-col/cobertura-academica/matricula/:id/reactivar/previa", async ({ params }) => {
    await delay(250)
    const previa = previaReactivar(Number(params.id))
    if (!previa) return HttpResponse.json({ message: "La matrícula no existe." }, { status: 404 })
    return HttpResponse.json({ rows: [{ previa }] })
  }),

  http.post("*/api/files/eval-col/cobertura-academica/matricula/:id/reactivar", async ({ params, request }) => {
    await delay(400)
    const form = await request.formData()
    const decision = form.get("REGISTROS_NUEVA")
    const error = reactivar(Number(params.id), String(form.get("MOTIVO") ?? ""), decision ? String(decision) : null)
    if (error) return HttpResponse.json({ message: error }, { status: 400 })
    return HttpResponse.json({ rows: [{ reactivacion: { estado: "Cursando" } }] })
  }),
]
