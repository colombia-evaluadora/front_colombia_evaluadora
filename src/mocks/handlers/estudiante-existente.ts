import { delay, http, HttpResponse } from "msw"

import { matriculaDb } from "@/mocks/db/matricula"

const enmascararCorreo = (correo: string) => {
  const [usuario, dominio] = correo.split("@")
  return `${usuario[0]}***@${dominio[0]}***.${dominio.split(".").pop()}`
}

// Estudiante ya registrado (Reglas 3 y 8): busca por número en las matrículas del mock.
export const estudianteExistenteHandlers = [
  http.get("*/api/eval-col/cobertura-academica/matricula/estudiante-existente", async ({ request }) => {
    await delay(250)
    const documento = new URL(request.url).searchParams.get("DOCUMENTO")?.trim() ?? ""
    const m = matriculaDb.find((x) => x.documentNumber === documento)
    if (!m) return HttpResponse.json({ rows: [] })
    const [primerNombre, ...otrosNombres] = m.firstName.split(" ")
    const [primerApellido, ...otrosApellidos] = m.lastName.split(" ")
    const acudiente = /^(.*) \((.*)\)$/.exec(m.guardian ?? "")
    const pk = Number(m.id)
    return HttpResponse.json({
      rows: [
        {
          primer_nombre: primerNombre,
          segundo_nombre: otrosNombres.join(" ") || null,
          primer_apellido: primerApellido,
          segundo_apellido: otrosApellidos.join(" ") || null,
          fecha_nacimiento: `${2026 - m.grade - 6}-0${(pk % 9) + 1}-1${pk % 9}`,
          correo_enmascarado: enmascararCorreo(`${primerNombre.toLowerCase()}@gmail.com`),
          telefono_enmascarado: `******${String(pk).slice(-4)}`,
          ultimo_acudiente_parentesco: acudiente?.[2] ?? null,
          ultimo_acudiente_nombre: acudiente?.[1] ?? null,
          ultimo_acudiente_correo_enmascarado: acudiente ? enmascararCorreo("acudiente@gmail.com") : null,
          ultimo_acudiente_telefono_enmascarado: acudiente ? `******${String(pk + 17).slice(-4)}` : null,
          tipo_documento: m.grade >= 7 ? "TI" : "RC",
          // Uno de cada cuatro viene de un traslado (AGR.2), de un grado abajo para forzar el aviso.
          ...(pk % 4 === 0
            ? {
                traslado_institucion: "I.E. Antonio Nariño",
                traslado_grado_valor: Math.max(m.grade - 1, 0),
                traslado_grado_nombre: `Grado ${Math.max(m.grade - 1, 0)}`,
                traslado_periodo: "2026 · Anual · Ciclo 1",
              }
            : {}),
        },
      ],
    })
  }),
]
