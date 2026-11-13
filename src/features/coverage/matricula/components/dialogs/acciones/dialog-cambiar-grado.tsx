import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { CharacterCounter } from "@/components/ui/character-counter"
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "@/components/ui/file-upload"
import { CheckIcon, SpinnerIcon, UploadSimpleIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import {
  useCambiarGradoLote,
  useComplementariasQuery,
  useEmparejamientoQuery,
  useGruposDestinoQuery,
  usePreviaCambioGradoQuery,
  type EmparejamientoElegido,
  type TipoCambioGrado,
} from "@/features/coverage/matricula/api/acciones-lote"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"
import { useMatriculaGradeLabel } from "@/features/coverage/matricula/hooks/use-matricula-grade-label"
import {
  Aviso,
  CampoSelect,
  EmparejamientoNotas,
  EstadoBadge,
  MatriculasAfectadas,
  Resumen,
  elegidoInicial,
  mensajeLote,
  nombreDe,
  plural,
  textoEmparejamiento,
  tituloAccion,
} from "@/features/coverage/matricula/components/dialogs/acciones/compartido"

const MOTIVO_MIN = 10
const MOTIVO_MAX = 500
const SOPORTE_EXTENSIONES = ["pdf", "jpg", "jpeg", "png"]
const SOPORTE_MAX_MB = 10

const TIPOS: { value: TipoCambioGrado; label: string }[] = [
  { value: "PROMOCION", label: "Promoción anticipada" },
  { value: "REUBICACION", label: "Reubicación" },
  { value: "CORRECCION", label: "Corrección" },
]

type Registros = "HOMOLOGAR" | "DESCARTAR"

/**
 * Cambiar de grado (C.1.LOT.5): promoción anticipada (solo al grado siguiente),
 * reubicación o corrección. Las dos primeras crean una matrícula nueva Cursando
 * y dejan la actual Promovido o Reubicado con sus notas; la corrección cambia el
 * grado de la misma matrícula y decide qué pasa con los registros existentes.
 */
export function DialogCambiarGrado({
  matriculas,
  onOpenChange,
  onDone,
}: {
  matriculas: Matricula[]
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}) {
  const { notify } = useNotify()
  const gradeLabel = useMatriculaGradeLabel()
  const ids = matriculas.map((m) => m.id)
  const origen = matriculas[0]
  const mismoGrado = matriculas.every((m) => m.grade === origen.grade)
  const { data: previa, isPending } = usePreviaCambioGradoQuery(ids)
  const cambiar = useCambiarGradoLote()

  // En lote solo va la corrección; la promoción anticipada y la reubicación son individuales (Regla 56).
  const lote = matriculas.length > 1
  const [tipo, setTipo] = useState<TipoCambioGrado>(lote ? "CORRECCION" : "PROMOCION")
  const [periodoElegido, setPeriodo] = useState<string | null>(null)
  const [gradoElegido, setGrado] = useState<string | null>(null)
  const [grupo, setGrupo] = useState("")
  const [motivo, setMotivo] = useState("")
  const [acta, setActa] = useState<File | null>(null)
  const [registros, setRegistros] = useState<Registros>("DESCARTAR")
  const [elegido, setElegido] = useState<EmparejamientoElegido | null>(null)
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)

  const promocion = tipo === "PROMOCION"
  const correccion = tipo === "CORRECCION"
  const periodoId = periodoElegido ?? (previa?.periodos[0] ? String(previa.periodos[0].id) : "")
  const periodo = previa?.periodos.find((p) => String(p.id) === periodoId)
  const gradoSiguiente = previa?.gradoSiguiente != null ? String(previa.gradoSiguiente) : ""
  const grado = promocion ? gradoSiguiente : (gradoElegido ?? "")
  const { data: grupos = [] } = useGruposDestinoQuery({
    sedeId: periodo?.sedeId ?? "",
    jornada: periodo?.jornada ?? "",
    grado: grado ? Number(grado) : null,
    periodoId: periodo?.id,
  })
  const grupoId = grupo ? Number(grupo) : null
  const grupoDestino = grupos.find((g) => g.id === grupoId)
  // Cupo para todas las marcadas.
  const gruposConCupo = grupos.filter((g) => g.capacidad - g.ocupados >= matriculas.length)
  // En la corrección solo se empareja si se homologan los registros existentes.
  const empareja = !correccion || (Boolean(previa?.registros) && registros === "HOMOLOGAR")
  const { data: emparejamiento } = useEmparejamientoQuery(ids, empareja ? grupoId : null, periodo?.id ?? null)
  const { data: complementarias } = useComplementariasQuery(lote ? ids : [])
  const conComplementaria = lote ? matriculas.filter((m) => complementarias?.get(m.id)) : []
  const [propuestaDe, setPropuestaDe] = useState<object | null>(null)
  if (emparejamiento && propuestaDe !== emparejamiento) {
    setPropuestaDe(emparejamiento)
    setElegido(elegidoInicial(emparejamiento))
  }

  const uno = matriculas.length === 1
  const motivoValido = motivo.trim().length >= MOTIVO_MIN && motivo.trim().length <= MOTIVO_MAX
  const actaRequerida = !correccion
  const gradoNombre = grado ? gradeLabel(Number(grado)) : ""
  const pideRegistros = correccion && Boolean(previa?.registros)
  const complementariaSeRetira = !correccion && previa?.complementaria && !previa.complementaria.disponibleEnGradoSiguiente

  function cambiarTipo(t: TipoCambioGrado) {
    setTipo(t)
    setGrado(null)
    setGrupo("")
  }

  function elegirActa(file: File | undefined) {
    if (!file) return
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!SOPORTE_EXTENSIONES.includes(ext)) {
      setError({ id: Date.now(), message: "El acta debe ser un archivo PDF, JPG o PNG." })
      return
    }
    if (file.size > SOPORTE_MAX_MB * 1024 * 1024) {
      setError({ id: Date.now(), message: `El acta supera los ${SOPORTE_MAX_MB} MB.` })
      return
    }
    setActa(file)
  }

  function confirmar() {
    setIntentado(true)
    if (!mismoGrado || !periodo || !grado || !grupoId || !motivoValido || (actaRequerida && !acta)) return
    if (empareja && !emparejamiento) return
    cambiar.mutate(
      {
        matriculaIds: ids,
        tipo,
        periodoId: periodo.id,
        grupoId,
        motivo: motivo.trim(),
        acta,
        emparejamiento: empareja ? elegido : null,
        registros: pideRegistros ? registros : null,
      },
      {
        onSuccess: (resultados) => {
          const destino = `${gradoNombre} · ${grupoDestino?.codigo ?? ""}`
          const { variant, texto } = mensajeLote(resultados, (n) =>
            uno && n === 1
              ? `${nombreDe(origen)} quedó en ${destino}.`
              : `${plural(n, "estudiante quedó", "estudiantes quedaron")} en ${destino}.`,
          )
          notify(texto, { variant })
          onDone?.()
          onOpenChange(false)
        },
        onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
      },
    )
  }

  const destinoTexto = `${gradoNombre} · ${grupoDestino?.codigo ?? "—"}`
  const r = previa?.registros

  return (
    <Dialog open onOpenChange={(o) => !cambiar.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {lote ? `Corregir grado — ${matriculas.length} estudiantes de ${gradeLabel(origen.grade)}` : tituloAccion("Cambiar de grado", matriculas)}
            {uno ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                ({[gradeLabel(origen.grade), origen.group, origen.campus, origen.shift].filter(Boolean).join(" · ")})
              </span>
            ) : null}
          </DialogTitle>
          {uno ? null : <MatriculasAfectadas matriculas={matriculas} />}
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        {!mismoGrado ? (
          <Aviso tono="advertencia" titulo="Los estudiantes elegidos son de grados distintos.">
            El cambio de grado se aplica desde un mismo grado: quite de la selección los de otro grado o cámbielos por
            separado.
          </Aviso>
        ) : isPending ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <SpinnerIcon className="animate-spin" /> Revisando la matrícula…
          </div>
        ) : (
          <>
            {lote ? (
              <Aviso tono="info">
                En lote solo se corrige el grado de la misma matrícula, que sigue Cursando. La promoción anticipada y la
                reubicación se hacen una por una.
              </Aviso>
            ) : null}
            <Field variant="outlined" className={cn("gap-2", lote && "hidden")}>
              <FieldLabel>
                Tipo de cambio de grado<span data-required-mark="">*</span>
              </FieldLabel>
              <RadioGroup
                value={tipo}
                onValueChange={(v) => v && cambiarTipo(v as TipoCambioGrado)}
                className="flex flex-wrap gap-x-6 gap-y-2 pt-1"
              >
                {TIPOS.map((t) => (
                  <label key={t.value} className="flex cursor-pointer items-center gap-2 text-sm">
                    <RadioGroupItem value={t.value} />
                    {t.label}
                  </label>
                ))}
              </RadioGroup>
            </Field>

            <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
              <CampoSelect
                id="cambio-grado-periodo"
                label="Período Académico destino"
                required
                value={periodoId}
                onChange={(v) => {
                  setPeriodo(v)
                  setGrupo("")
                }}
                opciones={(previa?.periodos ?? []).map((p) => ({ value: String(p.id), label: p.label }))}
                invalido={intentado && !periodo}
              />
              <CampoSelect
                id="cambio-grado-grado"
                label="Grado destino"
                required
                value={grado}
                onChange={(v) => {
                  setGrado(v)
                  setGrupo("")
                }}
                opciones={
                  promocion
                    ? gradoSiguiente
                      ? [{ value: gradoSiguiente, label: gradeLabel(Number(gradoSiguiente)) }]
                      : []
                    : (previa?.grados ?? []).map((g) => ({ value: String(g.valor), label: gradeLabel(g.valor) }))
                }
                disabled={promocion}
                invalido={intentado && !grado}
                descripcion={promocion ? "En la promoción anticipada, solo el Grado siguiente." : undefined}
              />
              <CampoSelect
                id="cambio-grado-grupo"
                label="Grupo destino"
                required
                value={grupo}
                onChange={setGrupo}
                opciones={gruposConCupo.map((g) => ({
                  value: String(g.id),
                  label: `${g.codigo} (${plural(g.capacidad - g.ocupados, "cupo", "cupos")})`,
                }))}
                disabled={!grado}
                invalido={intentado && !grupo}
                descripcion={intentado && !grupo ? "Elija el grupo destino." : undefined}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field variant="outlined" className="gap-1.5" data-invalid={(intentado && !motivoValido) || undefined}>
                <FieldLabel htmlFor="cambio-grado-motivo">
                  Motivo<span data-required-mark="">*</span>
                </FieldLabel>
                <div className="relative">
                  <Textarea
                    id="cambio-grado-motivo"
                    rows={2}
                    maxLength={MOTIVO_MAX}
                    value={motivo}
                    placeholder={correccion ? "Qué error de registro se corrige" : "Decisión del Consejo Académico"}
                    aria-invalid={intentado && !motivoValido}
                    className={cn(TEXTAREA_OUTLINED, "pr-16")}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                  <CharacterCounter value={motivo} max={MOTIVO_MAX} className="absolute top-3 right-3" />
                </div>
                <FieldDescription className={cn(intentado && !motivoValido && "text-red")}>
                  Entre {MOTIVO_MIN} y {MOTIVO_MAX} caracteres.
                </FieldDescription>
              </Field>

              <Field variant="outlined" className="gap-1.5" data-invalid={(intentado && actaRequerida && !acta) || undefined}>
                <FieldLabel>
                  Acta o soporte{actaRequerida ? <span data-required-mark="">*</span> : null}
                </FieldLabel>
                <FileUpload
                  value={acta ? [acta] : []}
                  onValueChange={(files) => (files.length ? elegirActa(files[0]) : setActa(null))}
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxFiles={1}
                  label="Acta o soporte"
                >
                  {!acta && (
                    <FileUploadDropzone className="flex-row justify-start gap-2 px-3 py-2">
                      <UploadSimpleIcon aria-hidden className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Cargar archivo</span>
                    </FileUploadDropzone>
                  )}
                  <FileUploadList>
                    {acta && (
                      <FileUploadItem value={acta}>
                        <FileUploadItemPreview />
                        <FileUploadItemMetadata />
                        <FileUploadItemDelete />
                      </FileUploadItem>
                    )}
                  </FileUploadList>
                </FileUpload>
                <FieldDescription className={cn(intentado && actaRequerida && !acta && "text-red")}>
                  {actaRequerida ? "Acta del Consejo Académico · " : ""}PDF, JPG o PNG · máx. {SOPORTE_MAX_MB} MB
                </FieldDescription>
              </Field>
            </div>

            {correccion && r ? (
              <>
                <Aviso tono="advertencia">
                  {lote ? (
                    <>
                      {previa?.conRegistros} de {matriculas.length} estudiantes tienen registros en Gestión Académica de{" "}
                      {gradeLabel(origen.grade)}. La decisión y el emparejamiento son uno solo para todos.
                    </>
                  ) : (
                    <>
                      En {gradeLabel(origen.grade)} ya hay registros en Gestión Académica: resultados de{" "}
                      {plural(r.actividades, "actividad", "actividades")}, definitivas de {r.definitivas.join(", ")} y
                      asistencia de {plural(r.clases, "clase", "clases")}.
                    </>
                  )}
                </Aviso>
                <Field variant="outlined" className="gap-2">
                  <FieldLabel>
                    Registros existentes<span data-required-mark="">*</span>
                  </FieldLabel>
                  <RadioGroup
                    value={registros}
                    onValueChange={(v) => v && setRegistros(v as Registros)}
                    className="flex flex-col gap-3 pt-1"
                  >
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <RadioGroupItem value="HOMOLOGAR" className="mt-0.5" />
                      <span>
                        <span className="font-semibold">Homologar</span>
                        <span className="text-muted-foreground">
                          {" "}
                          — se toma el snapshot y se aplica el emparejamiento, como en la promoción anticipada.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <RadioGroupItem value="DESCARTAR" className="mt-0.5" />
                      <span>
                        <span className="font-semibold">Descartar</span>
                        <span className="text-muted-foreground">
                          {" "}
                          — se anulan: dejan de contar y quedan en la Bitácora, sin borrado físico; la anulación es final, no
                          se restauran.
                        </span>
                      </span>
                    </label>
                  </RadioGroup>
                </Field>
              </>
            ) : null}

            {conComplementaria.length ? (
              <Aviso tono="advertencia">
                Tienen matrícula complementaria: {conComplementaria.map(nombreDe).join(", ")}. Se resuelve después, una por
                una.
              </Aviso>
            ) : null}

            {empareja && grupoId && emparejamiento && elegido ? (
              <section className="flex flex-col gap-3" aria-label="Homologación de notas">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    Homologación de notas <span className="font-normal text-muted-foreground">· revise y ajuste la propuesta</span>
                  </h3>
                  <EstadoBadge color="success">{emparejamiento.tipo}</EstadoBadge>
                </div>
                <EmparejamientoNotas
                  idBase="cambio-grado"
                  emparejamiento={emparejamiento}
                  elegido={elegido}
                  onChange={setElegido}
                  tituloPeriodos="Períodos de evaluación calificados"
                  tituloAsignaturas={`Asignaturas (${gradeLabel(origen.grade)} → ${gradoNombre})`}
                />
              </section>
            ) : null}

            {complementariaSeRetira && grado ? (
              <Aviso tono="advertencia">
                La matrícula complementaria de {previa?.complementaria?.especialidad} pasará a Retirado porque {gradoNombre} no
                tiene esa especialidad en jornada contraria.
              </Aviso>
            ) : null}

            {grupoId ? (
              <Resumen>
                {correccion ? (
                  <>
                    se corrige el grado de la misma matrícula, que sigue <EstadoBadge color="success">Cursando</EstadoBadge>:{" "}
                    {gradeLabel(origen.grade)} · {uno ? origen.group : "su grupo"} → {destinoTexto}.
                    {pideRegistros
                      ? registros === "DESCARTAR"
                        ? ` Los registros de ${gradeLabel(origen.grade)} quedan anulados por corrección de grado.`
                        : ` Los registros de ${gradeLabel(origen.grade)} se homologan.`
                      : ""}
                  </>
                ) : (
                  <>
                    se crea una nueva matrícula <EstadoBadge color="success">Cursando</EstadoBadge> en {destinoTexto}; la actual pasa
                    a <EstadoBadge color="muted">{promocion ? "Promovido" : "Reubicado"}</EstadoBadge> y conserva sus notas
                    {emparejamiento ? ` · ${textoEmparejamiento(emparejamiento)}` : ""}
                    {complementariaSeRetira ? ` · la complementaria de ${previa?.complementaria?.especialidad} pasa a Retirado` : ""}.
                  </>
                )}
              </Resumen>
            ) : null}
            <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={!mismoGrado || !previa || cambiar.isPending}
            onClick={confirmar}
          >
            {cambiar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            {lote ? "Corregir grado" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
