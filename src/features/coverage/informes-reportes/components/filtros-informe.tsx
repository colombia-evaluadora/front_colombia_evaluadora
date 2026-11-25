import { useQuery } from "@tanstack/react-query"

import { coberturaInformesReportesRoute } from "@/router"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { fetchGrados } from "@/features/coverage/matricula/api/query/use-matricula-dependent-catalogs-query"
import { AGE_SITUATION_LABELS } from "@/features/coverage/matricula/components/table/columns-matricula"
import { informesKeys, usePeriodosInformeQuery } from "@/features/coverage/informes-reportes/api/informes"
import { useGruposAdmisionQuery } from "@/features/coverage/informes-reportes/api/cobertura"
import { useGradosCatalogQuery } from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"
import type { InformesSearch } from "@/features/coverage/informes-reportes/api/schema"

type Campo = "sede" | "jornada" | "periodo" | "grado" | "tipo" | "edad" | "grupoAdmision" | "direccion" | "estadoTraslado"
const CASCADA = ["sede", "jornada", "periodo", "grado"] as const

const TIPOS = [
  { value: "PRINCIPAL", label: "Principal" },
  { value: "COMPLEMENTARIA", label: "Complementaria" },
]
const DIRECCIONES = [
  { value: "ENTRANTE", label: "Entrante" },
  { value: "SALIENTE", label: "Saliente" },
]
const ESTADOS_TRASLADO = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "ACEPTADO", label: "Aceptado" },
  { value: "RECHAZADO", label: "Rechazado" },
  { value: "CANCELADO", label: "Cancelado" },
]
const EDADES = Object.entries(AGE_SITUATION_LABELS).map(([value, label]) => ({ value, label }))

const unicos = (vs: string[]) => [...new Set(vs.filter(Boolean))].map((v) => ({ value: v, label: v }))

/**
 * Parámetros de un informe de resumen en una fila de selectores (C.4.MAT.1):
 * Sede, Jornada, Período (Abiertos y Cerrados, con su estado) y Grado, más los
 * campos extra que pida el informe. Cambiar uno limpia los que dependen de él.
 */
export function FiltrosInforme({ campos, soloCerrados = false }: { campos: Campo[]; soloCerrados?: boolean }) {
  const search = coberturaInformesReportesRoute.useSearch()
  const navigate = coberturaInformesReportesRoute.useNavigate()
  const { data: periodos = [] } = usePeriodosInformeQuery()
  const { data: grados = [] } = useQuery({
    queryKey: [...informesKeys.all, "grados", search.periodo ?? "none"] as const,
    queryFn: () => fetchGrados(search.periodo ?? 0),
    enabled: Boolean(search.periodo),
  })
  // Sin selector de período (Inscripciones, Lista del sorteo) el grado sale de la lista GRADOS.
  const conPeriodo = campos.includes("periodo")
  const { data: catalogoGrados = [] } = useGradosCatalogQuery()
  const { data: grupos = [] } = useGruposAdmisionQuery()
  const opcionesGrado = conPeriodo
    ? grados.map((g) => ({ value: String(g.valor), label: g.nombre }))
    : catalogoGrados.map((g) => ({ value: String(g.valor), label: g.nombre }))

  // El libro de registro solo se genera de períodos Cerrados (C.4.LIB.1).
  const enSede = periodos.filter((p) => (!search.sede || p.sede === search.sede) && (!soloCerrados || p.estado === "CERRADO"))
  const enJornada = enSede.filter((p) => !search.jornada || p.jornada === search.jornada)

  function set(campo: Campo, valor: string) {
    const numerico = campo === "periodo" || campo === "grado" || campo === "grupoAdmision"
    const i = CASCADA.indexOf(campo as (typeof CASCADA)[number])
    const limpiar = i >= 0 ? Object.fromEntries(CASCADA.slice(i + 1).map((k) => [k, undefined])) : {}
    navigate({
      search: (prev: InformesSearch) => ({ ...prev, ...limpiar, [campo]: valor === "" ? undefined : numerico ? Number(valor) : valor, page: 0 }),
      replace: true,
    })
  }

  return (
    <>
      {campos.includes("sede") && (
        <ComboOpciones id="inf-f-sede" label="Sede" todos="Todas" size="sm" value={search.sede ?? ""} options={unicos(periodos.map((p) => p.sede))} onChange={(v) => set("sede", v)} />
      )}
      {campos.includes("jornada") && (
        <ComboOpciones id="inf-f-jornada" label="Jornada" todos="Todas" size="sm" value={search.jornada ?? ""} options={unicos(enSede.map((p) => p.jornada))} onChange={(v) => set("jornada", v)} />
      )}
      {campos.includes("periodo") && (
        <ComboOpciones
          id="inf-f-periodo"
          label="Período"
          size="sm"
          value={search.periodo ? String(search.periodo) : ""}
          options={enJornada.map((p) => ({
            value: String(p.id),
            label: `${[p.anio, p.nombre].filter(Boolean).join(" · ")} (${p.estado === "CERRADO" ? "Cerrado" : "Abierto"})`,
          }))}
          onChange={(v) => set("periodo", v)}
        />
      )}
      {campos.includes("grado") && (
        <ComboOpciones
          id="inf-f-grado"
          label="Grado"
          size="sm"
          value={search.grado != null ? String(search.grado) : ""}
          options={opcionesGrado}
          onChange={(v) => set("grado", v)}
          disabled={conPeriodo && !search.periodo}
          placeholder={conPeriodo && !search.periodo ? "Elija el período primero" : undefined}
        />
      )}
      {campos.includes("grupoAdmision") && (
        <ComboOpciones
          id="inf-f-grupo-admision"
          label="Grupo de admisión"
          size="sm"
          value={search.grupoAdmision ? String(search.grupoAdmision) : ""}
          options={grupos.map((g) => ({ value: String(g.id), label: g.nombre }))}
          onChange={(v) => set("grupoAdmision", v)}
        />
      )}
      {campos.includes("direccion") && (
        <ComboOpciones id="inf-f-direccion" label="Dirección" size="sm" value={search.direccion ?? ""} options={DIRECCIONES} onChange={(v) => set("direccion", v)} />
      )}
      {campos.includes("estadoTraslado") && (
        <ComboOpciones id="inf-f-estado-traslado" label="Estado del traslado" size="sm" value={search.estadoTraslado ?? ""} options={ESTADOS_TRASLADO} onChange={(v) => set("estadoTraslado", v)} />
      )}
      {campos.includes("tipo") && (
        <ComboOpciones id="inf-f-tipo" label="Tipo de matrícula" todos="Todas" size="sm" value={search.tipo ?? ""} options={TIPOS} onChange={(v) => set("tipo", v)} />
      )}
      {campos.includes("edad") && (
        <ComboOpciones id="inf-f-edad" label="Situación de edad" todos="Todas" size="sm" value={search.edad ?? ""} options={EDADES} onChange={(v) => set("edad", v)} />
      )}
    </>
  )
}
