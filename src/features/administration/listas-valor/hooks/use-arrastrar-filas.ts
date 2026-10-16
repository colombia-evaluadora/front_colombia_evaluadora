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

/**
 * Arrastre de filas de una tabla con eventos de puntero: la fila sigue al cursor y
 * las demás se corren animadas. Se mueven con `transform` directo en el DOM (sin
 * render por cada movimiento); React solo reordena al soltar. Índices = filas del tbody.
 */
export function useArrastrarFilas(onSoltar: (desde: number, hasta: number) => void) {
  const arrastre = useRef<Arrastre | null>(null)

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    if (e.button !== 0) return
    const fila = e.currentTarget.closest("tr")
    const tbody = fila?.parentElement
    if (!fila || !tbody) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const filas = Array.from(tbody.children) as HTMLElement[]
    const desde = filas.indexOf(fila)
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
    if (a.desde !== a.hasta) flushSync(() => onSoltar(a.desde, a.hasta))
    for (const f of a.filas) {
      f.style.transition = ""
      f.style.transform = ""
    }
    delete a.fila.dataset.arrastrando
  }

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }
}
