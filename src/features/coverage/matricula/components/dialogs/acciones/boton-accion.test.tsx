// @vitest-environment jsdom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import { EyeIcon } from "@/components/ui/icons"
import { AccionesFila, BotonAccion } from "./boton-accion"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let contenedor: HTMLDivElement

function montar(n: number) {
  contenedor = document.createElement("div")
  document.body.appendChild(contenedor)
  const root = createRoot(contenedor)
  act(() => {
    root.render(
      <AccionesFila limite={4}>
        {Array.from({ length: n }, (_, i) => (
          <BotonAccion key={i} modo="icon" label={`Accion ${i + 1}`} Icon={EyeIcon} onClick={() => {}} />
        ))}
      </AccionesFila>,
    )
  })
  return root
}

const etiquetas = () => [...contenedor.querySelectorAll("button")].map((b) => b.getAttribute("aria-label"))

afterEach(() => contenedor.remove())

describe("AccionesFila", () => {
  it("con 4 o menos acciones las muestra todas, sin menú", () => {
    const root = montar(3)
    expect(etiquetas()).toEqual(["Accion 1", "Accion 2", "Accion 3"])
    act(() => root.unmount())
  })

  it("con más de 4 muestra las primeras 4 y el resto va al menú ⁞", () => {
    const root = montar(6)
    expect(etiquetas()).toEqual(["Accion 1", "Accion 2", "Accion 3", "Accion 4", "Más acciones"])
    act(() => root.unmount())
  })
})
