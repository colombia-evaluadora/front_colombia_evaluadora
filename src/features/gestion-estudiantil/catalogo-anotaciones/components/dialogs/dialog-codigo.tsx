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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon, SpinnerIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { NoticeBanner } from "@/components/notice/notice-banner"

import type { Opcion } from "@/features/gestion-estudiantil/observador/api/use-opciones-observador"
import { ComboOpciones } from "@/features/gestion-estudiantil/observador/components/combo-opciones"
import type { CodigoRow } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"
import { useCodigoForm } from "@/features/gestion-estudiantil/catalogo-anotaciones/hooks/use-codigo-form"
import { LIM } from "@/features/gestion-estudiantil/catalogo-anotaciones/utils/codigo-form"

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

  return (
    <Dialog open onOpenChange={(open) => !open && !f.pending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{codigo ? `Modificar ${codigo.codigo}` : "Nuevo código"}</DialogTitle>
          <DialogDescription>Códigos del Manual de Convivencia del establecimiento.</DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={f.notice} onClose={f.cerrarNotice} variant="error" />

        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(f.errores.codigo) || undefined}>
            <FieldLabel htmlFor="codigo-codigo">Código*</FieldLabel>
            <Input
              id="codigo-codigo"
              maxLength={LIM.codigo}
              value={f.v.codigo}
              aria-invalid={Boolean(f.errores.codigo) || undefined}
              onChange={(e) => f.set({ codigo: e.target.value })}
            />
            {f.errores.codigo && <FieldError>{f.errores.codigo}</FieldError>}
          </Field>
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="codigo-estado">Estado</FieldLabel>
            <div className="border-input flex min-h-14 items-center gap-3 rounded-md border px-3 py-3">
              <span className="text-muted-foreground text-sm">Inactivo / Activo</span>
              <Switch
                id="codigo-estado"
                checked={f.v.estado === "activo"}
                onCheckedChange={(checked) => f.set({ estado: checked ? "activo" : "inactivo" })}
                className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
              />
            </div>
          </Field>
        </div>

        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(f.errores.descripcion) || undefined}>
          <FieldLabel htmlFor="codigo-descripcion">Descripción*</FieldLabel>
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

        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
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
          <ComboOpciones
            id="codigo-situacion"
            label="Tipo de situación"
            size="default"
            todos="Ninguno"
            disabled={enUso || !f.negativo}
            value={f.v.situacion}
            options={situaciones}
            onChange={(situacion) => f.set({ situacion })}
          />
        </div>
        {enUso && (
          <p className="text-xs text-muted-foreground">
            Este código ya se usó en anotaciones: su tipo y tipo de situación no se pueden cambiar.
          </p>
        )}
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>

        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="muted" />}>Cancelar</DialogClose>
          <Button size="sm" type="button" disabled={f.pending} onClick={f.guardar}>
            {f.pending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FloppyDiskIcon data-icon="inline-start" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
