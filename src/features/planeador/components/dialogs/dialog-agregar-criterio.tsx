import { useState } from "react"

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
import type { CriterioUnidad } from "@/features/planeador/api/types/unidad-tematica"

type CriterioDraft = Omit<CriterioUnidad, "id">

const DRAFT_VACIO: CriterioDraft = {
  nombre: "",
  basico: "",
  bajo: "",
  alto: "",
  superior: "",
}

// Mismo criterio que `form-editar-actividad.tsx`: `<Textarea>` no trae
// variante `outlined` propia, así que se le aplican a mano las clases de
// `inputVariants({variant: "outlined"})` para que matchee el label flotante
// del `Field` que la envuelve.
const TEXTAREA_OUTLINED =
  "rounded-md border border-input px-3 py-2 hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-red aria-invalid:focus-visible:border-red aria-invalid:focus-visible:ring-red/20"

function isDraftCompleto(draft: CriterioDraft): boolean {
  return Object.values(draft).every((value) => value.trim().length > 0)
}

function isDraftVacio(draft: CriterioDraft): boolean {
  return Object.values(draft).every((value) => value.trim().length === 0)
}

interface DialogAgregarCriterioProps {
  unidadId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal "Agregar criterio" de la pestaña Rúbricas. Los 5 campos son
 * obligatorios (los cuatro niveles de desempeño + el nombre del
 * criterio) — sin niveles intermedios opcionales como en la rúbrica de
 * Actividad: acá la tabla siempre muestra las cuatro columnas completas.
 *
 * El orden de captura (Criterio, Básico, Bajo, Alto, Superior) no seguí
 * el orden de las columnas de la tabla (Bajo, Básico, Alto, Superior)
 * — así viene del mockup — así que se respeta tal cual.
 *
 * Dos formas de confirmar: "Vincular y agregar otro" persiste el
 * criterio actual y deja el modal abierto con el form limpio para
 * cargar el siguiente sin tener que reabrirlo; "Vincular y cerrar"
 * persiste y cierra. "Cancelar" descarta el draft sin guardar nada.
 */
export function DialogAgregarCriterio({ unidadId, open, onOpenChange }: DialogAgregarCriterioProps) {
  const [draft, setDraft] = useState<CriterioDraft>(DRAFT_VACIO)
  const addCriterio = useAddCriterioUnidad()

  function updateDraft(patch: Partial<CriterioDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    // Al cerrar (por cualquier vía: Cancelar, X, click afuera) el draft
    // no debe sobrevivir a la próxima apertura.
    if (!next) setDraft(DRAFT_VACIO)
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

          <Field variant="outlined">
            <FieldLabel>Básico *</FieldLabel>
            <Textarea
              className={TEXTAREA_OUTLINED}
              rows={2}
              placeholder="Agregar"
              value={draft.basico}
              onChange={(e) => updateDraft({ basico: e.target.value })}
            />
          </Field>

          <Field variant="outlined">
            <FieldLabel>Bajo *</FieldLabel>
            <Textarea
              className={TEXTAREA_OUTLINED}
              rows={2}
              placeholder="Agregar"
              value={draft.bajo}
              onChange={(e) => updateDraft({ bajo: e.target.value })}
            />
          </Field>

          <Field variant="outlined">
            <FieldLabel>Alto *</FieldLabel>
            <Textarea
              className={TEXTAREA_OUTLINED}
              rows={2}
              placeholder="Agregar"
              value={draft.alto}
              onChange={(e) => updateDraft({ alto: e.target.value })}
            />
          </Field>

          <Field variant="outlined">
            <FieldLabel>Superior *</FieldLabel>
            <Textarea
              className={TEXTAREA_OUTLINED}
              rows={2}
              placeholder="Agregar"
              value={draft.superior}
              onChange={(e) => updateDraft({ superior: e.target.value })}
            />
          </Field>
        </div>

        <DialogFooter className="sm:justify-end">
          {/* Mientras el draft está completamente vacío, los botones de
              "Vincular…" no aportan nada —no hay qué guardar— y solo
              recargan visualmente el footer. Aparecen apenas se tipea algo
              en cualquier campo; siguen deshabilitados hasta que los 5
              estén completos. */}
          {!isDraftVacio(draft) && (
            <>
              <Button
                variant="outline"
                color="primary"
                size="sm"
                type="button"
                disabled={!completo || addCriterio.isPending}
                onClick={() => vincular(() => setDraft(DRAFT_VACIO))}
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
