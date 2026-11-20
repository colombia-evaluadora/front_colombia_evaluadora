import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { PublicBand } from "@/components/public/public-page"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, ClipboardTextIcon, FloppyDiskIcon, SpinnerIcon, WarningIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"

import { CatalogosFijosContext, type CatalogosFijos } from "@/features/coverage/matricula/api/query/catalogos-fijos"
import type { PeriodoOpcionCupo } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import { AvisoAutorizacionPendiente } from "@/features/autorizacion-datos/components/aviso-autorizacion-pendiente"
import {
  MatriculaBenefitsSection,
  MatriculaComplementarySection,
  MatriculaConflictVictimSection,
  MatriculaContactSection,
  MatriculaGuardianEmploymentSection,
  MatriculaGuardianSection,
  MatriculaPendingContext,
  MatriculaSectionDefaultOpenContext,
  MatriculaOriginSectorSection,
  MatriculaPreviousYearSection,
  MatriculaResidenceSection,
  MatriculaStudentSection,
  OPEN_SECTION_EVENT,
} from "@/features/coverage/matricula/components/forms/form-create-matricula"
import { createInitialMatriculaValues } from "@/features/coverage/matricula/utils/matricula-form-defaults"
import type { MatriculaFieldSettingsMap } from "@/features/coverage/matricula/utils/matricula-field-settings"
import type { DepartmentOption } from "@/features/coverage/matricula/components/forms/form-create-matricula"

import {
  pedirCodigoRegistro,
  registrarInscripcion,
  toCatalogosFijos,
  toDepartamentos,
  useContextoInscripcionQuery,
} from "@/features/publico/inscribir/api/inscripcion-publica"

import { InscripcionesCerradas } from "@/features/publico/inscribir/components/inscripciones-cerradas"
import { PasoConfirmacion, type FilaResumen } from "@/features/publico/inscribir/components/paso-confirmacion"
import { PasoOpciones } from "@/features/publico/inscribir/components/paso-opciones"
import { PasosAsistente } from "@/features/publico/inscribir/components/pasos-asistente"
import {
  MAX_INTENTOS_CODIGO,
  SIGLA_DOCUMENTO,
} from "@/features/publico/inscribir/datos-demo"
import {
  hermanoValido,
  mismoGrupoAdmision,
  opcionCompleta,
  opcionVacia,
  resolverOpcionPublica,
  type Hermano,
  type OpcionCupo,
} from "@/features/publico/inscribir/utils"

const BREADCRUMB = ["Inscripciones", "Inscribir"]
const PASOS = ["Aspirante", "Más datos", "Acudiente", "Grado y opciones", "Confirmación"]
const SUBTITULOS = ["El aspirante", "Más datos del aspirante", "El acudiente", "Grado y opciones de cupo", "Confirmación"]
const ULTIMO = PASOS.length - 1

const obligatorio = { requerido: true, visible: true }
// En la inscripción pública el acudiente recibe el código: su nombre, documento,
// género, teléfono y correo son obligatorios (en matrícula los decide la configuración).
const AJUSTES_ACUDIENTE: MatriculaFieldSettingsMap = {
  "guardian-first-name": obligatorio,
  "guardian-last-name": obligatorio,
  "guardian-document-number": obligatorio,
  "guardian-gender": obligatorio,
  "guardian-contact-phone": obligatorio,
  "guardian-contact-email": obligatorio,
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * U.2 Inscribir (sitio público). Si ningún establecimiento oficial tiene la inscripción en
 * línea habilitada muestra el aviso; si alguno la tiene, el asistente de 5 pasos, que guarda
 * de verdad (sso `eval-col-inscripcion-publica-*`). Con mocks lo sirve MSW.
 */
export function InscribirPage() {
  const contexto = useContextoInscripcionQuery()

  if (contexto.isPending || !contexto.data?.habilitada) {
    return (
      <PublicBand
        icon={ClipboardTextIcon}
        title="Inscripciones"
        subtitle={contexto.isPending ? "Consultando inscripciones abiertas" : "Aún no hay inscripciones abiertas"}
        breadcrumb={BREADCRUMB}
        width="xl"
      >
        {contexto.isPending ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <SpinnerIcon className="size-4 animate-spin" aria-hidden />
            Cargando…
          </p>
        ) : (
          <InscripcionesCerradas />
        )}
      </PublicBand>
    )
  }
  const { opciones, catalogos, maxOpciones = 3 } = contexto.data
  const fijos = toCatalogosFijos(catalogos)
  return (
    <CatalogosFijosContext value={fijos}>
      <AsistenteInscripcion
        periodos={opciones}
        maxOpciones={maxOpciones}
        catalogos={fijos}
        departamentos={toDepartamentos(catalogos?.municipios)}
      />
    </CatalogosFijosContext>
  )
}

const nombreDe = (lista: { id: number; nombre: string }[] | undefined, id: string) =>
  lista?.find((x) => String(x.id) === id)?.nombre ?? ""
const unir = (...partes: string[]) => partes.filter(Boolean).join(" ")

function AsistenteInscripcion({
  periodos,
  maxOpciones,
  catalogos,
  departamentos,
}: {
  periodos: PeriodoOpcionCupo[]
  maxOpciones: number
  catalogos: CatalogosFijos
  departamentos: DepartmentOption[]
}) {
  const navigate = useNavigate()
  const [paso, setPaso] = useState(0)
  const [intentados, setIntentados] = useState<number[]>([])
  const intentado = intentados.includes(paso)

  const [datos, setDatos] = useState(createInitialMatriculaValues)
  const [robot, setRobot] = useState(false)
  const [grado, setGrado] = useState("")
  const [opciones, setOpciones] = useState<OpcionCupo[]>(() => [opcionVacia()])
  const [hermano, setHermano] = useState<Hermano>({ tiene: null, documento: "" })
  const [autoriza, setAutoriza] = useState(false)
  const [codigo, setCodigo] = useState("")
  const [intentos, setIntentos] = useState(MAX_INTENTOS_CODIGO)
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null)
  const [bloqueo, setBloqueo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [registrada, setRegistrada] = useState<{ numero: string; autorizacionPendiente: boolean } | null>(null)

  const s = datos.student
  const g = datos.guardian
  const contacto = datos.guardianContact

  // Campos obligatorios vacíos del paso actual: [id del campo, sección que lo contiene].
  function faltantes(p: number): [string, string][] {
    const vacios = (pares: [string, unknown, string][]) =>
      pares.filter(([, v]) => !v).map(([id, , seccion]) => [id, seccion] as [string, string])
    if (p === 0)
      return vacios([
        ["student-document-type", s.documentType, "estudiante"],
        ["student-document-number", s.documentNumber, "estudiante"],
        ["student-first-name", s.firstName, "estudiante"],
        ["student-last-name", s.lastName, "estudiante"],
        ["student-birth-date", s.birthDate, "estudiante"],
        ["student-gender", s.gender, "estudiante"],
        ["robot", robot, ""],
      ])
    if (p === 2)
      return vacios([
        ["guardian-relationship", g.relationship, "acudiente"],
        ["guardian-document-type", g.documentType, "acudiente"],
        ["guardian-document-number", g.documentNumber, "acudiente"],
        ["guardian-first-name", g.firstName, "acudiente"],
        ["guardian-last-name", g.lastName, "acudiente"],
        ["guardian-gender", g.gender, "acudiente"],
        ["guardian-contact-phone", contacto.phone, "contacto-acudiente"],
        ["guardian-contact-email", CORREO.test(contacto.email), "contacto-acudiente"],
      ])
    if (p === 3)
      return vacios([
        ["grado", grado, ""],
        ["opciones", opciones.every((o) => opcionCompleta(periodos, grado, o)) && mismoGrupoAdmision(periodos, grado, opciones), ""],
        ["hermano", hermanoValido(hermano), ""],
      ])
    if (p === 4)
      // La autorización de datos es opcional (Regla 81): no bloquea el guardado.
      return vacios([["codigo", codigo.length === 6, ""]])
    return []
  }

  const pendientes = faltantes(paso)
  const invalidos = intentado ? pendientes.map(([id]) => id) : []
  // El documento del hermano mal escrito bloquea el avance sin esperar al clic (prototipo).
  const hermanoMalEscrito = paso === 3 && hermano.tiene === true && hermano.documento !== "" && !hermanoValido(hermano)

  function irA(p: number) {
    setPaso(p)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function enviarCodigo() {
    setErrorCodigo(null)
    try {
      const aviso = await pedirCodigoRegistro(contacto.email)
      if (aviso) setErrorCodigo(aviso)
    } catch (error) {
      setErrorCodigo(getErrorMessage(error))
    }
  }

  function siguiente() {
    if (pendientes.length) {
      setIntentados([...intentados, paso])
      // Abre las secciones plegadas que tienen campos pendientes.
      for (const [id] of pendientes) window.dispatchEvent(new CustomEvent(OPEN_SECTION_EVENT, { detail: id }))
      return
    }
    // Al llegar a Confirmación se envía el código al correo del acudiente (Regla 31).
    if (paso + 1 === ULTIMO) void enviarCodigo()
    irA(paso + 1)
  }

  // Nombres de catálogo como los guarda el funcionario (PAIS_ORIGEN, LENGUA_MATERNA, CONDICION_MIGRATORIA).
  const nombreOpcional = (lista: { id: number; nombre: string }[] | undefined, id: string | undefined) =>
    (id && nombreDe(lista, id)) || null

  async function guardar() {
    if (pendientes.length) {
      setIntentados([...intentados, paso])
      return
    }
    setGuardando(true)
    setErrorGeneral(null)
    try {
      const r = await registrarInscripcion({
        datos: { student: s, studentContact: datos.studentContact, guardian: g, guardianContact: contacto },
        correo: contacto.email,
        codigo,
        opciones: opciones.map((o) => resolverOpcionPublica(periodos, grado, o)!),
        documentoHermano: hermano.tiene ? hermano.documento : null,
        paisOrigen: nombreOpcional(catalogos.pais, s.paisOrigen),
        lenguaMaterna: nombreOpcional(catalogos.lenguaMaterna, s.lenguaMaterna),
        condicionMigratoria: nombreOpcional(catalogos.condicionMigratoria, s.condicionMigratoria),
        autorizaDatos: autoriza,
      })
      if (r.registrada) {
        setRegistrada({ numero: r.numeroInscripcion, autorizacionPendiente: r.autorizacionPendiente })
        return
      }
      setCodigo("")
      const quedan = r.intentosRestantes ?? intentos
      setIntentos(quedan)
      setErrorCodigo(r.mensaje)
      if (r.intentosRestantes === 0) setBloqueo(true)
    } catch (error) {
      // 409 una vigente por Año·Modalidad·Ciclo (Regla 27), hermano, opción cerrada…: el mensaje oficial del backend.
      setErrorGeneral(getErrorMessage(error))
    } finally {
      setGuardando(false)
    }
  }

  const resumen: FilaResumen[] = [
    {
      etiqueta: "Aspirante",
      valor: `${unir(s.firstName, s.secondName, s.lastName, s.secondLastName)} · ${unir(
        SIGLA_DOCUMENTO[nombreDe(catalogos.tipoDocumento, s.documentType)] ?? "",
        s.documentNumber,
      )}`,
    },
    {
      etiqueta: "Acudiente",
      valor: `${nombreDe(catalogos.parentesco, g.relationship)} · ${unir(g.firstName, g.secondName, g.lastName, g.secondLastName)}`,
    },
    { etiqueta: "Grado", valor: grado },
    ...opciones.map((o, i) => ({
      etiqueta: `Opción ${i + 1}`,
      valor: [o.establecimiento, o.sede, o.jornada, o.modalidad].filter(Boolean).join(" · "),
    })),
    { etiqueta: "Hermano en las opciones", valor: hermano.tiene ? `Sí · ${hermano.documento}` : "No" },
  ]

  const acciones = (
    <>
      {paso > 0 && (
        <Button type="button" variant="outline" color="neutral" onClick={() => irA(paso - 1)}>
          <ArrowLeftIcon data-icon="inline-start" />
          Anterior
        </Button>
      )}
      {paso < ULTIMO ? (
        <Button type="button" onClick={siguiente} disabled={hermanoMalEscrito}>
          Siguiente
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      ) : (
        <Button type="button" onClick={guardar} disabled={intentos <= 0 || guardando}>
          <FloppyDiskIcon data-icon="inline-start" />
          Guardar
        </Button>
      )}
    </>
  )

  const nota = <p className="text-muted-foreground text-xs">Los campos marcados con * son obligatorios</p>

  return (
    <PublicBand
      icon={ClipboardTextIcon}
      title={`Inscripción ${periodos[0]?.grupoAdmision.split(" · ")[0] ?? ""}`.trim()}
      subtitle={`Paso ${paso + 1} de ${PASOS.length} · ${SUBTITULOS[paso]}`}
      breadcrumb={BREADCRUMB}
      width="xl"
      actions={acciones}
    >
      <div className="flex flex-col gap-6">
        <PasosAsistente pasos={PASOS} actual={paso} />

        {intentado && pendientes.length > 0 && paso < ULTIMO && (
          <Alert variant="warning">
            <WarningIcon />
            <AlertDescription>Complete los campos obligatorios marcados para continuar.</AlertDescription>
          </Alert>
        )}

        {/* Los pasos quedan montados (ocultos) para no perder lo escrito al ir y volver.
            Cada sección de matrícula ya es un plegable con su número (contador CSS
            `seccion`); un paso oculto no cuenta, así que cada uno fija desde dónde
            sigue la numeración (2-4, 5-9, 10-13). */}
        <MatriculaPendingContext value={invalidos}>
          <div hidden={paso !== 0} className="flex flex-col gap-4 [counter-reset:seccion_1]">
            <MatriculaStudentSection
              value={s}
              onChange={(student) => setDatos({ ...datos, student })}
              departments={departamentos}
              invalidFields={invalidos}
            />
            <MatriculaSectionDefaultOpenContext value={false}>
              <MatriculaResidenceSection
                title="Domicilio del estudiante"
                addressLabel="Dirección del estudiante"
                departmentLabel="Lugar de residencia departamento estudiante"
                municipalityLabel="Lugar de residencia municipio estudiante"
                idPrefix="student-residence"
                value={datos.studentAddress}
                onChange={(studentAddress) => setDatos({ ...datos, studentAddress })}
                departments={departamentos}
              />
              <MatriculaContactSection
                title="Información de contacto del estudiante"
                idPrefix="student-contact"
                phoneLabel="Teléfono de estudiante"
                emailLabel="Email estudiante"
                value={datos.studentContact}
                onChange={(studentContact) => setDatos({ ...datos, studentContact })}
              />
            </MatriculaSectionDefaultOpenContext>
            <div className="flex flex-col gap-1.5">
              {/* Lugar del captcha del sitio público (pendiente de conectar). */}
              <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={robot} onCheckedChange={(c) => setRobot(Boolean(c))} aria-invalid={invalidos.includes("robot")} />
                No soy un robot
              </label>
              {invalidos.includes("robot") && <p className="text-red text-xs">Confirme que no es un robot.</p>}
            </div>
            {nota}
          </div>

          <div hidden={paso !== 1} className="flex flex-col gap-4 [counter-reset:seccion_4]">
            <MatriculaPreviousYearSection
              value={datos.previousYear}
              onChange={(previousYear) => setDatos({ ...datos, previousYear })}
            />
            <MatriculaSectionDefaultOpenContext value={false}>
              <MatriculaOriginSectorSection
                value={datos.originSector}
                onChange={(originSector) => setDatos({ ...datos, originSector })}
              />
              <MatriculaConflictVictimSection
                value={datos.conflictVictim}
                departments={departamentos}
                onChange={(conflictVictim) => setDatos({ ...datos, conflictVictim })}
              />
              <MatriculaComplementarySection
                value={datos.complementary}
                onChange={(complementary) => setDatos({ ...datos, complementary })}
              />
              <MatriculaBenefitsSection value={datos.benefits} onChange={(benefits) => setDatos({ ...datos, benefits })} />
            </MatriculaSectionDefaultOpenContext>
          </div>

          <div hidden={paso !== 2} className="flex flex-col gap-4 [counter-reset:seccion_9]">
            <MatriculaGuardianSection
              value={g}
              onChange={(guardian) => setDatos({ ...datos, guardian })}
              departments={departamentos}
              fieldSettings={AJUSTES_ACUDIENTE}
              invalidFields={invalidos}
            />
            <MatriculaSectionDefaultOpenContext value={false}>
              <MatriculaResidenceSection
                title="Domicilio del acudiente"
                addressLabel="Dirección de acudiente"
                departmentLabel="Lugar de residencia departamento acudiente"
                municipalityLabel="Lugar de residencia municipio acudiente"
                idPrefix="guardian-residence"
                value={datos.guardianAddress}
                onChange={(guardianAddress) => setDatos({ ...datos, guardianAddress })}
                departments={departamentos}
              />
              <MatriculaContactSection
                title="Información de contacto de acudiente"
                idPrefix="guardian-contact"
                phoneLabel="Teléfono de acudiente"
                emailLabel="Email acudiente"
                value={contacto}
                onChange={(guardianContact) => setDatos({ ...datos, guardianContact })}
                fieldSettings={AJUSTES_ACUDIENTE}
                invalidFields={invalidos}
              />
              <MatriculaGuardianEmploymentSection
                value={datos.guardianEmployment}
                onChange={(guardianEmployment) => setDatos({ ...datos, guardianEmployment })}
              />
            </MatriculaSectionDefaultOpenContext>
            {nota}
          </div>
        </MatriculaPendingContext>

        <div hidden={paso !== 3} className="flex flex-col gap-4">
          <PasoOpciones
            periodos={periodos}
            maxOpciones={maxOpciones}
            grado={grado}
            onGradoChange={setGrado}
            opciones={opciones}
            onOpcionesChange={setOpciones}
            hermano={hermano}
            onHermanoChange={setHermano}
            intentado={intentado}
          />
          {nota}
        </div>

        {paso === ULTIMO && (
          <>
            {errorGeneral && (
              <Alert variant="destructive" role="alert">
                <WarningIcon />
                <AlertDescription>{errorGeneral}</AlertDescription>
              </Alert>
            )}
            <PasoConfirmacion
              resumen={resumen}
              correo={contacto.email}
              autoriza={autoriza}
              onAutorizaChange={setAutoriza}
              codigo={codigo}
              onCodigoChange={(c) => {
                setCodigo(c)
                setErrorCodigo(null)
              }}
              intentosRestantes={intentos}
              bloqueado={intentos <= 0}
              intentado={intentado}
              errorCodigo={errorCodigo}
              onReenviar={() => {
                // Un código nuevo anula el anterior y trae otros 5 intentos.
                setIntentos(MAX_INTENTOS_CODIGO)
                setCodigo("")
                void enviarCodigo()
              }}
            />
          </>
        )}
      </div>

      <Dialog open={bloqueo} onOpenChange={setBloqueo}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WarningIcon className="text-orange size-5" aria-hidden />
              Superó el número de intentos
            </DialogTitle>
            <DialogDescription>
              Por seguridad, el código quedó anulado. Pida uno nuevo con «Reenviar código» (como mucho uno por minuto y 5 por hora).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setBloqueo(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={registrada != null}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircleIcon className="text-green size-5" aria-hidden />
              Inscripción {registrada?.numero} registrada.
            </DialogTitle>
            <DialogDescription>
              Enviamos el comprobante con el número al correo del acudiente. Con ese número y el documento del
              aspirante puede consultarla en Consultar inscripción.
            </DialogDescription>
          </DialogHeader>
          {registrada?.autorizacionPendiente && (
            <AvisoAutorizacionPendiente onAutorizar={() => navigate({ to: paths.publico.consultarInscripcion.getHref() })} />
          )}
          <DialogFooter>
            <Button type="button" onClick={() => navigate({ to: paths.publico.consultarInscripcion.getHref() })}>
              Consultar inscripción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PublicBand>
  )
}
