import { useState } from "react"

import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"

/** El catálogo es de un establecimiento: con uno solo se usa ese; con varios se elige. */
export function useEstablecimientoCatalogo() {
  const { data = [], isPending } = useEstablishmentsOptionsQuery()
  const [elegido, setElegido] = useState("")
  const opciones = data.map((e) => ({ value: String(e.id), label: e.name }))
  const actual = elegido || opciones[0]?.value || ""
  return {
    opciones,
    valor: actual,
    id: actual ? Number(actual) : null,
    elegir: setElegido,
    cargando: isPending,
  }
}
