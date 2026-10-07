import { useState } from "react"

// Últimas búsquedas del panel de conversaciones. Es una comodidad del
// navegador: si el almacenamiento falla, simplemente no se recuerdan.
const CLAVE = "chat-busquedas-recientes"
const MAXIMO = 5

function leer(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? "[]") as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, MAXIMO) : []
  } catch {
    return []
  }
}

export function agregarReciente(lista: string[], termino: string) {
  const t = termino.trim()
  if (!t) return lista
  return [t, ...lista.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAXIMO)
}

export function useBusquedasRecientes() {
  const [recientes, setRecientes] = useState(leer)

  const guardar = (lista: string[]) => {
    setRecientes(lista)
    try {
      localStorage.setItem(CLAVE, JSON.stringify(lista))
    } catch {
      // Sin almacenamiento solo duran hasta recargar.
    }
  }

  return {
    recientes,
    recordar: (termino: string) => guardar(agregarReciente(recientes, termino)),
    quitar: (termino: string) => guardar(recientes.filter((x) => x !== termino)),
  }
}
