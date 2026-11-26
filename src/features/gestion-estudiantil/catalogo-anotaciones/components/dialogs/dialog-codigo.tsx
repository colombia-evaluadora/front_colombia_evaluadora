import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FloppyDiskIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import type { CodigoRow } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"
import { useCodigoForm } from "@/features/gestion-estudiantil/catalogo-anotaciones/hooks/use-codigo-form"
import { LIM } from "@/features/gestion-estudiantil/catalogo-anotaciones/utils/codigo-form"
import { MarcoOpciones } from "@/components/marco-opciones"

interface Props {
  establecimiento: number | null
  codigo: CodigoRow | null
  tipos: Opcion[]
  situaciones: Opcion[]
  esNegativo: (tipo: string) => boolean
  onClose: () => void
}

/** Nuevo código y Modificar (2.1). Se monta al abrir, así que siempre arranca con los datos del código. */
export function DialogCodigo({ establecimiento, codigo, tipos, situaciones, esNegativo, onClose }: Props) {
  const f = useCodigoForm({ establecimiento, codigo, esNegativo, onClose })
  const enUso = codigo?.en_uso ?? false
  const errorCodigo = f.errores.codigo ?? f.errorCodigo

  return (
    <Dialog open onOpenChange={(open) => !open && !f.pending && onClose()}>
      {/* `max-w-xl`: en `lg` la nota de obligatorios se partía en dos líneas. */}
      <DialogContent showCloseButton={false} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{codigo ? "Modificar código" : "Nuevo código"}</DialogTitle>
          <DialogDescription>Códigos del manual de convivencia del establecimiento.</DialogDescription>
        </DialogHeader>
        <ErrorNoticeBanner error={f.error} />

        {/* Orden del md (G.10.CAT.4): Código | Tipo de anotación, Tipo de situación, Descripción y Estado. */}
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errorCodigo) || undefined}>
            <FieldLabel htmlFor="codigo-codigo">
              <span>
                Código<span data-required-mark="">*</span>
              </span>
            </FieldLabel>
            <Input
              id="codigo-codigo"
              maxLength={LIM.codigo}
              value={f.v.codigo}
              aria-invalid={Boolean(errorCodigo) || undefined}
              onChange={(e) => f.set({ codigo: e.target.value })}
            />
            <div className="flex justify-between gap-2">
              {errorCodigo ? <FieldError>{errorCodigo}</FieldError> : <span />}
              <CharacterCounter value={f.v.codigo} max={LIM.codigo} />
            </div>
          </Field>
          <ComboOpciones
            id="codigo-tipo"
            label="Tipo de anotación"
            required
            size="default"
            todos={false}
            disabled={enUso}
            value={f.v.tipo}
            options={tipos}
            error={f.errores.tipo}
            onChange={f.cambiarTipo}
          />
        </div>
        <ComboOpciones
          id="codigo-situacion"
          label="Tipo de situación"
          size="default"
          todos="Ninguno"
          disabled={enUso || !f.negativo}
          value={f.v.situacion}
          options={situaciones}
          description="Solo con Tipo de anotación Negativo."
          onChange={(situacion) => f.set({ situacion })}
        />

        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(f.errores.descripcion) || undefined}>
          <FieldLabel htmlFor="codigo-descripcion">
            <span>
              Descripción<span data-required-mark="">*</span>
            </span>
          </FieldLabel>
          <Textarea
            id="codigo-descripcion"
            rows={3}
            className={TEXTAREA_OUTLINED}
            maxLength={LIM.descripcionMax}
            value={f.v.descripcion}
            aria-invalid={Boolean(f.errores.descripcion) || undefined}
            onChange={(e) => f.set({ descripcion: e.target.value })}
          />
          <div className="flex justify-between">
            {f.errores.descripcion ? <FieldError>{f.errores.descripcion}</FieldError> : <span />}
            <CharacterCounter value={f.v.descripcion} max={LIM.descripcionMax} />
          </div>
        </Field>

        {/* Estado con radios, como Nueva clasificación y Nueva sanción de esta misma vista (md G.10.CAT.4). */}
        <MarcoOpciones id="codigo-estado" label="Estado" required>
          <RadioGroup
            aria-labelledby="codigo-estado-label"
            value={f.v.estado}
            onValueChange={(estado) => f.set({ estado: estado as "activo" | "inactivo" })}
          >
            <label className="flex items-center gap-2">
              <RadioGroupItem value="activo" />
              Activo
            </label>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="inactivo" />
              Inactivo
            </label>
          </RadioGroup>
        </MarcoOpciones>
        {enUso && (
          <p className="text-xs text-muted-foreground">
            Este código ya se usó en anotaciones: su tipo y tipo de situación no se pueden cambiar.
          </p>
        )}
        <DialogFooter className="sm:items-center">
          {/* Nota de obligatorios a la izquierda, en la misma línea que los botones. */}
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <DialogClose render={<Button variant="outline" color="neutral" size="sm" type="button" />}><XIcon data-icon="inline-start" />Cancelar</DialogClose>
          <Button size="sm" type="button" disabled={f.pending} onClick={f.guardar}>
            <IconoCarga cargando={f.pending}><FloppyDiskIcon data-icon="inline-start" /></IconoCarga>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
