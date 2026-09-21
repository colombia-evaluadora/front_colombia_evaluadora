import { useMemo, useState } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { inputTriggerVariants, inputVariants } from "@/components/ui/input"
import { CaretDownIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import { useDocenteGruposQuery } from "@/features/planeador/api/query/use-docente-grupos-query"
import { useDocenteGradoAsignaturaQuery } from "@/features/planeador/api/query/use-docente-grado-asignatura-query"
import { useActividadesRecuperablesQuery } from "@/features/planeador/api/query/use-configuracion-actividad-query"
import { useActividadDetalleQuery } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { FiltroColumna } from "@/features/planeador/components/forms/filtro-planilla-cascada"

/** `grupo_codigo` viene `null` en los datos reales — mismo criterio que
 *  `FiltroPlanillaCascada`. */
function grupoLabel(grupo: { grupoCodigo: string; grupoNombre: string }): string {
  return grupo.grupoCodigo || grupo.grupoNombre
}

interface ActividadRecuperarCascadaProps {
  /** Solo el id — el form guarda `recuperacionActividadId` a secas, sin
   *  arrastrar el nombre. El nombre para el trigger se resuelve acá mismo
   *  (`useActividadDetalleQuery`) para que reabrir una actividad de
   *  recuperación ya guardada muestre el nombre sin depender de que el
   *  usuario recorra la cascada de nuevo en esta sesión. */
  value: number | undefined
  onChange: (actividadId: number) => void
  /** La actividad que se está editando no puede recuperarse a sí misma —
   *  se filtra de la última columna en vez de dejarla elegible y fallar
   *  después al guardar. */
  excludeActividadId?: number
  disabled?: boolean
}

/**
 * Cascada Grado → Grupo → Asignatura → Actividad para elegir "¿Qué
 * actividad deseas recuperar?" — mismo patrón visual y las mismas dos
 * primeras fuentes (`docentes/grupos`/`docentes/grado-asignatura`) que
 * `FiltroPlanillaCascada`, reusando su `FiltroColumna`; la última columna
 * cambia: en vez de un catálogo fijo de periodos, lista las actividades
 * recuperables de ese (grupo, asignatura) vía `useActividadesRecuperablesQuery`
 * (`GET /planeador/actividades/configuracion?RECUPERAR=S`, guía
 * `planeador-recuperacion-actividad`) — YA filtradas por el backend
 * (sumativa, no es ella misma una recuperación, activa, sin otra
 * recuperación activa apuntándole). Antes usaba `useActividadesMiasQuery`
 * (el listado genérico del rail) con un filtro de cliente que solo cubría
 * "sumativa": dejaba elegir actividades que el guardado terminaba
 * rechazando con 422/23505.
 */
export function ActividadRecuperarCascada({
  value,
  onChange,
  excludeActividadId,
  disabled = false,
}: ActividadRecuperarCascadaProps) {
  const [open, setOpen] = useState(false)
  const [gradoIdDraft, setGradoIdDraft] = useState<number | null>(null)
  const [grupoIdDraft, setGrupoIdDraft] = useState<number | null>(null)
  const [asignaturaIdDraft, setAsignaturaIdDraft] = useState<number | null>(null)

  const { data: docenteGrupos = [] } = useDocenteGruposQuery()
  const { data: docenteGradoAsignatura = [] } = useDocenteGradoAsignaturaQuery()

  const grados = useMemo(() => {
    const porId = new Map<number, { id: number; nombre: string }>()
    for (const par of docenteGradoAsignatura) {
      if (!porId.has(par.gradoId)) porId.set(par.gradoId, { id: par.gradoId, nombre: par.gradoNombre })
    }
    return [...porId.values()]
  }, [docenteGradoAsignatura])

  const grupos = useMemo(
    () => docenteGrupos.filter((grupo) => grupo.gradoId === gradoIdDraft),
    [docenteGrupos, gradoIdDraft],
  )

  const asignaturas = useMemo(
    () => docenteGradoAsignatura.filter((par) => par.gradoId === gradoIdDraft),
    [docenteGradoAsignatura, gradoIdDraft],
  )

  const { data: actividadesRecuperables = [] } = useActividadesRecuperablesQuery(
    grupoIdDraft ?? undefined,
    asignaturaIdDraft ?? undefined,
  )
  // El backend ya excluye "no sumativa", "ya es una recuperación" y "tiene
  // otra recuperación activa apuntándole" — acá solo queda sacar la propia
  // actividad que se está editando, que el backend no conoce.
  const actividades = actividadesRecuperables.filter((a) => a.pk !== excludeActividadId)

  // Nombre a mostrar en el trigger cuando ya hay un `value` guardado (venía
  // de reabrir la actividad) pero todavía no se recorrió la cascada en esta
  // sesión — sin esto el trigger mostraba "Seleccione" con una recuperación
  // ya configurada.
  const { data: actividadGuardada } = useActividadDetalleQuery(value)
  const nombreSeleccionado = actividades.find((a) => a.pk === value)?.titulo ?? actividadGuardada?.nombre

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setGradoIdDraft(null)
      setGrupoIdDraft(null)
      setAsignaturaIdDraft(null)
    }
  }

  function elegirGrado(gradoId: number) {
    setGradoIdDraft(gradoId)
    setGrupoIdDraft(null)
    setAsignaturaIdDraft(null)
  }

  function elegirGrupo(grupoId: number) {
    setGrupoIdDraft(grupoId)
    setAsignaturaIdDraft(null)
  }

  function elegirActividad(actividadId: number) {
    onChange(actividadId)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            className={cn(
              inputVariants({ variant: "outlined" }),
              inputTriggerVariants({ variant: "outlined" }),
              "flex items-center justify-between gap-2 text-left",
              !value && "text-muted-foreground",
            )}
          />
        }
      >
        <span className="min-w-0 truncate">{nombreSeleccionado ?? "Seleccione"}</span>
        <CaretDownIcon className="text-muted-foreground size-4 shrink-0" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto flex-row gap-0 p-0">
        <FiltroColumna
          items={grados.map((grado) => ({ key: grado.id, label: grado.nombre }))}
          selectedKey={gradoIdDraft}
          onSelect={elegirGrado}
        />

        {gradoIdDraft != null && (
          <FiltroColumna
            items={grupos.map((grupo) => ({ key: grupo.grupoId, label: grupoLabel(grupo) }))}
            selectedKey={grupoIdDraft}
            onSelect={elegirGrupo}
          />
        )}

        {gradoIdDraft != null && grupoIdDraft != null && (
          <FiltroColumna
            items={asignaturas.map((asignatura) => ({
              key: asignatura.asignaturaId,
              label: asignatura.asignaturaNombre,
            }))}
            selectedKey={asignaturaIdDraft}
            onSelect={setAsignaturaIdDraft}
          />
        )}

        {gradoIdDraft != null && grupoIdDraft != null && asignaturaIdDraft != null && (
          <FiltroColumna
            items={actividades.map((actividad) => ({ key: actividad.pk, label: actividad.titulo }))}
            selectedKey={value ?? null}
            onSelect={elegirActividad}
            showCaret={false}
            className="border-r-0"
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
