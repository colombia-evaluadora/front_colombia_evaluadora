import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, PencilIcon } from "@/components/ui/icons"

import { usePeriodosPiarQuery } from "@/features/gestion-estudiantil/inclusion/piar/api/query/use-piar-query"
import { formatFecha } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import type { Ajuste } from "@/features/gestion-estudiantil/inclusion/piar/api/types"
import type { Dialogo } from "@/features/gestion-estudiantil/inclusion/piar/components/dialogos/tipos"
import { BotonQuitar, BotonSeccion, EnlaceArchivo, ListaDatos, Par } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"

interface Props {
  ajuste: Ajuste
  indice: number
  piarId: number
  /** Agregar, modificar y quitar: solo en Borrador (fn_piar_validar_ajuste). */
  editaAjuste: boolean
  puedeEditar: boolean
  sensible: boolean
  onDialogo: (d: Dialogo) => void
}

function Evidencias({ ajuste }: { ajuste: Ajuste }) {
  return (ajuste.evidencias ?? []).flatMap((e) =>
    e.archivos.length
      ? e.archivos.map((a) => (
          <span key={a.id}>
            <EnlaceArchivo archivo={a} /> ({formatFecha(e.fecha)})
          </span>
        ))
      : [<span key={e.id}>{e.descripcion} ({formatFecha(e.fecha)})</span>],
  )
}

/** Todos los Períodos de Evaluación, registrados o pendientes (FIC.1). */
function PeriodosSeguimiento({ ajuste, piarId }: { ajuste: Ajuste; piarId: number }) {
  const { data } = usePeriodosPiarQuery(piarId, ajuste.id)
  return (data ?? []).map((p) => (
    <span key={p.fk_tperiodo_evaluacion} className="inline-flex items-center gap-1" title={ajuste.seguimientos.find((s) => s.fk_tperiodo_evaluacion === p.fk_tperiodo_evaluacion)?.avance}>
      {p.nombre}
      {p.tiene_seguimiento ? <CheckCircleIcon className="size-4 text-green" aria-label="registrado" /> : <span className="text-xs text-muted-foreground">pendiente</span>}
    </span>
  ))
}

export function TarjetaAjuste({ ajuste, indice, piarId, editaAjuste, puedeEditar, sensible, onDialogo }: Props) {
  return (
    <article className="grid gap-3 rounded-lg border border-border p-4 text-sm">
      <header className="flex flex-wrap items-center gap-2">
        <strong>{ajuste.por_mapear ? `Ajuste ${indice}` : (ajuste.asignatura_nombre ?? "Transversal")}</strong>
        {ajuste.por_mapear ? <Badge variant="soft" color="warning">Por mapear</Badge> : <Badge variant="soft" color="info"><span>{ajuste.tipo_ajuste.nombre}</span></Badge>}
        <span className="text-muted-foreground">· {ajuste.tipo_adaptacion.nombre}</span>
        {editaAjuste && (
          <span className="ml-auto flex items-center gap-1">
            {ajuste.por_mapear && sensible && <BotonSeccion onClick={() => onDialogo({ tipo: "asignar", ajuste, indice })}>Asignar asignatura</BotonSeccion>}
            <Button size="icon-xs" variant="ghost" color="muted" aria-label="Modificar ajuste" onClick={() => onDialogo({ tipo: "ajuste", ajuste })}>
              <PencilIcon />
            </Button>
            {sensible && <BotonQuitar onClick={() => onDialogo({ tipo: "quitarAjuste", ajuste })} />}
          </span>
        )}
      </header>
      <ListaDatos>
        {ajuste.por_mapear && <Par label="Asignatura">Sin asignar{ajuste.asignatura_origen ? ` (origen: ${ajuste.asignatura_origen})` : ""}</Par>}
        {ajuste.barrera_concreta && <Par label="Barrera concreta">{ajuste.barrera_concreta}</Par>}
        <Par label="Meta de aprendizaje">{ajuste.meta}</Par>
        <Par label="Ajuste">{ajuste.ajuste}</Par>
        {ajuste.recursos && <Par label="Recursos">{ajuste.recursos}</Par>}
        {ajuste.apoyos_requeridos && <Par label="Apoyos requeridos">{ajuste.apoyos_requeridos}</Par>}
        {Boolean(ajuste.adaptaciones_planeadas?.length) && (
          <Par label="Planeado en actividades">
            {ajuste.adaptaciones_planeadas?.map((a) => `${a.actividad}${a.fecha ? ` (${formatFecha(a.fecha)})` : ""}`).join(" · ")}
          </Par>
        )}
        {sensible && (
          <Par label="Evidencia">
            <span className="flex flex-wrap items-center gap-2">
              <Evidencias ajuste={ajuste} />
              {!ajuste.evidencias?.length && !puedeEditar && <span className="text-muted-foreground">Sin evidencia directa</span>}
              {puedeEditar && !ajuste.por_mapear && <BotonSeccion onClick={() => onDialogo({ tipo: "evidencia", ajuste })}>Registrar evidencia</BotonSeccion>}
            </span>
          </Par>
        )}
        {!ajuste.por_mapear && (
          <Par label="Seguimiento">
            <span className="flex flex-wrap items-center gap-2">
              <PeriodosSeguimiento ajuste={ajuste} piarId={piarId} />
              {puedeEditar && <BotonSeccion onClick={() => onDialogo({ tipo: "seguimiento", ajuste })}>Registrar</BotonSeccion>}
            </span>
          </Par>
        )}
      </ListaDatos>
    </article>
  )
}
