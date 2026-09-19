import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { CheckIcon, PlusCircleIcon, XIcon } from "@/components/ui/icons"

import { useAddCriterioUnidad } from "@/features/planeador/api/mutations/add-criterio-unidad"
import {
  useUnidadValoracionesQuery,
  type UnidadValoracion,
} from "@/features/planeador/api/query/use-unidad-valoraciones-query"
import type { CriterioUnidad } from "@/features/planeador/api/types/unidad-tematica"

type CriterioDraft = Omit<CriterioUnidad, "id">

/** Un `NivelDesempenoCriterio` por valoración de la escala, en el mismo
 *  orden — arranca cada uno con `descripcion` vacía para que el docente la
 *  complete, ya con el `pk_tescala_valoracion` real que exige
 *  `POST .../criterios`. */
function draftVacio(valoraciones: UnidadValoracion[]): CriterioDraft {
  return {
    nombre: "",
    niveles: valoraciones.map((v) => ({ nombre: v.nombre, descripcion: "", valoracionId: v.id })),
  }
}

// Mismo criterio que `form-editar-actividad.tsx`: `<Textarea>` no trae
// variante `outlined` propia, así que se le aplican a mano las clases de
// `inputVariants({variant: "outlined"})` para que matchee el label flotante
// del `Field` que la envuelve.
const TEXTAREA_OUTLINED =
  "rounded-md border border-input px-3 py-2 hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-red aria-invalid:focus-visible:border-red aria-invalid:focus-visible:ring-red/20"

function isDraftCompleto(draft: CriterioDraft): boolean {
  return draft.nombre.trim().length > 0 && draft.niveles.every((nivel) => nivel.descripcion.trim().length > 0)
}

function isDraftVacio(draft: CriterioDraft): boolean {
  return draft.nombre.trim().length === 0 && draft.niveles.every((nivel) => nivel.descripcion.trim().length === 0)
}

interface DialogAgregarCriterioProps {
  unidadId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal "Agregar criterio" de la pestaña Rúbricas. Todos los campos son
 * obligatorios (un nivel de desempeño por cada Textarea + el nombre del
 * criterio) — sin niveles intermedios opcionales como en la rúbrica de
 * Actividad: acá la tabla siempre muestra todas las columnas completas.
 *
 * Los nombres/cantidad de niveles salen de `useUnidadValoracionesQuery`
 * (`GET /planeador/unidades/:id/valoraciones`, confirmado real) — las
 * valoraciones activas de la escala que aplica a ESTA unidad puntual, no
 * un número fijo de 4 (Bajo/Básico/Alto/Superior). Mismos nombres/misma
 * cantidad que usa la tabla "Criterios de la unidad"
 * (`createUnidadCriteriosColumns` en `unidad-detalle-panel.tsx`), para que
 * la tabla y el modal de alta no queden con nombres ni cantidad de niveles
 * distinta para lo mismo. El TEXTO de cada nivel lo sigue escribiendo el
 * docente, solo cambian los nombres/cantidad de campos.
 *
 * Dos formas de confirmar: "Vincular y agregar otro" persiste el
 * criterio actual y deja el modal abierto con el form limpio para
 * cargar el siguiente sin tener que reabrirlo; "Vincular y cerrar"
 * persiste y cierra. "Cancelar" descarta el draft sin guardar nada.
 */
export function DialogAgregarCriterio({ unidadId, open, onOpenChange }: DialogAgregarCriterioProps) {
  const { data: valoraciones = [] } = useUnidadValoracionesQuery(unidadId)
  const [draft, setDraft] = useState<CriterioDraft>(() => draftVacio(valoraciones))
  const addCriterio = useAddCriterioUnidad()

  // Si `valoraciones` cambia (la query terminó de cargar, o el docente
  // reabrió el modal para OTRA unidad con otra escala) mientras el modal
  // está CERRADO, el próximo draft arranca con la forma correcta. No se
  // resincroniza con el modal abierto para no pisar lo que el docente ya
  // venga escribiendo si la data async resuelve a mitad de la carga.
  useEffect(() => {
    if (!open) setDraft(draftVacio(valoraciones))
  }, [valoraciones, open])

  function updateDraft(patch: Partial<Omit<CriterioDraft, "niveles">>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function updateNivel(index: number, descripcion: string) {
    setDraft((prev) => {
      const niveles = prev.niveles.slice()
      niveles[index] = { ...niveles[index], descripcion }
      return { ...prev, niveles }
    })
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    // Al cerrar (por cualquier vía: Cancelar, X, click afuera) el draft
    // no debe sobrevivir a la próxima apertura.
    if (!next) setDraft(draftVacio(valoraciones))
  }

  function vincular(onDone: () => void) {
    addCriterio.mutate(
      { unidadId, criterio: draft },
      {
        onSuccess: (data) => {
          if (data.status === "error") return
          onDone()
        },
      },
    )
  }

  const completo = isDraftCompleto(draft)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* `showCloseButton={false}`: la X quedaba redundante con el botón
          "Cancelar" del footer, que ya cierra el modal (y limpia el draft
          vía `handleOpenChange`) — dos formas de hacer lo mismo. */}
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Agregar criterio</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field variant="outlined">
            <FieldLabel>Criterio *</FieldLabel>
            <Textarea
              className={TEXTAREA_OUTLINED}
              rows={2}
              placeholder="Agregar"
              value={draft.nombre}
              onChange={(e) => updateDraft({ nombre: e.target.value })}
            />
          </Field>

          {draft.niveles.map((nivel, index) => (
            <Field key={index} variant="outlined">
              <FieldLabel>{nivel.nombre} *</FieldLabel>
              <Textarea
                className={TEXTAREA_OUTLINED}
                rows={2}
                placeholder="Agregar"
                value={nivel.descripcion}
                onChange={(e) => updateNivel(index, e.target.value)}
              />
            </Field>
          ))}
        </div>

        <DialogFooter className="sm:justify-end">
          {/* Mientras el draft está completamente vacío, los botones de
              "Vincular…" no aportan nada —no hay qué guardar— y solo
              recargan visualmente el footer. Aparecen apenas se tipea algo
              en cualquier campo; siguen deshabilitados hasta que todos
              estén completos. */}
          {!isDraftVacio(draft) && (
            <>
              <Button
                variant="outline"
                color="primary"
                size="sm"
                type="button"
                disabled={!completo || addCriterio.isPending}
                onClick={() => vincular(() => setDraft(draftVacio(valoraciones)))}
              >
                <PlusCircleIcon data-icon="inline-start" />
                Vincular y agregar otro
              </Button>
              <Button
                variant="fill"
                color="primary"
                size="sm"
                type="button"
                disabled={!completo || addCriterio.isPending}
                onClick={() => vincular(() => handleOpenChange(false))}
              >
                <CheckIcon data-icon="inline-start" />
                Vincular y cerrar
              </Button>
            </>
          )}
          <DialogClose render={<Button size="sm" type="button" variant="fill" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
