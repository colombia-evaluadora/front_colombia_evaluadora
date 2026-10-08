// @vitest-environment jsdom
import { describe, expect, it } from "vitest"

import { htmlSeguro, htmlVacio } from "@/features/comunicaciones/chat/lib/html-seguro"

describe("htmlSeguro", () => {
  it("quita scripts y manejadores y conserva el formato", () => {
    const limpio = htmlSeguro(
      '<p style="text-align: center"><strong>Hola</strong><script>alert(1)</script><img src="x" onerror="alert(1)"></p>',
    )
    expect(limpio).toBe('<p style="text-align: center"><strong>Hola</strong><img src="x"></p>')
  })
})

describe("htmlVacio", () => {
  it("detecta el editor vacío", () => {
    expect(htmlVacio("<p></p>")).toBe(true)
    expect(htmlVacio("<p><br></p><p> </p>")).toBe(true)
    expect(htmlVacio("<p>Hola</p>")).toBe(false)
    expect(htmlVacio('<p><img src="x"></p>')).toBe(false)
  })
})
