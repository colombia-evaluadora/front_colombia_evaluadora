import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { CaretDownIcon, PlusIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"

import { useActividadMatriculasGrupoQuery } from "@/features/planeador/api/query/use-actividad-matriculas-grupo-query"
import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { useOpcionesConvivencia } from "@/features/gestion-estudiantil/convivencia/api/use-opciones-convivencia"
import { COD } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { EstudianteFila, InvolucradoFila } from "@/features/gestion-estudiantil/convivencia/api/form-types"
import { erroresInvolucrado, esTipoFuncionario, involucradoVacio } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"

/** Sección plegable con cabecera muted: caret y título a la izquierda, acción a la derecha. */
function SeccionPlegable({
  titulo,
  accion,
  children,
  forzarAbierta,
}: {
  titulo: string
  accion: ReactNode
  children: ReactNode
  /** Con un error dentro, la sección se abre para que se vea el campo marcado. */
  forzarAbierta?: boolean
}) {
  const [abierta, setAbierta] = useState(true)
  return (
    <Collapsible open={abierta || forzarAbierta} onOpenChange={setAbierta} className="group/section">
      <div className="flex items-center gap-2 bg-muted/60 px-4 py-2">
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 py-1 text-left text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          <CaretDownIcon className="size-5 shrink-0 -rotate-90 text-muted-foreground transition-transform group-data-[open]/section:rotate-0 motion-reduce:transition-none" />
          {titulo}
        </CollapsibleTrigger>
        {accion}
      </div>
      <CollapsibleContent keepMounted className="data-[closed]:hidden">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

/** Diálogo «Agregar estudiante»: cascada Sede → Jornada → Grado/Grupo → Estudiante (padrón /planeador/estudiantes). */
function DialogAgregarEstudiante({
  open,
  onOpenChange,
  yaAgregados,
  onAgregar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  yaAgregados: number[]
  onAgregar: (fila: EstudianteFila) => void
}) {
  const [sede, setSede] = useState("")
  const [jornada, setJornada] = useState("")
  const [grupo, setGrupo] = useState("")
  const [estudiante, setEstudiante] = useState("")
  const [repetido, setRepetido] = useState(false)
  const opciones = useOpcionesConvivencia(sede, jornada)
  const roster = useActividadMatriculasGrupoQuery(grupo ? Number(grupo) : undefined)
  const grupoLabel = opciones.grupoOpciones.find((g) => g.value === grupo)?.label ?? ""

  function agregar() {
    const m = roster.data?.find((r) => String(r.id) === estudiante)
    if (!m) return
    if (yaAgregados.includes(m.id)) {
      setRepetido(true)
      return
    }
    onAgregar({ fk_matricula: m.id, nombre: m.nombre, grado: grupoLabel, rol: "" })
    setEstudiante("")
    setRepetido(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar estudiante</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <ComboOpciones
            id="est-sede"
            label="Sede"
            size="default"
            todos={false}
            value={sede}
            options={opciones.sedeOpciones}
            onChange={(s) => {
              setSede(s)
              setJornada("")
              setGrupo("")
              setEstudiante("")
            }}
          />
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
            <ComboOpciones
              id="est-jornada"
              label="Jornada"
              size="default"
              todos={false}
              disabled={!sede}
              value={jornada}
              options={opciones.jornadaOpciones}
              onChange={(j) => {
                setJornada(j)
                setGrupo("")
                setEstudiante("")
              }}
            />
            <ComboOpciones
              id="est-grupo"
              label="Grado/Grupo"
              size="default"
              todos={false}
              disabled={!jornada}
              value={grupo}
              options={opciones.grupoOpciones}
              onChange={(g) => {
                setGrupo(g)
                setEstudiante("")
              }}
            />
          </div>
          <ComboOpciones
            id="est-estudiante"
            label="Estudiante"
            required
            size="default"
            todos={false}
            disabled={!grupo}
            placeholder={grupo ? (roster.isFetching ? "Cargando…" : "Buscar estudiante") : "Elegí Grado/Grupo primero"}
            value={estudiante}
            options={(roster.data ?? []).map((m) => ({ value: String(m.id), label: m.nombre }))}
            error={repetido ? "Este estudiante ya está en el caso." : undefined}
            onChange={(e) => {
              setEstudiante(e)
              setRepetido(false)
            }}
          />
        </div>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="muted" />}>Cancelar</DialogClose>
          <Button size="sm" type="button" disabled={!estudiante} onClick={agregar}>
            <PlusIcon data-icon="inline-start" />
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ConstructoresProps {
  estudiantes: EstudianteFila[]
  onEstudiantes: (v: EstudianteFila[]) => void
  involucrados: InvolucradoFila[]
  onInvolucrados: (v: InvolucradoFila[]) => void
  errorEstudiantes?: string
  errorInvolucrados?: string
  mostrarErrores: boolean
}

/** «Estudiantes involucrados (N)» y «Otros involucrados (N)» en un mismo recuadro (G.2.CAS.NUE.1). */
export function ConstructoresInvolucrados({
  estudiantes,
  onEstudiantes,
  involucrados,
  onInvolucrados,
  errorEstudiantes,
  errorInvolucrados,
  mostrarErrores,
}: ConstructoresProps) {
  const roles = useCatalogo("ROL_SITUACION")
  const tipos = useCatalogo("TIPO_INVOLUCRADO")
  const tiposDoc = useCatalogo("TIPO_DOCUMENTO")
  const [agregando, setAgregando] = useState(false)
  const setInv = (i: number, patch: Partial<InvolucradoFila>) =>
    onInvolucrados(involucrados.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  return (
    <div className="flex flex-col gap-2">
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
        <SeccionPlegable
          titulo={`Estudiantes involucrados (${estudiantes.length})*`}
          forzarAbierta={mostrarErrores && (Boolean(errorEstudiantes) || estudiantes.some((e) => !e.rol))}
          accion={
            <Button type="button" size="sm" variant="outline" onClick={() => setAgregando(true)}>
              <PlusIcon data-icon="inline-start" />
              Agregar estudiante
            </Button>
          }
        >
          {estudiantes.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Aún no hay estudiantes en el caso.</p>
          ) : (
            <ul className="divide-y divide-border">
              {estudiantes.map((e, i) => (
                <li key={e.fk_matricula} className="flex flex-wrap items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">{e.nombre}</span>
                    {e.grado && <span className="text-muted-foreground"> · {e.grado}</span>}
                  </span>
                  <ComboOpciones
                    inline
                    className="w-72 flex-none gap-2"
                    id={`est-rol-${e.fk_matricula}`}
                    label="Rol"
                    required
                    size="sm"
                    todos={false}
                    value={e.rol}
                    options={roles}
                    error={mostrarErrores && !e.rol ? "Elija el rol." : undefined}
                    onChange={(rol) => onEstudiantes(estudiantes.map((x, j) => (j === i ? { ...x, rol } : x)))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    aria-label={`Quitar a ${e.nombre}`}
                    onClick={() => onEstudiantes(estudiantes.filter((_, j) => j !== i))}
                  >
                    <XIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </SeccionPlegable>

        <SeccionPlegable
          titulo={`Otros involucrados (${involucrados.length})`}
          forzarAbierta={mostrarErrores && Boolean(errorInvolucrados)}
          accion={
            <Button type="button" size="sm" variant="outline" onClick={() => onInvolucrados([...involucrados, involucradoVacio()])}>
              <PlusIcon data-icon="inline-start" />
              Agregar otro involucrado
            </Button>
          }
        >
          <div className="flex flex-col gap-3 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Adultos o personas externas que participaron en la situación. Información sensible.
            </p>
            {involucrados.map((v, i) => {
              const tipoCodigo = codigoDe(tipos, v.tipo)
              const err = mostrarErrores
                ? erroresInvolucrado(v, tipoCodigo, codigoDe(roles, v.rol), involucrados)
                : undefined
              // Afectado solo para funcionarios del establecimiento (3.1); a los demás tipos no se les ofrece.
              const esFuncionario = esTipoFuncionario(tipoCodigo)
              const rolesFila = esFuncionario ? roles : roles.filter((r) => r.codigo !== COD.afectado)
              const soloLectura = v.id != null
              return (
                <div key={v.key} className="flex items-start gap-2 rounded-lg border border-border p-3">
                  <div className="grid min-w-0 flex-1 grid-cols-1 items-start gap-3 sm:grid-cols-5">
                    {esFuncionario && (
                      // 3.1: el funcionario se elige de los registrados en el establecimiento y de su ficha salen
                      // nombre y documento. Aún no hay un endpoint de funcionarios con el alcance de Convivencia.
                      <ComboOpciones
                        id={`inv-funcionario-${v.key}`}
                        label="Funcionario"
                        required
                        size="default"
                        todos={false}
                        className="gap-2 sm:col-span-5"
                        disabled={soloLectura}
                        placeholder="No hay funcionarios para elegir"
                        value={v.fk_funcionario != null ? String(v.fk_funcionario) : ""}
                        options={v.fk_funcionario != null ? [{ value: String(v.fk_funcionario), label: v.nombre }] : []}
                        error={err?.funcionario}
                        onChange={(f) => setInv(i, { fk_funcionario: f ? Number(f) : null })}
                      />
                    )}
                    <ComboOpciones
                      id={`inv-tipo-${v.key}`}
                      label="Tipo de involucrado"
                      required
                      size="default"
                      todos={false}
                      disabled={soloLectura}
                      value={v.tipo}
                      options={tipos}
                      error={err?.tipo}
                      onChange={(tipo) => setInv(i, { tipo, rol: "", fk_funcionario: null })}
                    />
                    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err?.nombre) || undefined}>
                      <FieldLabel htmlFor={`inv-nombre-${v.key}`}>Nombre*</FieldLabel>
                      <Input
                        id={`inv-nombre-${v.key}`}
                        maxLength={150}
                        disabled={soloLectura}
                        readOnly={esFuncionario}
                        value={v.nombre}
                        aria-invalid={Boolean(err?.nombre) || undefined}
                        onChange={(e) => setInv(i, { nombre: e.target.value })}
                      />
                      {err?.nombre && <FieldError>{err.nombre}</FieldError>}
                    </Field>
                    <ComboOpciones
                      id={`inv-tdoc-${v.key}`}
                      label="Tipo de documento"
                      size="default"
                      todos="Ninguno"
                      disabled={soloLectura || esFuncionario}
                      value={v.tipoDoc}
                      options={tiposDoc}
                      onChange={(tipoDoc) => setInv(i, { tipoDoc })}
                    />
                    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err?.numDoc) || undefined}>
                      <FieldLabel htmlFor={`inv-ndoc-${v.key}`}>Número de documento{v.tipoDoc && "*"}</FieldLabel>
                      <Input
                        id={`inv-ndoc-${v.key}`}
                        maxLength={20}
                        disabled={soloLectura || !v.tipoDoc}
                        readOnly={esFuncionario}
                        value={v.numDoc}
                        aria-invalid={Boolean(err?.numDoc) || undefined}
                        onChange={(e) => setInv(i, { numDoc: e.target.value })}
                      />
                      {err?.numDoc && <FieldError>{err.numDoc}</FieldError>}
                    </Field>
                    <ComboOpciones
                      id={`inv-rol-${v.key}`}
                      label="Rol en la situación"
                      required
                      size="default"
                      todos={false}
                      disabled={soloLectura}
                      value={v.rol}
                      options={rolesFila}
                      error={err?.rol}
                      onChange={(rol) => setInv(i, { rol })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    className="mt-4.5"
                    aria-label="Quitar involucrado"
                    onClick={() => onInvolucrados(involucrados.filter((_, j) => j !== i))}
                  >
                    <XIcon />
                  </Button>
                </div>
              )
            })}
          </div>
        </SeccionPlegable>
      </div>
      {errorEstudiantes && <FieldError>{errorEstudiantes}</FieldError>}
      {errorInvolucrados && <FieldError>{errorInvolucrados}</FieldError>}
      <DialogAgregarEstudiante
        open={agregando}
        onOpenChange={setAgregando}
        yaAgregados={estudiantes.map((e) => e.fk_matricula)}
        onAgregar={(fila) => onEstudiantes([...estudiantes, fila])}
      />
    </div>
  )
}
