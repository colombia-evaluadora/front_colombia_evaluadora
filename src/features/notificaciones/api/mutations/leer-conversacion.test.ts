import { describe, expect, it } from "vitest"

import { canalDeDeepLink } from "@/features/notificaciones/api/mutations/leer-conversacion"

describe("canalDeDeepLink", () => {
  it("lee el canal del deep link del chat", () => {
    expect(canalDeDeepLink("/app/comunicaciones/chat?canal=53&mensaje=9")).toBe(53)
    expect(canalDeDeepLink("/app/comunicaciones/chat?mensaje=9&canal=7")).toBe(7)
  })

  it("devuelve null sin canal", () => {
    expect(canalDeDeepLink("/app/planeador")).toBeNull()
    expect(canalDeDeepLink(null)).toBeNull()
    expect(canalDeDeepLink("/app/comunicaciones/chat?invitacion=4")).toBeNull()
  })
})
