import { delay, http, HttpResponse } from "msw"

import {
  asignaturasDeMatricula,
  asignaturasPlan,
  guardarAsignaturas,
  type GuardarAsignaturasBody,
} from "@/mocks/db/matricula-asignaturas"

// La ruta estática asignaturas-plan va antes que las de :id.
export const matriculaAsignaturasHandlers = [
  http.post("*/api/files/eval-col/cobertura-academica/matricula/:id/hoja-firmada", async ({ request }) => {
    await delay(300)
    const form = await request.formData()
    const archivo = form.get("ARCHIVO")
    if (!(archivo instanceof File)) return HttpResponse.json({ message: "Adjunte la hoja firmada." }, { status: 400 })
    if (archivo.size > 10 * 1024 * 1024) return HttpResponse.json({ message: "La hoja supera los 10 MB." }, { status: 400 })
    return HttpResponse.json({ rows: [{ hoja: { nombre: archivo.name } }] })
  }),

  http.get("*/api/eval-col/cobertura-academica/matricula/asignaturas-plan", async () => {
    await delay(200)
    return HttpResponse.json({ rows: asignaturasPlan() })
  }),

  http.get("*/api/eval-col/cobertura-academica/matricula/:id/asignaturas", async ({ params }) => {
    await delay(200)
    return HttpResponse.json({ rows: asignaturasDeMatricula(String(params.id)) })
  }),

  http.put("*/api/eval-col/cobertura-academica/matricula/:id/asignaturas", async ({ params, request }) => {
    await delay(300)
    const error = guardarAsignaturas(String(params.id), (await request.json()) as GuardarAsignaturasBody)
    if (error) return HttpResponse.json({ message: error }, { status: 400 })
    return HttpResponse.json({ rows: [{ ok: true }] })
  }),
]
