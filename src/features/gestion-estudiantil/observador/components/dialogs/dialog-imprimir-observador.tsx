import { useState } from "react"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FilePdfIcon, PrinterIcon, XIcon } from "@/components/ui/icons"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { useImprimirObservador } from "@/features/gestion-estudiantil/observador/api/mutations/anotaciones"
import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import { SelectorEstudianteObservador } from "@/features/gestion-estudiantil/observador/components/selector-estudiante-observador"
import type { EstudianteObservador, TipoImpresion } from "@/features/gestion-estudiantil/observador/api/types"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { MarcoOpciones } from "@/components/marco-opciones"
import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"

const TODO_EL_ANIO = "todo"

interface Seleccion {
  estudiante: EstudianteObservador | null
  periodo: string
  tipo: TipoImpresion
}

/** Imprimir observador (2.3): PDF para firmar de UN estudiante, del período o de todo el año. */
export function DialogImprimirObservador({ disabled }: { disabled?: boolean }) {
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [intento, setIntento] = useState(false)
  const [sel, setSel] = useState<Seleccion>(INICIAL)

  // Los períodos salen de la sede y la jornada de la matrícula elegida.
  const opciones = useOpcionesCascada(
    sel.estudiante ? String(sel.estudiante.fk_tsede) : "",
    sel.estudiante?.fk_tlv_jornada != null ? String(sel.estudiante.fk_tlv_jornada) : "",
  )
  // Por defecto, el período en curso del estudiante elegido (2.3).
  const enCurso = opciones.periodos.find((p) => p.enCurso)

  const imprimir = useImprimirObservador({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          setNotice({ id: Date.now(), message: result.message })
          return
        }
        notify(result.message, { variant: "success" })
        setOpen(false)
      },
    },
  })

  function abrir(next: boolean) {
    if (next) {
      setSel(INICIAL)
      setNotice(null)
      setIntento(false)
    }
    setOpen(next)
  }

  const periodo = sel.periodo || (enCurso ? String(enCurso.id) : "")
  // Lista de Valores «Tipo de observador para firmar» (2.3); viene ordenada y la primera es la predeterminada.
  const tipos = useCatalogo("TIPO_OBSERVADOR_FIRMAR")
  const tipo = sel.tipo || tipos[0]?.codigo || ""

  function generar() {
    setIntento(true)
    if (!sel.estudiante || !periodo || !tipo) return
    imprimir.mutate({
      matriculaId: sel.estudiante.fk_tmatricula,
      periodoId: periodo === TODO_EL_ANIO ? null : Number(periodo),
      tipo,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !imprimir.isPending && abrir(next)}>
      <DialogTrigger disabled={disabled} render={<Button size="sm" variant="outline" color="muted" />}>
        <PrinterIcon data-icon="inline-start" />
        Imprimir observador
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Imprimir observador</DialogTitle>
          <DialogDescription>Documento para imprimir y firmar a mano por el Responsable de grupo, el acudiente y el estudiante.</DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />

        <SelectorEstudianteObservador
          idPrefix="imprimir"
          proposito="IMPRIMIR"
          enabled={open}
          value={sel.estudiante}
          error={intento && !sel.estudiante ? "Seleccione el estudiante." : undefined}
          onChange={(estudiante) => setSel({ ...sel, estudiante, periodo: "" })}
        />
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
          <ComboOpciones
            id="imprimir-periodo"
            label="Período"
            required
            todos={false}
            disabled={!sel.estudiante}
            value={periodo}
            options={[...opciones.periodoOpciones, { value: TODO_EL_ANIO, label: "Todo el año" }]}
            error={intento && !periodo ? "Seleccione el período." : undefined}
            onChange={(p) => setSel({ ...sel, periodo: p })}
          />
          <MarcoOpciones id="imprimir-tipo" label="Tipo" required>
            <RadioGroup
              aria-labelledby="imprimir-tipo-label"
              value={tipo}
              onValueChange={(t) => setSel({ ...sel, tipo: t as TipoImpresion })}
            >
              {tipos.map((t) => (
                <label key={t.codigo} className="flex items-center gap-2 text-sm whitespace-nowrap">
                  <RadioGroupItem value={t.codigo} />
                  {t.label}
                </label>
              ))}
            </RadioGroup>
          </MarcoOpciones>
        </div>
        <DialogFooter className="sm:items-center">
          {/* Nota de obligatorios a la izquierda, en la misma línea que los botones. */}
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <DialogClose render={<Button variant="outline" color="neutral" size="sm" type="button" />}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </DialogClose>
          <Button size="sm" type="button" disabled={imprimir.isPending} onClick={generar}>
            <IconoCarga cargando={imprimir.isPending}><FilePdfIcon data-icon="inline-start" /></IconoCarga>
            Generar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const INICIAL: Seleccion = {
  estudiante: null,
  // Por defecto va el período en curso del estudiante elegido (2.3), no el del listado.
  periodo: "",
  tipo: "",
}
