import { delay, http, HttpResponse } from "msw"

import {
  corregirNota,
  homologarSnapshot,
  origenDe,
  snapshotPendienteDe,
  snapshotsDe,
} from "@/mocks/db/notas-homologadas"

// Rutas estáticas (/origen, /corregir) antes que nada con :id suelto: MSW usa el primer match.
export const notasHomologadasHandlers = [
  http.get("*/api/eval-col/cobertura-academica/matricula/:id/notas-homologadas/:nota/origen", async ({ params }) => {
    await delay(300)
    const origen = origenDe(String(params.id), Number(params.nota))
    if (!origen) return HttpResponse.json({ message: "La nota no tiene origen registrado." }, { status: 404 })
    return HttpResponse.json({ rows: [{ origen }] })
  }),

  http.post(
    "*/api/files/eval-col/cobertura-academica/matricula/:id/notas-homologadas/:nota/corregir",
    async ({ params, request }) => {
      await delay(300)
      const form = await request.formData()
      const error = corregirNota(String(params.id), Number(params.nota), Number(form.get("NOTA")))
      if (error) return HttpResponse.json({ message: error }, { status: 400 })
      return HttpResponse.json({ rows: [{ correccion: { pkTmatriculaNotaHomologada: Number(params.nota) } }] })
    },
  ),

  http.get("*/api/eval-col/cobertura-academica/matricula/:id/notas-homologadas", async ({ params }) => {
    await delay(300)
    return HttpResponse.json({ rows: [{ notas_homologadas: snapshotsDe(String(params.id)) }] })
  }),

  http.get("*/api/eval-col/cobertura-academica/matricula/:id/snapshot-pendiente", async ({ params }) => {
    await delay(200)
    return HttpResponse.json({ rows: [{ snapshot: snapshotPendienteDe(String(params.id)) }] })
  }),

  http.post("*/api/eval-col/cobertura-academica/matricula/:id/snapshot/:snapshot/homologar", async ({ params, request }) => {
    await delay(400)
    const resultado = homologarSnapshot(String(params.id), (await request.json()) as Parameters<typeof homologarSnapshot>[1])
    if ("error" in resultado) return HttpResponse.json({ message: resultado.error }, { status: 400 })
    return HttpResponse.json({ rows: [{ homologacion: { pkTmatriculaSnapshot: Number(params.snapshot), ...resultado } }] })
  }),
]
