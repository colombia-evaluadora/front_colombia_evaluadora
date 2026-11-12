import { delay, http, HttpResponse } from "msw"

import { buscarEstudiantes, unificar } from "@/mocks/db/unificar-estudiantes"

export const unificarEstudiantesHandlers = [
  http.get("*/api/eval-col/cobertura-academica/estudiantes/buscar", async ({ request }) => {
    await delay(250)
    const q = new URL(request.url).searchParams.get("Q") ?? ""
    return HttpResponse.json({ rows: buscarEstudiantes(q) })
  }),

  http.post("*/api/files/eval-col/cobertura-academica/estudiantes/unificar", async ({ request }) => {
    await delay(400)
    const form = await request.formData()
    if (!form.get("SOPORTE")) return HttpResponse.json({ message: "Adjunte el soporte." }, { status: 400 })
    const resultado = unificar(Number(form.get("CONSERVA")), Number(form.get("DUPLICADO")), String(form.get("MOTIVO") ?? ""))
    if ("error" in resultado) return HttpResponse.json({ message: resultado.error }, { status: 400 })
    return HttpResponse.json({ rows: [{ unificacion: resultado }] })
  }),
]
