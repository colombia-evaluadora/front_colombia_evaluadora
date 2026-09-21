import { useMemo, useState } from "react"
import { useQueries } from "@tanstack/react-query"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { inputTriggerVariants, inputVariants } from "@/components/ui/input"
import { CaretDownIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { useDocenteGruposQuery } from "@/features/planeador/api/query/use-docente-grupos-query"
import { useDocenteGradoAsignaturaQuery } from "@/features/planeador/api/query/use-docente-grado-asignatura-query"
import { actividadesRecuperablesQueryOptions } from "@/features/planeador/api/query/use-configuracion-actividad-query"
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
 * `FiltroPlanillaCascada`, reusando su `FiltroColumna`.
 *
 * Las CUATRO columnas se filtran con el mismo endpoint (`GET /planeador/
 * actividades/configuracion?RECUPERAR=S`, guía `planeador-recuperacion-
 * actividad`), no solo la última: no tiene sentido dejar elegir un Grado o
 * un Grupo que no tiene NADA recuperable debajo, para recién decírselo al
 * usuario en la última columna vacía. No existe un endpoint que devuelva
 * el árbol completo de una, así que se sondea cada combinación (grupo,
 * asignatura) del docente EN PARALELO con `useQueries` — el mismo
 * `actividadesRecuperablesQueryOptions` que ya usa la columna final, solo
 * que acá se dispara una vez por combinación para decidir qué ramas
 * mostrar. Se sondea TODO el árbol del docente de una sola vez (no por
 * nivel) porque además evita volver a pedir la combinación elegida al
 * llegar a la última columna: ya está en caché.
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

  // Cruce (grupo × asignatura) del mismo grado — el docente no necesariamente
  // dicta esa asignatura EN ese grupo puntual (el backend es quien decide de
  // verdad, acá solo se arman las combinaciones candidatas a sondear), mismo
  // supuesto que ya usaba el resto de la cascada (Grupo y Asignatura salen de
  // dos catálogos separados, sin una tercera lista docente-grupo-asignatura).
  const combos = useMemo(() => {
    const result: { gradoId: number; grupoId: number; asignaturaId: number }[] = []
    for (const grado of grados) {
      const gruposDelGrado = docenteGrupos.filter((g) => g.gradoId === grado.id)
      const asignaturasDelGrado = docenteGradoAsignatura.filter((a) => a.gradoId === grado.id)
      for (const grupo of gruposDelGrado) {
        for (const asignatura of asignaturasDelGrado) {
          result.push({ gradoId: grado.id, grupoId: grupo.grupoId, asignaturaId: asignatura.asignaturaId })
        }
      }
    }
    return result
  }, [grados, docenteGrupos, docenteGradoAsignatura])

  // Solo se sondea mientras el popover está abierto — no tiene sentido
  // disparar esto (hasta docenteGrupos.length * docenteGradoAsignatura.length
  // pedidos) en cada render de la página con el form cerrado.
  const sondas = useQueries({
    queries: combos.map((combo) => ({
      ...actividadesRecuperablesQueryOptions(combo.grupoId, combo.asignaturaId),
      enabled: open,
    })),
  })

  /** `true` si esa combinación YA se supo con algo recuperable. Mientras la
   *  sonda sigue cargando se trata como "todavía no", no como "sí" — la
   *  rama aparece apenas la sonda resuelve, no antes (evita mostrar y
   *  después ocultar). */
  function comboTieneAlgo(index: number): boolean {
    return (sondas[index]?.data?.length ?? 0) > 0
  }

  const gradosConAlgo = useMemo(() => {
    const ids = new Set<number>()
    combos.forEach((combo, i) => {
      if (comboTieneAlgo(i)) ids.add(combo.gradoId)
    })
    return ids
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `sondas` cambia de referencia en cada resolución; `combos` ya la representa indirectamente.
  }, [combos, sondas])

  const gruposConAlgo = useMemo(() => {
    const ids = new Set<number>()
    combos.forEach((combo, i) => {
      if (combo.gradoId === gradoIdDraft && comboTieneAlgo(i)) ids.add(combo.grupoId)
    })
    return ids
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combos, sondas, gradoIdDraft])

  const asignaturasConAlgo = useMemo(() => {
    const ids = new Set<number>()
    combos.forEach((combo, i) => {
      if (combo.gradoId === gradoIdDraft && combo.grupoId === grupoIdDraft && comboTieneAlgo(i)) {
        ids.add(combo.asignaturaId)
      }
    })
    return ids
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combos, sondas, gradoIdDraft, grupoIdDraft])

  const gradosVisibles = useMemo(() => grados.filter((g) => gradosConAlgo.has(g.id)), [grados, gradosConAlgo])

  const gruposVisibles = useMemo(
    () => docenteGrupos.filter((grupo) => grupo.gradoId === gradoIdDraft && gruposConAlgo.has(grupo.grupoId)),
    [docenteGrupos, gradoIdDraft, gruposConAlgo],
  )

  const asignaturasVisibles = useMemo(
    () =>
      docenteGradoAsignatura.filter(
        (par) => par.gradoId === gradoIdDraft && asignaturasConAlgo.has(par.asignaturaId),
      ),
    [docenteGradoAsignatura, gradoIdDraft, asignaturasConAlgo],
  )

  // La combinación elegida ya se sondeó como parte de `combos` — reusar ese
  // resultado en vez de volver a pedirlo es justamente el punto de sondear
  // TODO el árbol de una (ver el comentario de arriba del componente).
  const comboElegidoIndex = combos.findIndex(
    (c) => c.gradoId === gradoIdDraft && c.grupoId === grupoIdDraft && c.asignaturaId === asignaturaIdDraft,
  )
  const cargandoActividades = comboElegidoIndex >= 0 && sondas[comboElegidoIndex]?.isPending
  const actividadesRecuperables =
    comboElegidoIndex >= 0 ? (sondas[comboElegidoIndex]?.data ?? []) : []
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
          items={gradosVisibles.map((grado) => ({ key: grado.id, label: grado.nombre }))}
          selectedKey={gradoIdDraft}
          onSelect={elegirGrado}
        />

        {gradoIdDraft != null && (
          <FiltroColumna
            items={gruposVisibles.map((grupo) => ({ key: grupo.grupoId, label: grupoLabel(grupo) }))}
            selectedKey={grupoIdDraft}
            onSelect={elegirGrupo}
          />
        )}

        {gradoIdDraft != null && grupoIdDraft != null && (
          <FiltroColumna
            items={asignaturasVisibles.map((asignatura) => ({
              key: asignatura.asignaturaId,
              label: asignatura.asignaturaNombre,
            }))}
            selectedKey={asignaturaIdDraft}
            onSelect={setAsignaturaIdDraft}
          />
        )}

        {gradoIdDraft != null && grupoIdDraft != null && asignaturaIdDraft != null && (
          <div className="border-r-0">
            {cargandoActividades ? (
              <div className="flex min-w-40 items-center justify-center p-4">
                <Spinner className="size-5" />
              </div>
            ) : (
              <FiltroColumna
                items={actividades.map((actividad) => ({ key: actividad.pk, label: actividad.titulo }))}
                selectedKey={value ?? null}
                onSelect={elegirActividad}
                showCaret={false}
                className="border-r-0"
              />
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
