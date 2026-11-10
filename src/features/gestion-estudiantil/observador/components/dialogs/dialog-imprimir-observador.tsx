import { useState } from "react"

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
import { Field, FieldLabel } from "@/components/ui/field"
import { FilePdfIcon, PrinterIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { useActividadMatriculasGrupoQuery } from "@/features/planeador/api/query/use-actividad-matriculas-grupo-query"
import { useImprimirObservador } from "@/features/gestion-estudiantil/observador/api/mutations/anotaciones"
import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import type { ObservadorFiltros, TipoImpresion } from "@/features/gestion-estudiantil/observador/api/types"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"

const TODO_EL_ANIO = "todo"

interface Seleccion {
  sede: string
  jornada: string
  grupo: string
  matricula: string
  periodo: string
  tipo: TipoImpresion
}

/** Imprimir observador (2.3): PDF para firmar de UN estudiante, del período o de todo el año. */
export function DialogImprimirObservador({ filtros }: { filtros: ObservadorFiltros }) {
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [intento, setIntento] = useState(false)
  const [sel, setSel] = useState<Seleccion>(() => inicial(filtros))

  const opciones = useOpcionesCascada(sel.sede, sel.jornada)
  const grupoId = sel.grupo ? Number(sel.grupo) : undefined
  const estudiantes = useActividadMatriculasGrupoQuery(open ? grupoId : undefined)
  const estudianteOpciones = (estudiantes.data ?? []).map((m) => ({ value: String(m.id), label: m.nombre }))
  // Por defecto, el período en curso (2.3).
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
      setSel(inicial(filtros))
      setNotice(null)
      setIntento(false)
    }
    setOpen(next)
  }

  const periodo = sel.periodo || (enCurso ? String(enCurso.id) : "")

  function generar() {
    setIntento(true)
    if (!sel.matricula || !periodo) return
    imprimir.mutate({
      matriculaId: Number(sel.matricula),
      periodoId: periodo === TODO_EL_ANIO ? null : Number(periodo),
      tipo: sel.tipo,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !imprimir.isPending && abrir(next)}>
      <DialogTrigger render={<Button size="sm" variant="outline" color="muted" />}>
        <PrinterIcon data-icon="inline-start" />
        Imprimir observador
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Imprimir observador</DialogTitle>
          <DialogDescription>Documento para imprimir y firmar a mano por el estudiante y su acudiente.</DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ComboOpciones
            id="imprimir-sede"
            label="Sede"
            todos={false}
            value={sel.sede}
            options={opciones.sedeOpciones}
            onChange={(sede) => setSel({ ...sel, sede, jornada: "", grupo: "", matricula: "", periodo: "" })}
          />
          <ComboOpciones
            id="imprimir-jornada"
            label="Jornada"
            todos={false}
            disabled={!sel.sede}
            value={sel.jornada}
            options={opciones.jornadaOpciones}
            onChange={(jornada) => setSel({ ...sel, jornada, grupo: "", matricula: "", periodo: "" })}
          />
          <ComboOpciones
            id="imprimir-grupo"
            label="Grado/Grupo"
            todos={false}
            disabled={!sel.jornada}
            value={sel.grupo}
            options={opciones.grupoOpciones}
            onChange={(grupo) => setSel({ ...sel, grupo, matricula: "" })}
          />
        </div>
        <ComboOpciones
          id="imprimir-estudiante"
          label="Estudiante"
          required
          todos={false}
          disabled={!sel.grupo}
          placeholder={sel.grupo ? "Busca por nombre" : "Elegí Grado/Grupo primero"}
          value={sel.matricula}
          options={estudianteOpciones}
          error={intento && !sel.matricula ? "Elegí el estudiante." : undefined}
          onChange={(matricula) => setSel({ ...sel, matricula })}
        />
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
          <ComboOpciones
            id="imprimir-periodo"
            label="Período"
            required
            todos={false}
            disabled={!sel.jornada}
            value={periodo}
            options={[...opciones.periodoOpciones, { value: TODO_EL_ANIO, label: "Todo el año" }]}
            error={intento && !periodo ? "Elegí el período." : undefined}
            onChange={(p) => setSel({ ...sel, periodo: p })}
          />
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Tipo*</FieldLabel>
            <RadioGroup
              value={sel.tipo}
              onValueChange={(tipo) => setSel({ ...sel, tipo: tipo as TipoImpresion })}
              className="flex h-10 flex-row items-center gap-6"
            >
              <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                <RadioGroupItem value="COMPORTAMIENTOS" />
                Solo comportamientos
              </label>
              <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                <RadioGroupItem value="COMPLETO" />
                Completo
              </label>
            </RadioGroup>
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>

        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>
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

function inicial(filtros: ObservadorFiltros): Seleccion {
  return {
    sede: filtros.sede,
    jornada: filtros.jornada,
    grupo: filtros.grupo,
    matricula: "",
    periodo: filtros.periodo,
    tipo: "COMPORTAMIENTOS",
  }
}
