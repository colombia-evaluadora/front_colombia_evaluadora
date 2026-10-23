import { useRef } from "react"
import { flushSync } from "react-dom"

interface Arrastre {
  fila: HTMLElement
  filas: HTMLElement[]
  cajas: DOMRect[]
  desde: number
  hasta: number
  y0: number
}

const TRANSICION = "transform 180ms cubic-bezier(0.2, 0, 0, 1)"

interface Opciones {
  unidad?: (asa: HTMLElement) => HTMLElement | null
  hermanas?: (unidad: HTMLElement) => HTMLElement[]
}

export function useArrastrarFilas(
  onSoltar: (desde: number, hasta: number, unidad: HTMLElement) => void,
  {
    unidad = (asa) => asa.closest("tr"),
    hermanas = (fila) => Array.from(fila.parentElement?.children ?? []) as HTMLElement[],
  }: Opciones = {},
) {
  const arrastre = useRef<Arrastre | null>(null)

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    if (e.button !== 0) return
    const fila = unidad(e.currentTarget)
    if (!fila) return
    const filas = hermanas(fila)
    const desde = filas.indexOf(fila)
    if (desde < 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    arrastre.current = {
      fila,
      filas,
      cajas: filas.map((f) => f.getBoundingClientRect()),
      desde,
      hasta: desde,
      y0: e.clientY,
    }
    fila.dataset.arrastrando = "true"
    for (const f of filas) f.style.transition = f === fila ? "none" : TRANSICION
  }

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    const a = arrastre.current
    if (!a) return
    const caja = a.cajas[a.desde]
    // No sale de la tabla.
    const min = a.cajas[0].top - caja.top
    const max = a.cajas[a.cajas.length - 1].bottom - caja.bottom
    const dy = Math.min(Math.max(e.clientY - a.y0, min), max)
    a.fila.style.transform = `translateY(${dy}px)`

    // Destino: la fila donde cae el centro de la arrastrada.
    const centro = caja.top + caja.height / 2 + dy
    const i = a.cajas.findIndex((c) => centro < c.bottom)
    a.hasta = i < 0 ? a.cajas.length - 1 : i

    a.filas.forEach((f, j) => {
      if (j === a.desde) return
      const corre =
        a.desde < j && j <= a.hasta ? -caja.height : a.hasta <= j && j < a.desde ? caja.height : 0
      f.style.transform = corre ? `translateY(${corre}px)` : ""
    })
  }

  function onPointerUp() {
    const a = arrastre.current
    if (!a) return
    arrastre.current = null
    // Reordena en el mismo frame en que se quitan los transform: sin parpadeo.
    if (a.desde !== a.hasta) flushSync(() => onSoltar(a.desde, a.hasta, a.fila))
    for (const f of a.filas) {
      f.style.transition = ""
      f.style.transform = ""
    }
    delete a.fila.dataset.arrastrando
  }

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }
}
