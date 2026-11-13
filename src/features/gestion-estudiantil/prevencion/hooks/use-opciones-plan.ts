import { useCallback, useEffect, useMemo, useState } from "react"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import {
  useOpcionesEstrategiasQuery,
  useOpcionesResponsablesQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-opciones-prevencion-query"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { OpcionEstrategia } from "@/features/gestion-estudiantil/prevencion/api/types"
import type { ModoPlan } from "@/features/gestion-estudiantil/prevencion/hooks/use-plan-form"

const ESPERA_MS = 300

const diaMes = (fecha: string) => formatFecha(fecha).slice(0, 5)

/** «Nombre · Tipo · 01/04-30/11»: tipo y vigencia de la estrategia (más «ya es beneficiario»). */
function etiquetaEstrategia(e: OpcionEstrategia) {
  return `${e.nombre} · ${e.tipo_nombre} · ${diaMes(e.fecha_inicio)}-${diaMes(e.fecha_fin)}${e.ya_es_beneficiario ? " · ya es beneficiario" : ""}`
}

interface Opciones {
  modo: ModoPlan
  matricula: number
  establecimiento: number | null
}

/** Listas del formulario del plan: tipos de acción, responsables (búsqueda con espera) y estrategias. */
export function useOpcionesPlan({ modo, matricula, establecimiento }: Opciones) {
  const tipos = useCatalogo("TIPO_ACCION_PREVENTIVA")
  const tipoOpciones = useMemo(() => tipos.map((t) => ({ value: t.value, label: t.label })), [tipos])
  const tipoPorCodigo = useCallback((codigo: string) => tipos.find((t) => t.codigo === codigo)?.value ?? "", [tipos])

  const [texto, setTexto] = useState("")
  const [busqueda, setBusqueda] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), ESPERA_MS)
    return () => clearTimeout(t)
  }, [texto])
  const responsables = useOpcionesResponsablesQuery({ establecimiento, search: busqueda })
  const responsableActual = useMemo(() => {
    const r = responsables.data?.find((o) => o.es_usuario_actual)
    return r ? String(r.fk_tfuncionario) : ""
  }, [responsables.data])

  const estrategias = useOpcionesEstrategiasQuery(matricula)
  const estrategiaOpciones = useMemo(() => {
    const lista = (estrategias.data ?? []).map((e) => ({ value: String(e.fk_testrategia), label: etiquetaEstrategia(e) }))
    // Las ya guardadas siguen visibles aunque la estrategia haya dejado de estar En ejecución.
    if (modo.modo === "modificar")
      for (const a of modo.plan.acciones)
        if (a.fk_estrategia != null && !lista.some((o) => o.value === String(a.fk_estrategia)))
          lista.push({ value: String(a.fk_estrategia), label: a.estrategia_nombre ?? `Estrategia ${a.fk_estrategia}` })
    return lista
  }, [estrategias.data, modo])

  // Nombres ya elegidos: siguen en las opciones aunque la búsqueda del servidor ya no los traiga.
  const [elegidos, setElegidos] = useState<Record<string, string>>(() =>
    modo.modo === "modificar"
      ? Object.fromEntries(modo.plan.acciones.map((a) => [String(a.fk_responsable), a.responsable_nombre]))
      : {},
  )
  const responsableOpciones = useMemo(() => {
    const lista = (responsables.data ?? []).map((o) => ({ value: String(o.fk_tfuncionario), label: o.nombre }))
    for (const [value, label] of Object.entries(elegidos)) if (!lista.some((o) => o.value === value)) lista.push({ value, label })
    return lista
  }, [responsables.data, elegidos])

  const recordarResponsable = useCallback(
    (value: string) => {
      const label = responsableOpciones.find((o) => o.value === value)?.label
      if (label) setElegidos((e) => ({ ...e, [value]: label }))
    },
    [responsableOpciones],
  )

  return {
    tipos,
    tipoOpciones,
    tipoPorCodigo,
    responsableOpciones,
    responsableActual,
    onBuscarResponsable: setTexto,
    estrategiaOpciones,
    /** La lista de estrategias no respondió (p. ej. 404 sin desplegar): el campo va deshabilitado. */
    estrategiasNoDisponibles: estrategias.isError,
    recordarResponsable,
  }
}
