import { describe, expect, it } from "vitest"

import type { Conversacion } from "@/features/comunicaciones/chat/api/types"
import { conversacionesCampana, noLeidosCampana } from "@/features/notificaciones/lib/mensajes-campana"

const c = (id: number, extra: Partial<Conversacion> = {}): Conversacion => ({
  id,
  nombre: `C${id}`,
  tipo: "DIRECTO",
  categoria: "GENERAL",
  noLeidos: 0,
  actividadAbierta: false,
  esBot: false,
  totalMiembros: 2,
  miembrosDestacados: [],
  silenciadoHasta: null,
  archivada: false,
  ultimoMensaje: null,
  ...extra,
})
const en = (iso: string) => ({ texto: "x", autor: "A", esPropio: false, enviadoEn: iso, tipo: "NORMAL" as const })

describe("pestaña Mensajes de la campana", () => {
  it("no leídas primero, luego la más reciente; sin archivadas", () => {
    const lista = [
      c(1, { ultimoMensaje: en("2026-10-20T10:00:00Z") }),
      c(2, { ultimoMensaje: en("2026-10-22T10:00:00Z") }),
      c(3, { noLeidos: 2, ultimoMensaje: en("2026-10-01T10:00:00Z") }),
      c(5, { archivada: true, noLeidos: 1 }),
      c(6),
    ]
    expect(conversacionesCampana(lista).map((x) => x.id)).toEqual([3, 2, 1, 6])
    expect(conversacionesCampana(lista, 2).map((x) => x.id)).toEqual([3, 2])
  })

  it("cuenta no leídos sin archivadas ni silenciadas", () => {
    expect(
      noLeidosCampana([
        c(1, { noLeidos: 2 }),
        c(2, { noLeidos: 3, silenciadoHasta: "2099-01-01T00:00:00Z" }),
        c(3, { noLeidos: 1, tipo: "GRUPO" }),
      ]),
    ).toBe(3)
    expect(noLeidosCampana(undefined)).toBe(0)
  })
})
