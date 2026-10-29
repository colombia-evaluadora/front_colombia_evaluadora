import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { CharacterCounter } from "@/components/ui/character-counter"
import { CheckIcon, PlusCircleIcon, XIcon } from "@/components/ui/icons"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { getErrorMessage } from "@/lib/api-client"
import { SinEscalaAviso } from "@/features/planeador/components/sin-escala-aviso"

import { useAddCriterioUnidad } from "@/features/planeador/api/mutations/add-criterio-unidad"
import { useUpdateCriterioUnidad } from "@/features/planeador/api/mutations/update-criterio-unidad"
import { useNotify } from "@/components/notice/notice-context"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import {
  useUnidadValoracionesQuery,
  type UnidadValoracion,
} from "@/features/planeador/api/query/use-unidad-valoraciones-query"
import {
  CRITERIO_UNIDAD_MAX,
  validarCriterioUnidad,
} from "@/features/planeador/lib/criterio-unidad-validaciones"
import type { CriterioUnidad } from "@/features/planeador/api/types/unidad-tematica"

type CriterioDraft = Omit<CriterioUnidad, "id" | "puedeGestionar" | "autor">

/** Draft de edición: los niveles que el criterio YA tiene (el PUT solo
 *  reescribe esos textos, por `valoracionId`). */
function draftDe(criterio: CriterioUnidad): CriterioDraft {
  return {
    nombre: criterio.nombre,
    niveles: criterio.niveles.map((n) => ({ nombre: n.nombre, descripcion: n.descripcion, valoracionId: n.valoracionId })),
  }
}

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
  return (
    validarCriterioUnidad(draft.nombre) == null &&
    draft.niveles.length > 0 &&
    draft.niveles.every((nivel) => nivel.descripcion.trim().length > 0)
  )
}

function isDraftVacio(draft: CriterioDraft): boolean {
  return draft.nombre.trim().length === 0 && draft.niveles.every((nivel) => nivel.descripcion.trim().length === 0)
}

interface DialogAgregarCriterioProps {
  unidadId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Modo edición (QA 71): el criterio a editar. El caller monta el diálogo
   *  con `key={criterio.id}` para que el draft arranque de este criterio. */
  criterio?: CriterioUnidad
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
export function DialogAgregarCriterio({ unidadId, open, onOpenChange, criterio }: DialogAgregarCriterioProps) {
  const editando = criterio != null
  const { data: valoraciones = [], isSuccess: valoracionesCargadas } = useUnidadValoracionesQuery(unidadId)
  // Escala sin niveles activos: solo se sabe cuando la query respondió OK con
  // cero filas (mientras carga, o si falló, no se anticipa nada).
  const sinNiveles = valoracionesCargadas && valoraciones.length === 0
  // Error del back mientras el modal está abierto. Con el `NoticeProvider` de
  // la página montado el toast global de axios está suprimido: sin este
  // banner un rechazo (p. ej. INVALID_VALUE) pasaba en silencio.
  const [notice, setNotice] = useState<Notice | null>(null)
  const [nombreTocado, setNombreTocado] = useState(false)
  const [draft, setDraft] = useState<CriterioDraft>(() => (criterio ? draftDe(criterio) : draftVacio(valoraciones)))
  const addCriterio = useAddCriterioUnidad()
  const updateCriterio = useUpdateCriterioUnidad()
  const { notify } = useNotify()
  const pendiente = addCriterio.isPending || updateCriterio.isPending
  // Sin red no se vinculan criterios (plan offline §7.5).
  const soloEnLinea = useOnlineOnly()

  // Si `valoraciones` cambia (la query terminó de cargar, o el docente
  // reabrió el modal para OTRA unidad con otra escala) mientras el modal
  // está CERRADO, el próximo draft arranca con la forma correcta. No se
  // resincroniza con el modal abierto para no pisar lo que el docente ya
  // venga escribiendo si la data async resuelve a mitad de la carga.
  useEffect(() => {
    if (!open && !editando) setDraft(draftVacio(valoraciones))
  }, [valoraciones, open, editando])

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
    if (!next) {
      setDraft(criterio ? draftDe(criterio) : draftVacio(valoraciones))
      setNotice(null)
      setNombreTocado(false)
    }
  }

  function mostrarError(message: string) {
    setNotice({ id: Date.now(), message })
  }

  function vincular(onDone: () => void) {
    setNotice(null)
    addCriterio.mutate(
      { unidadId, criterio: { ...draft, nombre: draft.nombre.trim() } },
      {
        onSuccess: (data) => {
          if (data?.status === "error") {
            mostrarError(data.message || "No se pudo vincular el criterio.")
            return
          }
          setNombreTocado(false)
          onDone()
        },
        // El modal no se cierra: el docente conserva lo escrito y ve el motivo.
        onError: (error) => mostrarError(getErrorMessage(error)),
      },
    )
  }

  function guardarEdicion() {
    if (!criterio) return
    setNotice(null)
    updateCriterio.mutate(
      { unidadId, criterioId: criterio.id, criterio: { ...draft, nombre: draft.nombre.trim() } },
      {
        onSuccess: () => {
          notify(SUCCESS_MESSAGES.criterioUnidad.updated)
          handleOpenChange(false)
        },
        // 42501 "solo su autor lo edita o elimina" u otro rechazo: el modal
        // sigue abierto con lo escrito y el motivo del backend.
        onError: (error) => mostrarError(getErrorMessage(error)),
      },
    )
  }

  const completo = isDraftCompleto(draft)
  const errorNombre = nombreTocado ? validarCriterioUnidad(draft.nombre) : undefined

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* `showCloseButton={false}`: la X quedaba redundante con el botón
          "Cancelar" del footer, que ya cierra el modal (y limpia el draft
          vía `handleOpenChange`) — dos formas de hacer lo mismo. */}
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{editando ? "Editar criterio" : "Agregar criterio"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Escala sin valoraciones activas: el back rechazaría el criterio ("… no tiene niveles activos"). */}
          {sinNiveles && !editando && <SinEscalaAviso />}
          <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
          <Field variant="outlined" data-invalid={Boolean(errorNombre) || undefined}>
            <FieldLabel htmlFor="agregar-criterio-nombre">Criterio *</FieldLabel>
            <Textarea
              id="agregar-criterio-nombre"
              className={TEXTAREA_OUTLINED}
              rows={2}
              placeholder="Agregar"
              maxLength={CRITERIO_UNIDAD_MAX}
              disabled={sinNiveles && !editando}
              aria-invalid={Boolean(errorNombre) || undefined}
              value={draft.nombre}
              onChange={(e) => {
                updateDraft({ nombre: e.target.value })
                setNombreTocado(true)
              }}
              onBlur={() => setNombreTocado(true)}
            />
            <div className="flex items-start gap-2">
              <FieldError>{errorNombre}</FieldError>
              <CharacterCounter className="ml-auto shrink-0" value={draft.nombre} max={CRITERIO_UNIDAD_MAX} />
            </div>
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
          {editando && (
            <Button
              variant="fill"
              color="primary"
              size="sm"
              type="button"
              disabled={!completo || pendiente || soloEnLinea.disabled}
              title={soloEnLinea.tooltip ?? undefined}
              onClick={guardarEdicion}
            >
              <CheckIcon data-icon="inline-start" />
              Guardar
            </Button>
          )}
          {!editando && !isDraftVacio(draft) && (
            <>
              <Button
                variant="outline"
                color="primary"
                size="sm"
                type="button"
                disabled={!completo || pendiente || soloEnLinea.disabled}
                title={soloEnLinea.tooltip ?? undefined}
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
                disabled={!completo || pendiente || soloEnLinea.disabled}
                title={soloEnLinea.tooltip ?? undefined}
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
