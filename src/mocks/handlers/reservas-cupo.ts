import { delay, http, HttpResponse } from "msw"

import type { ReservasCupoContadores } from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

// Reservas de cupo (pestaña inicial de Inscripción y reservas) no tenía mock: con los datos de prueba sus
// lecturas salían al backend real por el proxy, recibían 401 y se reintentaban sin parar al entrar a la
// plataforma (Inscritos es el primer ítem del menú). Solo lecturas, vacías: la pestaña carga y muestra su
// estado vacío. Misma forma que el back: `{ rows: [{ datos }] }` (V510).
const BASE = "*/api/eval-col/cobertura-academica/reservas-cupo"

const datos = (d: unknown) => HttpResponse.json({ rows: [{ datos: d }] })

const CONTADORES_VACIOS: ReservasCupoContadores = {
  reservadas: 0,
  sinContinuidad: 0,
  porConfirmar: 0,
  trasladosPorResponder: 0,
}

export const reservasCupoHandlers = [
  http.get(`${BASE}/establecimiento/:ee/catalogos`, async () => {
    await delay(150)
    return datos({
      periodos: [],
      grados: [],
      motivosLiberacion: [],
      motivosRetiro: [],
      motivosTraslado: [],
      motivosRechazoTraslado: [],
    })
  }),

  http.post(`${BASE}/query`, async () => {
    await delay(200)
    return datos({ total: 0, filas: [], contadores: CONTADORES_VACIOS })
  }),
]
