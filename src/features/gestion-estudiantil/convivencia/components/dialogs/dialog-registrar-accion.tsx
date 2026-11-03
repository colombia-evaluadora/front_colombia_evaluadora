import { useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { ClipboardAddIcon, PlusIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type { Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { useAuth } from "@/features/auth/hooks/use-auth"

import { useRegistrarAccion } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"
import { useCasoQuery, usePasosCasoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { COD } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { CasoResumen } from "@/features/gestion-estudiantil/convivencia/api/types"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { DialogCasoShell } from "@/features/gestion-estudiantil/convivencia/components/dialogs/dialog-caso-shell"
import { SoportesUpload } from "@/features/gestion-estudiantil/convivencia/components/soportes-upload"
import { TextoLargo } from "@/features/gestion-estudiantil/convivencia/components/texto-largo"
import { errorLargo } from "@/features/gestion-estudiantil/convivencia/api/validaciones"

interface CodigoSiuce {
  /** `m:<matrícula>` o `f:<funcionario>`: el afectado puede ser estudiante o funcionario del establecimiento. */
  afectado: string
  codigo: string
}

const ahora = () => {
  const d = new Date()
  return { fecha: formatDateValue(d), hora: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` }
}

interface Props {
  caso: CasoResumen | null
  onClose: () => void
}

/** Registrar acción del protocolo (3.2): campos condicionales por código de la acción. */
export function DialogRegistrarAccion({ caso, onClose }: Props) {
  const { notify } = useNotify()
  const { user } = useAuth()
  const acciones = useCatalogo("ACCION_PROTOCOLO_CONVIVENCIA")
  const entidades = useCatalogo("ENTIDAD_CONCERNIDA_CONVIVENCIA")
  const resultados = useCatalogo("RESULTADO_SEGUIMIENTO")
  const roles = useCatalogo("ROL_SITUACION")
  const detalle = useCasoQuery(caso?.id)
  const pasos = usePasosCasoQuery(caso?.id)

  const [accion, setAccion] = useState("")
  const [fechaHora, setFechaHora] = useState(ahora)
  const [descripcion, setDescripcion] = useState("")
  const [entidad, setEntidad] = useState("")
  const [noAplica, setNoAplica] = useState(false)
  const [resultado, setResultado] = useState("")
  const [codigos, setCodigos] = useState<CodigoSiuce[]>([])
  const [soportes, setSoportes] = useState<File[]>([])
  const [intento, setIntento] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const codigo = codigoDe(acciones, accion)
  const conEntidad = codigo != null && (COD.conEntidad as readonly string[]).includes(codigo)
  const esSeguimiento = codigo === COD.seguimiento
  const esSiuce = codigo === COD.reporteSiuce
  const condicional = pasos.data?.some((p) => p.accion === codigo && p.condicional) ?? false

  // Afectados del caso: estudiantes y funcionarios del establecimiento con rol Afectado.
  const d = detalle.data
  const afectados = [
    ...(d?.estudiantes ?? [])
      .filter((e) => codigoDe(roles, e.fk_tlv_rol) === COD.afectado)
      .map((e) => ({ value: `m:${e.fk_matricula}`, label: e.nombre })),
    ...(d?.otros_involucrados ?? [])
      .filter((i) => i.fk_funcionario && codigoDe(roles, i.fk_tlv_rol) === COD.afectado)
      .map((i) => ({ value: `f:${i.fk_funcionario}`, label: `${i.nombre ?? ""} (${i.tipo_nombre ?? "funcionario"})` })),
  ]

  function cerrar() {
    setAccion("")
    setFechaHora(ahora())
    setDescripcion("")
    setEntidad("")
    setNoAplica(false)
    setResultado("")
    setCodigos([])
    setSoportes([])
    setIntento(false)
    setNotice(null)
    onClose()
  }

  const mut = useRegistrarAccion({
    mutationConfig: {
      onSuccess: () => {
        notify("Acción registrada.", { variant: "success" })
        cerrar()
      },
      onError: (error) => setNotice({ id: Date.now(), message: getErrorMessage(error) }),
    },
  })

  const ahoraTxt = ahora()
  const errores = {
    accion: !accion ? "Elija la acción." : undefined,
    fecha:
      !fechaHora.fecha || !fechaHora.hora
        ? "La fecha y la hora son obligatorias."
        : `${fechaHora.fecha} ${fechaHora.hora}` > `${ahoraTxt.fecha} ${ahoraTxt.hora}`
          ? "La fecha y hora no pueden ser posteriores al momento actual."
          : undefined,
    descripcion: errorLargo(descripcion, 10, 2000, "La descripción"),
    entidad: conEntidad && !entidad ? "La entidad es obligatoria en esta acción." : undefined,
    resultado: esSeguimiento && !resultado ? "El resultado del seguimiento es obligatorio." : undefined,
    codigos: !esSiuce
      ? undefined
      : !codigos.length
        ? "Agregue el código de al menos un afectado."
        : codigos.some((c) => !c.afectado || !c.codigo.trim() || c.codigo.trim().length > 50)
          ? "Cada fila lleva afectado y un código de 1 a 50 caracteres."
          : new Set(codigos.map((c) => c.afectado)).size !== codigos.length
            ? "Un afectado no se repite."
            : undefined,
  }
  const ver: Partial<typeof errores> = intento ? errores : {}

  function registrar() {
    setIntento(true)
    if (!caso || Object.values(errores).some(Boolean)) return
    mut.mutate({
      casoId: caso.id,
      FK_TLV_ACCION: Number(accion),
      FECHA: fechaHora.fecha,
      HORA: fechaHora.hora,
      DESCRIPCION: descripcion.trim(),
      FK_TLV_ENTIDAD: conEntidad && entidad ? Number(entidad) : null,
      NO_APLICA: condicional && noAplica,
      FK_TLV_RESULTADO: esSeguimiento ? Number(resultado) : null,
      FK_ARCHIVOS: null,
      CODIGOS_SIUCE: esSiuce
        ? codigos.map((c) => {
            const [k, id] = c.afectado.split(":")
            return { fk_matricula: k === "m" ? Number(id) : null, fk_funcionario: k === "f" ? Number(id) : null, codigo: c.codigo.trim() }
          })
        : null,
      soportes,
    })
  }

  return (
    <DialogCasoShell
      caso={caso}
      titulo="Registrar acción"
      className="sm:max-w-2xl"
      onClose={cerrar}
      notice={notice}
      onNoticeClose={() => setNotice(null)}
      pending={mut.isPending}
      confirmar={{ label: "Registrar", icon: <ClipboardAddIcon data-icon="inline-start" />, onClick: registrar }}
    >
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        <ComboOpciones
          id="accion-accion"
          label="Acción"
          required
          size="default"
          todos={false}
          value={accion}
          options={acciones}
          error={ver.accion}
          onChange={(a) => {
            setAccion(a)
            setNoAplica(false)
          }}
        />
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(ver.fecha) || undefined}>
            <FieldLabel htmlFor="accion-fecha">Fecha*</FieldLabel>
            <DatePicker
              id="accion-fecha"
              maxDate={new Date()}
              value={parseDateValue(fechaHora.fecha)}
              onChange={(date) => setFechaHora({ ...fechaHora, fecha: date ? formatDateValue(date) : "" })}
            />
            {ver.fecha && <FieldError>{ver.fecha}</FieldError>}
          </Field>
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="accion-hora">Hora*</FieldLabel>
            <DatePicker
              id="accion-hora"
              mode="time"
              value={fechaHora.hora}
              onChange={(hora) => setFechaHora({ ...fechaHora, hora })}
            />
          </Field>
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="accion-responsable">Responsable*</FieldLabel>
            <Input id="accion-responsable" value={user?.name ?? ""} readOnly disabled />
          </Field>
        </div>
        <FieldDescription className="-mt-2">
          El responsable es quien registra la acción.
          {d && !d.fecha_hechos_conocida && " La fecha de los hechos es desconocida: no se puede contrastar con la ocurrencia."}
        </FieldDescription>

        {conEntidad && (
          <ComboOpciones
            id="accion-entidad"
            label="Entidad"
            required
            size="default"
            todos={false}
            value={entidad}
            options={entidades}
            error={ver.entidad}
            onChange={setEntidad}
          />
        )}
        {esSeguimiento && (
          <ComboOpciones
            id="accion-resultado"
            label="Resultado del seguimiento"
            required
            size="default"
            todos={false}
            value={resultado}
            options={resultados}
            error={ver.resultado}
            onChange={setResultado}
          />
        )}
        {condicional && (
          <label className="flex items-center gap-3 text-sm">
            <Switch round checked={noAplica} onCheckedChange={setNoAplica} aria-label="No aplica" />
            No aplica
            <span className="text-xs text-muted-foreground">· justifíquelo en la descripción</span>
          </label>
        )}

        <TextoLargo
          id="accion-descripcion"
          label="Descripción"
          required
          max={2000}
          value={descripcion}
          onChange={setDescripcion}
          error={ver.descripcion}
        />

        {esSiuce && (
          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(ver.codigos) || undefined}>
            <FieldLabel>Códigos del reporte en el SIUCE*</FieldLabel>
            {codigos.map((c, i) => (
              <div key={i} className="flex items-end gap-2 *:first:flex-1">
                <ComboOpciones
                  id={`accion-afectado-${i}`}
                  label="Afectado"
                  size="default"
                  todos={false}
                  value={c.afectado}
                  options={afectados}
                  onChange={(afectado) => setCodigos(codigos.map((x, j) => (j === i ? { ...x, afectado } : x)))}
                />
                <Field orientation="vertical" variant="outlined" className="gap-2">
                  <FieldLabel htmlFor={`accion-codigo-${i}`}>Código</FieldLabel>
                  <Input
                    id={`accion-codigo-${i}`}
                    maxLength={50}
                    value={c.codigo}
                    onChange={(e) => setCodigos(codigos.map((x, j) => (j === i ? { ...x, codigo: e.target.value } : x)))}
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  className="mb-2.5"
                  aria-label="Quitar código"
                  onClick={() => setCodigos(codigos.filter((_, j) => j !== i))}
                >
                  <XIcon />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-fit"
              disabled={codigos.length >= afectados.length}
              onClick={() => setCodigos([...codigos, { afectado: "", codigo: "" }])}
            >
              <PlusIcon data-icon="inline-start" />
              Agregar afectado
            </Button>
            {ver.codigos ? (
              <FieldError>{ver.codigos}</FieldError>
            ) : (
              <FieldDescription>Un código por cada afectado reportado: el SIUCE recibe un reporte por víctima.</FieldDescription>
            )}
          </Field>
        )}

        <SoportesUpload label="Soportes de la acción" archivos={soportes} onChange={setSoportes} max={5} />
      </div>
    </DialogCasoShell>
  )
}
