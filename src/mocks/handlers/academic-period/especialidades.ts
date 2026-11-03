import { http, HttpResponse, delay } from "msw"

import { campusSpecialtiesDb, SPECIALTY_CATALOG } from "@/mocks/db/campus-details"

import type { EspecialidadEnfasisRow } from "@/features/establishment/academic-period/api/types/especialidad"

export const especialidadesHandlers = [
  // `GET /eval-col/areas/:ID/especialidades` (`fn_especialidad_enfasis_listar`): las
  // especialidades Activas del catálogo de la sede del período (Regla 86). El mock
  // no sabe la sede del período: devuelve las activas de los catálogos de sedes.
  http.get("/api/eval-col/areas/:periodoId/especialidades", async () => {
    await delay(150)
    const rows: EspecialidadEnfasisRow[] = campusSpecialtiesDb
      .filter((item) => item.status === "A")
      .map((item) => {
        const specialty = SPECIALTY_CATALOG.find((c) => c.id === item.specialtyId)
        return {
          id: item.id,
          nombre: item.ownName ?? specialty?.nombre ?? "",
          codigo: String(item.specialtyId),
          origen: "ESPECIALIDAD",
        }
      })
    return HttpResponse.json({ rows })
  }),
]
