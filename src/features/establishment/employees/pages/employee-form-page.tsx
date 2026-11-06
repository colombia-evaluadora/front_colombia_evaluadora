import { useEffect, useRef, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { useStore } from "@tanstack/react-form"
import { Link, useMatch, useNavigate, useParams, useSearch } from "@tanstack/react-router"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  ArrowLeftIcon,
  FloppyDiskIcon,
  InfoIcon,
  PencilIcon,
  ShieldIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons"
import { ImageUploadField } from "@/components/image-upload-field"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { useLogout, useUser } from "@/lib/auth"
import { CATALOGS } from "@/lib/catalogs"
import { parseDateValue } from "@/lib/date-value"
import { FormDisabledProvider, useAppForm } from "@/lib/forms"
import { IMAGE_MAX_SIZE, optionalImageFile } from "@/lib/image-file"
import { SUCCESS_MESSAGES, employeeInvitationNotice } from "@/lib/success-messages"
import { toEmailInput } from "@/lib/text-input"
import { employeeDetailRoute } from "@/router"

import { ArchivoImage } from "@/features/files/components/archivo-image"
import { useFormularioTanstackAsistente } from "@/features/assistant/lib/formulario-tanstack"
import { opcionesDeCatalogo, resolverOpcion } from "@/features/assistant/lib/campos-ui"
import {
  buildFuncionarioFormSchema,
  type FuncionarioFormValues,
} from "@/features/establishment/employees/api/schema"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { useFuncionarioFichaQuery } from "@/features/establishment/employees/api/query/use-funcionario-ficha"
import {
  useFuncionarioContextoQuery,
  useGradosEscalafonQuery,
} from "@/features/establishment/employees/api/query/use-funcionario-contexto"
import { usePersonaPorDocumentoQuery } from "@/features/establishment/employees/api/query/use-persona-por-documento"
import {
  crearAnexo,
  guardarFicha,
  useCrearAnexo,
  useEliminarAnexo,
  useGuardarFicha,
  useMarcarSoporte,
} from "@/features/establishment/employees/api/mutations/funcionario-ficha"
import {
  cancelarFuncionarioPendiente,
  registerFuncionario,
} from "@/features/establishment/employees/api/mutations/use-register-funcionario"
import { useReactivarPorCambioDeCorreo } from "@/features/establishment/employees/api/mutations/use-reactivar-por-cambio-de-correo"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type {
  Complementaria,
  FuncionarioFicha,
  PersonaPorDocumento,
} from "@/features/establishment/employees/api/types/funcionario"
import { ESTADO_FUNCIONARIO_BADGE, ESTADO_FUNCIONARIO_LABELS } from "@/features/establishment/employees/api/ui-mappings"
import { useEstablecimientoFuncionarios } from "@/features/establishment/employees/hooks/use-establecimiento-funcionarios"
import { AnexosSection, type AnexoPendiente } from "@/features/establishment/employees/components/forms/anexos-section"
import { DialogCorregirIdentidad } from "@/features/establishment/employees/components/dialogs/dialog-corregir-identidad"
import { RolesPermisosDialog } from "@/features/establishment/employees/components/dialogs/dialog-roles-permisos"
import { enmascararCorreo, enmascararTelefono } from "@/features/establishment/employees/utils/enmascarar"
import { selectCategoryQueryOptions } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { ReadOnlyValue } from "@/features/establishment/campuses/components/campus-read-only"
import {
  DOCUMENTO_MAX,
  NOMBRE_MAX,
  esDocumentoNumerico,
  fechaLimiteMayorDeEdad,
  fechaMinimaNacimiento,
  toDocumentoInput,
  toNombreInput,
  toTelefonoInput,
} from "@/features/establishment/shared/person-field-rules"
import { toDireccionInput } from "@/features/establishment/shared/text-field-rules"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

const FORM_ID = "funcionario-form"

/** Caret a la izquierda del título, como en el formulario de la sede. */
const accordionTriggerClassName =
  "flex-row-reverse justify-end items-center gap-2 py-3 text-base **:data-[slot=accordion-trigger-icon]:ml-0 **:data-[slot=accordion-trigger-icon]:size-4"
const accordionItemClassName = "rounded-lg border border-border bg-muted/40 not-last:border-b"

type Mode = "create" | "edit" | "detail"

const EMPTY_COMPLEMENTARY: Complementaria = {
  employeeClassId: null,
  teachingLevelId: null,
  statuteId: null,
  gradeId: null,
  educationLevelId: null,
  fundingSourceId: null,
  employmentTypeId: null,
  address: "",
}

function toFormValues(ficha: FuncionarioFicha | null): FuncionarioFormValues {
  const complementary = ficha?.complementary ?? EMPTY_COMPLEMENTARY
  return {
    documentTypeId: ficha?.documentTypeId ?? null,
    documentTypeCode: ficha?.documentTypeCode ?? "",
    identification: ficha?.identification ?? "",
    firstName: ficha?.firstName ?? "",
    middleName: ficha?.middleName ?? "",
    lastName: ficha?.lastName ?? "",
    secondLastName: ficha?.secondLastName ?? "",
    email: ficha?.email ?? "",
    phone: ficha?.phone ?? "",
    birthDate: ficha?.birthDate ?? "",
    genderId: ficha?.genderId ?? null,
    ...complementary,
  }
}

const formatFecha = (value: string) => (value ? value.split("-").reverse().join("/") : "")

/** Lo que muestra el aviso de funcionario existente (Regla 11). */
function ExistingPersonNotice({ persona, documentTypeName }: { persona: PersonaPorDocumento; documentTypeName: string }) {
  const filas: [string, string][] = [
    ["Documento", [documentTypeName, persona.identification].filter(Boolean).join(" ")],
    ["Nombres", [persona.firstName, persona.middleName].filter(Boolean).join(" ")],
    ["Apellidos", [persona.lastName, persona.secondLastName].filter(Boolean).join(" ")],
    ["Correo electrónico", persona.emailProtected || "—"],
    ["Fecha de nacimiento", formatFecha(persona.birthDate) || "—"],
    ["Teléfono", persona.phoneProtected || "—"],
  ]
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-blue-stroke bg-blue-22 p-4 md:col-span-2">
      <div className="flex items-start gap-2">
        <InfoIcon className="mt-0.5 size-5 shrink-0 text-blue" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="font-medium">Funcionario existente — verifique que es la persona correcta</p>
          <p className="text-sm text-muted-foreground">
            {persona.linked
              ? "Ya pertenece a este establecimiento: búsquelo en el listado para modificarlo."
              : "Sus datos están protegidos. Los de identidad los corrige el Rector o el Jefe de Sistemas, con motivo y soporte."}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-1 overflow-hidden rounded-md border border-border bg-card text-sm sm:grid-cols-3">
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="grid grid-cols-2 border-b border-border last:border-b-0 sm:border-r">
            <dt className="px-3 py-2 text-muted-foreground">{etiqueta}</dt>
            <dd className="px-3 py-2 font-medium">{valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

interface FuncionarioFormProps {
  mode: Mode
  ficha: FuncionarioFicha | null
  establishmentId: number
  establishmentName: string
  isOfficial: boolean
}

function FuncionarioForm({ mode, ficha, establishmentId, establishmentName, isOfficial }: FuncionarioFormProps) {
  const { notify } = useNotify()
  const navigate = useNavigate()
  const { data: user } = useUser()
  const logout = useLogout()
  const { puedeEditar } = useMenuPermission("FUNCIONARIOS")
  const readOnly = mode === "detail"
  const listHref = paths.app.establishments.officials.getHref()
  const search = { establecimiento: establishmentId }

  const { data: documentTypes = [] } = useCatalogQuery<CatalogItem>(CATALOGS.DOCUMENT_TYPES)
  const { data: genders = [] } = useCatalogQuery<CatalogItem>(CATALOGS.GENDERS)
  const { data: employeeClasses = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYEE_CLASSES)
  const { data: teachingLevels = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EDUCATION_LEVELS)
  const { data: educationLevels = [] } = useCatalogQuery<CatalogItem>(CATALOGS.HIGHEST_EDUCATION_LEVELS)
  const { data: fundingSources = [] } = useCatalogQuery<CatalogItem>(CATALOGS.FUNDING_SOURCES)
  const { data: employmentTypes = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYMENT_TYPES)
  const { data: statutes = [] } = useQuery(selectCategoryQueryOptions("ESTATUTO_DOCENTE"))

  const [photo, setPhoto] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [pending, setPending] = useState<AnexoPendiente[]>([])
  const [saving, setSaving] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const [rolesOpen, setRolesOpen] = useState(false)

  const guardar = useGuardarFicha()
  const crear = useCrearAnexo()
  const eliminar = useEliminarAnexo()
  const marcarSoporte = useMarcarSoporte()
  const reactivar = useReactivarPorCambioDeCorreo()

  // Las reglas que valida el formulario dependen de lo que se puede editar, que en el alta cambia
  // al encontrar a una persona que ya existe: el esquema lee este objeto al validar.
  const locks = useRef({ identityLocked: mode !== "create", contactLocked: mode !== "create" })

  const form = useAppForm({
    defaultValues: toFormValues(ficha),
    validators: { onSubmit: buildFuncionarioFormSchema(locks.current) },
    onSubmit: async ({ value }) => {
      const fotoValida = optionalImageFile.safeParse(photo)
      if (!fotoValida.success) {
        setPhotoError(fotoValida.error.issues[0]?.message ?? "Archivo no válido.")
        return
      }
      setSaving(true)
      try {
        if (mode === "create") await crearFuncionario(value)
        else await actualizarFuncionario(value)
      } catch (error) {
        notify(getErrorMessage(error), { variant: "error" })
      } finally {
        setSaving(false)
      }
    },
  })

  const documentTypeId = useStore(form.store, (s) => s.values.documentTypeId)
  const documentTypeCode = useStore(form.store, (s) => s.values.documentTypeCode)
  const identification = useStore(form.store, (s) => s.values.identification)
  const statuteId = useStore(form.store, (s) => s.values.statuteId)
  const { data: grades = [] } = useGradosEscalafonQuery(statuteId)

  // Al agregar se busca a la persona por Tipo + Número (Regla 11), medio segundo después de escribir.
  const [documentoBuscado, setDocumentoBuscado] = useState("")
  useEffect(() => {
    if (mode !== "create") return
    const timer = setTimeout(() => setDocumentoBuscado(identification), 500)
    return () => clearTimeout(timer)
  }, [identification, mode])
  const personaQuery = usePersonaPorDocumentoQuery(establishmentId, documentTypeId, documentoBuscado, mode === "create")
  const persona = mode === "create" && documentoBuscado === identification ? (personaQuery.data ?? null) : null
  // Ya es funcionario en otro establecimiento: sus datos están protegidos. Si solo tiene cuenta
  // (p. ej. como acudiente) se pide el correo, que es con el que se le crea el perfil de funcionario.
  const personaProtegida = persona != null && persona.funcionarioId != null

  locks.current.identityLocked = mode !== "create" || persona != null
  locks.current.contactLocked = mode === "detail" || personaProtegida || (mode === "edit" && ficha?.canEdit !== true)

  // Lo que se encontró se vuelca al formulario para que el resto del alta lo use.
  useEffect(() => {
    if (!persona) return
    form.setFieldValue("firstName", persona.firstName)
    form.setFieldValue("middleName", persona.middleName)
    form.setFieldValue("lastName", persona.lastName)
    form.setFieldValue("secondLastName", persona.secondLastName)
    form.setFieldValue("birthDate", persona.birthDate)
    form.setFieldValue("genderId", persona.genderId)
  }, [persona, form])

  const identityLocked = locks.current.identityLocked
  const contactLocked = locks.current.contactLocked
  const complementaryEditable = isOfficial && !readOnly && (mode === "create" || ficha?.canEdit === true)
  const canEditPhoto = !readOnly && !personaProtegida && (mode === "create" || ficha?.canEdit === true)

  function complementariaDe(value: FuncionarioFormValues): Complementaria | undefined {
    if (!isOfficial) return undefined
    return {
      employeeClassId: value.employeeClassId,
      teachingLevelId: value.teachingLevelId,
      statuteId: value.statuteId,
      gradeId: value.gradeId,
      educationLevelId: value.educationLevelId,
      fundingSourceId: value.fundingSourceId,
      employmentTypeId: value.employmentTypeId,
      address: value.address,
    }
  }

  async function subirPendientes(funcionarioId: number) {
    const fallidos: string[] = []
    for (const anexo of pending) {
      try {
        await crearAnexo({ funcionarioId, establishmentId, name: anexo.name, description: anexo.description, file: anexo.file })
      } catch (error) {
        fallidos.push(`${anexo.name} (${getErrorMessage(error)})`)
      }
    }
    return fallidos
  }

  async function crearFuncionario(value: FuncionarioFormValues) {
    if (persona?.linked) {
      notify("Esta persona ya pertenece al establecimiento: búsquela en el listado para modificarla.", { variant: "error" })
      return
    }
    let funcionarioId = persona?.funcionarioId ?? null
    let aviso: ReturnType<typeof employeeInvitationNotice> | null = null
    let registrado = false
    if (funcionarioId == null) {
      const documentType = documentTypes.find((t) => t.id === value.documentTypeId) ?? null
      const result = await registerFuncionario(
        {
          documentType,
          identification: value.identification.trim(),
          firstName: value.firstName.trim(),
          middleName: value.middleName.trim() || undefined,
          lastName: value.lastName.trim(),
          secondLastName: value.secondLastName.trim() || undefined,
          birthDate: value.birthDate,
          gender: genders.find((g) => g.id === value.genderId) ?? null,
          email: toEmailInput(value.email),
          phone: value.phone.trim(),
        },
        photo,
      )
      funcionarioId = result.pkFuncionario
      registrado = true
      aviso = employeeInvitationNotice({ ...result, email: result.email || value.email })
    }
    try {
      await guardarFicha({ funcionarioId, establishmentId, complementaria: complementariaDe(value) })
    } catch (error) {
      // Sin el vínculo con el establecimiento el funcionario quedaría huérfano.
      if (registrado) await cancelarFuncionarioPendiente(funcionarioId).catch(() => undefined)
      throw error
    }
    const fallidos = await subirPendientes(funcionarioId)
    if (fallidos.length > 0) {
      notify(`El funcionario se guardó, pero no se cargaron estos documentos: ${fallidos.join(", ")}.`, { variant: "error" })
    } else {
      notify(aviso?.message ?? SUCCESS_MESSAGES.employee.created, { variant: aviso?.variant })
    }
    // Después de guardar se ofrece Roles y permisos (Regla 22).
    navigate({ to: paths.app.establishments.officialEdit.getHref(funcionarioId), search })
  }

  async function actualizarFuncionario(value: FuncionarioFormValues) {
    if (!ficha) return
    const conContacto = ficha.canEdit && !ficha.contactProtected
    const result = await guardar.mutateAsync({
      funcionarioId: ficha.id,
      establishmentId,
      contacto: conContacto
        ? { email: toEmailInput(value.email), phone: value.phone, photo, removePhoto: photoRemoved && !photo }
        : undefined,
      complementaria: complementariaDe(value),
    })
    if (result.correoCambio && result.correoAnterior) {
      const correoNuevo = toEmailInput(value.email)
      try {
        await reactivar.mutateAsync({ correoAnterior: result.correoAnterior, correoNuevo })
      } catch (error) {
        notify(`${SUCCESS_MESSAGES.employee.updated} No fue posible enviar el correo de activación: ${getErrorMessage(error)}`, {
          variant: "error",
        })
        return
      }
      // Cambió el correo propio: la sesión es de la cuenta anterior.
      if (user?.email && user.email.toLowerCase() === result.correoAnterior.toLowerCase()) {
        await logout.mutateAsync(undefined)
        navigate({ to: paths.auth.login.path })
        return
      }
      notify(`${SUCCESS_MESSAGES.employee.updated} Se envió el correo de activación a ${correoNuevo}.`)
    } else {
      notify(SUCCESS_MESSAGES.employee.updated)
    }
    navigate({ to: paths.app.establishments.officialDetail.getHref(ficha.id), search })
  }

  async function cambiarSoporte(next: boolean) {
    if (!ficha) return
    try {
      await marcarSoporte.mutateAsync({ funcionarioId: ficha.id, soporte: next })
      notify(next ? "Se marcó como Usuario de soporte." : "Ya no es Usuario de soporte.")
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    }
  }

  // UI asistida: el agente lee y rellena el formulario; nunca guarda.
  const opcion = (items: { id: number; name: string }[]) => ({
    opciones: opcionesDeCatalogo(items),
    aAgente: (v: unknown) => (v == null ? "" : String(v)),
    aModelo: (v: unknown) => {
      const id = resolverOpcion(opcionesDeCatalogo(items), v)
      return id ? Number(id) : undefined
    },
  })
  useFormularioTanstackAsistente(form, {
    codigo: mode === "create" ? "funcionario.crear" : "funcionario.editar",
    entidad: ficha?.id ?? null,
    bloqueado: readOnly ? "Ver detalle es de solo lectura: use Modificar." : null,
    campos: [
      { nombre: "tipoDocumento", etiqueta: "Tipo de documento", tipo: "select", obligatorio: true, soloLectura: identityLocked, ...opcion(documentTypes), elemento: "documentTypeId" },
      { nombre: "numeroDocumento", etiqueta: "Número de documento", tipo: "text", obligatorio: true, soloLectura: identityLocked, elemento: "identification" },
      { nombre: "primerNombre", etiqueta: "Primer nombre", tipo: "text", obligatorio: true, soloLectura: identityLocked, elemento: "firstName" },
      { nombre: "segundoNombre", etiqueta: "Segundo nombre", tipo: "text", soloLectura: identityLocked, elemento: "middleName" },
      { nombre: "primerApellido", etiqueta: "Primer apellido", tipo: "text", obligatorio: true, soloLectura: identityLocked, elemento: "lastName" },
      { nombre: "segundoApellido", etiqueta: "Segundo apellido", tipo: "text", soloLectura: identityLocked, elemento: "secondLastName" },
      { nombre: "correo", etiqueta: "Correo electrónico", tipo: "email", obligatorio: true, soloLectura: contactLocked, elemento: "email" },
      { nombre: "telefono", etiqueta: "Teléfono", tipo: "tel", soloLectura: contactLocked, elemento: "phone" },
      { nombre: "fechaNacimiento", etiqueta: "Fecha de nacimiento", tipo: "date", soloLectura: identityLocked, elemento: "birthDate" },
      { nombre: "genero", etiqueta: "Género", tipo: "select", obligatorio: true, soloLectura: identityLocked, ...opcion(genders), elemento: "genderId" },
      ...(complementaryEditable
        ? [
            { nombre: "claseFuncionario", etiqueta: "Clase de funcionario", tipo: "select" as const, ...opcion(employeeClasses), elemento: "employeeClassId" },
            { nombre: "tipoVinculacion", etiqueta: "Tipo de vinculación", tipo: "select" as const, ...opcion(employmentTypes), elemento: "employmentTypeId" },
            { nombre: "fuenteRecursos", etiqueta: "Fuente de recursos", tipo: "select" as const, ...opcion(fundingSources), elemento: "fundingSourceId" },
            { nombre: "nivelEducativoAlcanzado", etiqueta: "Nivel educativo alcanzado", tipo: "select" as const, ...opcion(educationLevels), elemento: "educationLevelId" },
            { nombre: "nivelEnsenanza", etiqueta: "Nivel educativo de enseñanza", tipo: "select" as const, ...opcion(teachingLevels), elemento: "teachingLevelId" },
            { nombre: "direccion", etiqueta: "Dirección", tipo: "text" as const, elemento: "address" },
          ]
        : []),
    ],
  })

  const nombreCompleto = ficha
    ? [ficha.firstName, ficha.middleName, ficha.lastName, ficha.secondLastName].filter(Boolean).join(" ")
    : "Nuevo funcionario"
  const documentTypeName = documentTypes.find((t) => t.id === documentTypeId)?.name ?? ficha?.documentTypeName ?? ""
  const genderName = genders.find((g) => g.id === ficha?.genderId)?.name ?? ficha?.genderName ?? ""
  const isSuper = user?.isSuperAdmin === true
  const photoArchivoId = photoRemoved ? null : (personaProtegida ? persona?.photoArchivoId : ficha?.photoArchivoId) ?? null

  const catalogOptions = (items: { id: number; name: string }[]) => items.map((i) => ({ value: i.id, label: i.name }))
  const statuteOptions = statutes.map((s) => ({ value: s.pk_lista_valor, label: s.nombre }))
  const gradeOptions = grades.map((g) => ({ value: g.pk_lista_valor, label: g.nombre }))
  // Un grado guardado sin estatuto (valores históricos) se sigue mostrando.
  if (ficha?.complementary.gradeId != null && !gradeOptions.some((g) => g.value === ficha.complementary.gradeId)) {
    gradeOptions.push({ value: ficha.complementary.gradeId, label: ficha.complementaryNames.gradeId })
  }

  const lockedValue = (id: string, label: string, value: string, required = false) => (
    <ReadOnlyValue id={id} label={label} value={value} locked required={required} />
  )

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {mode === "edit" && ficha?.canCorrectIdentity ? (
                <Button type="button" variant="ghost" color="primary" size="sm" onClick={() => setCorrecting(true)}>
                  <PencilIcon data-icon="inline-start" />
                  Corregir identidad
                </Button>
              ) : null}
              {ficha && puedeEditar ? (
                <Button type="button" variant="ghost" color="primary" size="sm" onClick={() => setRolesOpen(true)}>
                  <ShieldIcon data-icon="inline-start" />
                  Roles y permisos
                </Button>
              ) : null}
              {readOnly ? (
                <>
                  <Button render={<Link to={listHref} search={search} />} nativeButton={false} variant="outline" color="neutral" size="sm">
                    <ArrowLeftIcon data-icon="inline-start" />
                    Volver
                  </Button>
                  {puedeEditar && ficha ? (
                    <Button
                      render={<Link to={paths.app.establishments.officialEdit.getHref(ficha.id)} search={search} />}
                      nativeButton={false}
                      variant="fill"
                      color="primary"
                      size="sm"
                    >
                      <PencilIcon data-icon="inline-start" />
                      Modificar
                    </Button>
                  ) : null}
                </>
              ) : (
                <>
                  <Button render={<Link to={listHref} search={search} />} nativeButton={false} variant="outline" color="neutral" size="sm">
                    <XIcon data-icon="inline-start" />
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    form={FORM_ID}
                    variant="fill"
                    color="primary"
                    size="sm"
                    disabled={saving || persona?.linked === true}
                    aria-busy={saving}
                  >
                    {saving ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FloppyDiskIcon data-icon="inline-start" />}
                    Guardar
                  </Button>
                </>
              )}
            </div>
          }
        >
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <Link to={listHref} search={search} className="shrink-0 text-sm font-normal text-muted-foreground hover:text-foreground">
              Funcionarios ›
            </Link>
            <span className="truncate">{nombreCompleto}</span>
            {ficha ? (
              <Badge {...ESTADO_FUNCIONARIO_BADGE[ficha.status]}>{ESTADO_FUNCIONARIO_LABELS[ficha.status]}</Badge>
            ) : null}
          </span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <form
          id={FORM_ID}
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <Accordion multiple defaultValue={["datos", "complementaria", "anexos"]} keepMounted className="gap-4">
            <AccordionItem value="datos" className={accordionItemClassName}>
              <AccordionTrigger className={accordionTriggerClassName}>Datos personales</AccordionTrigger>
              <AccordionContent>
                <div className="-mx-4 grid grid-cols-1 gap-4 border-t border-border bg-card px-4 py-4 md:grid-cols-[11rem_1fr]">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">Foto del usuario</span>
                    <ImageUploadField
                      value={photo}
                      onValueChange={(file) => {
                        setPhoto(file)
                        setPhotoError(null)
                        if (file) setPhotoRemoved(false)
                      }}
                      title="Foto"
                      description={null}
                      hint="JPG, PNG o SVG · 2 MB"
                      maxSize={IMAGE_MAX_SIZE}
                      deleteLabel="Eliminar foto"
                      error={photoError}
                      className="h-36"
                      disabled={!canEditPhoto}
                      existingPreview={photoArchivoId != null ? <ArchivoImage archivoId={photoArchivoId} alt="Foto del funcionario" /> : undefined}
                      onRemoveExisting={canEditPhoto && photoArchivoId != null ? () => setPhotoRemoved(true) : undefined}
                    />
                  </div>

                  <FormDisabledProvider disabled={readOnly}>
                    <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
                      <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:col-span-2 md:grid-cols-[1fr_2fr]">
                        {mode === "create" ? (
                          <>
                            <form.AppField
                              name="documentTypeId"
                              listeners={{
                                onChange: ({ value }) =>
                                  form.setFieldValue("documentTypeCode", documentTypes.find((t) => t.id === value)?.code ?? ""),
                              }}
                            >
                              {(f) => <f.SelectField label="Tipo de documento" required options={catalogOptions(documentTypes)} emptyValue={null} />}
                            </form.AppField>
                            <form.AppField name="identification">
                              {(f) => (
                                <f.TextField
                                  label="Número de documento"
                                  required
                                  maxLength={DOCUMENTO_MAX}
                                  inputMode={esDocumentoNumerico(documentTypeCode) ? "numeric" : "text"}
                                  transform={(v) => toDocumentoInput(v, documentTypeCode)}
                                  description={personaQuery.isFetching ? "Buscando si la persona ya existe…" : undefined}
                                />
                              )}
                            </form.AppField>
                          </>
                        ) : (
                          <>
                            {lockedValue("documentTypeId", "Tipo de documento", documentTypeName, true)}
                            {lockedValue("identification", "Número de documento", ficha?.identification ?? "", true)}
                          </>
                        )}
                      </div>

                      {identityLocked ? (
                        mode === "create" ? null : (
                          <>
                            {lockedValue("genderId", "Género", genderName)}
                            {lockedValue("birthDate", "Fecha de nacimiento", formatFecha(ficha?.birthDate ?? ""))}
                          </>
                        )
                      ) : (
                        <>
                          <form.AppField name="firstName">
                            {(f) => <f.TextField label="Primer nombre" required maxLength={NOMBRE_MAX} transform={toNombreInput} />}
                          </form.AppField>
                          <form.AppField name="middleName">
                            {(f) => <f.TextField label="Segundo nombre" maxLength={NOMBRE_MAX} transform={toNombreInput} />}
                          </form.AppField>
                          <form.AppField name="lastName">
                            {(f) => <f.TextField label="Primer apellido" required maxLength={NOMBRE_MAX} transform={toNombreInput} />}
                          </form.AppField>
                          <form.AppField name="secondLastName">
                            {(f) => <f.TextField label="Segundo apellido" maxLength={NOMBRE_MAX} transform={toNombreInput} />}
                          </form.AppField>
                        </>
                      )}

                      {contactLocked ? (
                        <>
                          {lockedValue("email", "Correo electrónico", personaProtegida ? (persona?.emailProtected ?? "") : enmascararCorreo(ficha?.email ?? ""))}
                          {lockedValue("phone", "Teléfono", personaProtegida ? (persona?.phoneProtected ?? "") : enmascararTelefono(ficha?.phone ?? ""))}
                        </>
                      ) : (
                        <>
                          <form.AppField name="email">
                            {(f) => (
                              <f.TextField
                                label="Correo electrónico"
                                required
                                type="email"
                                maxLength={200}
                                transform={toEmailInput}
                                description={mode === "create" ? "A este correo llegará el enlace para activar la cuenta (48 horas)." : undefined}
                              />
                            )}
                          </form.AppField>
                          {identityLocked ? null : (
                            <form.AppField name="genderId">
                              {(f) => <f.SelectField label="Género" required options={catalogOptions(genders)} emptyValue={null} />}
                            </form.AppField>
                          )}
                          {identityLocked ? null : (
                            <form.AppField name="birthDate">
                              {(f) => (
                                <f.DateField
                                  label="Fecha de nacimiento"
                                  minDate={parseDateValue(fechaMinimaNacimiento())}
                                  maxDate={parseDateValue(fechaLimiteMayorDeEdad())}
                                />
                              )}
                            </form.AppField>
                          )}
                          <form.AppField name="phone">
                            {(f) => <f.TextField label="Teléfono" type="tel" inputMode="tel" maxLength={16} transform={toTelefonoInput} />}
                          </form.AppField>
                        </>
                      )}

                      <label className="flex items-center gap-3 text-sm md:col-span-2">
                        <Switch
                          checked={ficha?.isSupport ?? false}
                          disabled={!isSuper || !ficha || marcarSoporte.isPending}
                          onCheckedChange={(checked) => void cambiarSoporte(checked)}
                        />
                        Usuario de soporte
                        {isSuper ? null : <span className="text-xs text-muted-foreground">Solo lo marca el Superadministrador.</span>}
                      </label>

                      {persona ? <ExistingPersonNotice persona={persona} documentTypeName={documentTypeName} /> : null}
                      {mode === "edit" && !ficha?.canCorrectIdentity ? (
                        <p className="text-xs text-muted-foreground md:col-span-2">
                          Los datos de identidad los corrige el Rector o el Jefe de Sistemas, con motivo y soporte.
                        </p>
                      ) : null}
                    </div>
                  </FormDisabledProvider>
                </div>
              </AccordionContent>
            </AccordionItem>

            {isOfficial ? (
              <AccordionItem value="complementaria" className={accordionItemClassName}>
                <AccordionTrigger className={accordionTriggerClassName}>
                  <span className="flex items-center gap-2">
                    Información complementaria
                    <Badge variant="outline" color="neutral">
                      Establecimiento oficial
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <FormDisabledProvider disabled={!complementaryEditable}>
                    <div className="-mx-4 grid grid-cols-1 gap-x-4 gap-y-5 border-t border-border bg-card px-4 py-4 md:grid-cols-6">
                      <div className="md:col-span-2">
                        <form.AppField name="employeeClassId">
                          {(f) => <f.SelectField label="Clase de funcionario" options={catalogOptions(employeeClasses)} emptyValue={null} clearable />}
                        </form.AppField>
                      </div>
                      <div className="md:col-span-2">
                        <form.AppField name="employmentTypeId">
                          {(f) => <f.SelectField label="Tipo de vinculación" options={catalogOptions(employmentTypes)} emptyValue={null} clearable />}
                        </form.AppField>
                      </div>
                      <div className="md:col-span-2">
                        <form.AppField name="fundingSourceId">
                          {(f) => <f.SelectField label="Fuente de recursos" options={catalogOptions(fundingSources)} emptyValue={null} clearable />}
                        </form.AppField>
                      </div>
                      <div className="md:col-span-2">
                        <form.AppField name="statuteId" listeners={{ onChange: () => form.setFieldValue("gradeId", null) }}>
                          {(f) => <f.SelectField label="Estatuto docente" options={statuteOptions} emptyValue={null} clearable />}
                        </form.AppField>
                      </div>
                      <div className="md:col-span-2">
                        <form.AppField name="gradeId">
                          {(f) => (
                            <f.SelectField
                              label="Grado escalafón"
                              options={gradeOptions}
                              emptyValue={null}
                              clearable
                              description="Según el estatuto."
                              disabled={statuteId == null && gradeOptions.length === 0}
                            />
                          )}
                        </form.AppField>
                      </div>
                      <div className="md:col-span-2">
                        <form.AppField name="educationLevelId">
                          {(f) => <f.SelectField label="Nivel educativo alcanzado" options={catalogOptions(educationLevels)} emptyValue={null} clearable />}
                        </form.AppField>
                      </div>
                      <div className="md:col-span-3">
                        <form.AppField name="teachingLevelId">
                          {(f) => <f.SelectField label="Nivel educativo de enseñanza" options={catalogOptions(teachingLevels)} emptyValue={null} clearable />}
                        </form.AppField>
                      </div>
                      <div className="md:col-span-3">
                        <form.AppField name="address">
                          {(f) => (
                            <f.TextField label="Dirección" maxLength={150} placeholder="Ej.: Carrera 27 # 45-18" transform={(v) => toDireccionInput(v, 150)} />
                          )}
                        </form.AppField>
                      </div>
                    </div>
                  </FormDisabledProvider>
                </AccordionContent>
              </AccordionItem>
            ) : null}

            <AccordionItem value="anexos" className={accordionItemClassName}>
              <AccordionTrigger className={accordionTriggerClassName}>Documentos anexos</AccordionTrigger>
              <AccordionContent>
                <div className="-mx-4 border-t border-border bg-card px-4 py-4">
                  <AnexosSection
                    establishmentName={establishmentName}
                    annexes={ficha?.annexes ?? []}
                    pending={pending}
                    readOnly={readOnly || (mode === "edit" && ficha?.canEdit !== true)}
                    onAdd={async (values) => {
                      if (!ficha) {
                        setPending((current) => [...current, { key: Date.now(), ...values }])
                        return
                      }
                      await crear.mutateAsync({ funcionarioId: ficha.id, establishmentId, ...values })
                      notify(`Se agregó el documento «${values.name}».`)
                    }}
                    onRemove={async (annexId) => {
                      if (!ficha) return
                      try {
                        await eliminar.mutateAsync({ annexId, funcionarioId: ficha.id })
                      } catch (error) {
                        notify(getErrorMessage(error), { variant: "error" })
                      }
                    }}
                    onRemovePending={(key) => setPending((current) => current.filter((a) => a.key !== key))}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </form>
      </TableScreenBody>

      {ficha && mode === "edit" && ficha.canCorrectIdentity ? (
        <DialogCorregirIdentidad
          open={correcting}
          onOpenChange={setCorrecting}
          ficha={ficha}
          establishmentId={establishmentId}
          onCorrected={() => {
            setCorrecting(false)
            notify("Se corrigieron los datos de identidad del funcionario.")
          }}
        />
      ) : null}

      <RolesPermisosDialog
        employee={rolesOpen && ficha ? { id: ficha.id, name: nombreCompleto } : null}
        establishmentId={establishmentId}
        onOpenChange={(open) => !open && setRolesOpen(false)}
      />
    </TableScreen>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <TableScreen>
      <TableScreenBody>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">{children}</div>
      </TableScreenBody>
    </TableScreen>
  )
}

/** Nuevo funcionario, Modificar y Ver detalle (Sección 4.1): el mismo formulario. */
export function EmployeeFormPage() {
  const params = useParams({ strict: false }) as { employeeId?: string }
  const search = useSearch({ strict: false }) as { establecimiento?: number }
  const isDetail = useMatch({ from: employeeDetailRoute.id, shouldThrow: false }) != null
  const employeeId = params.employeeId ? Number(params.employeeId) : null
  const mode: Mode = employeeId == null ? "create" : isDetail ? "detail" : "edit"

  const establecimiento = useEstablecimientoFuncionarios(search.establecimiento)
  const fichaQuery = useFuncionarioFichaQuery(employeeId, establecimiento.id)
  const contexto = useFuncionarioContextoQuery(mode === "create" ? establecimiento.id : null)

  const cargando =
    establecimiento.cargando || (employeeId != null && fichaQuery.isPending) || (mode === "create" && contexto.isPending)
  if (cargando && establecimiento.id != null) {
    return (
      <Centered>
        <span className="flex items-center gap-2">
          <SpinnerIcon className="animate-spin" aria-hidden />
          Cargando el funcionario…
        </span>
      </Centered>
    )
  }

  const error = establecimiento.id == null ? "No tiene establecimientos asignados." : fichaQuery.error ?? contexto.error
  if (error || (employeeId != null && !fichaQuery.data)) {
    return (
      <Centered>
        <p>{typeof error === "string" ? error : getErrorMessage(error)}</p>
        <Button
          render={<Link to={paths.app.establishments.officials.getHref()} search={{ establecimiento: establecimiento.id ?? undefined }} />}
          nativeButton={false}
          variant="outline"
          color="neutral"
          size="sm"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver a funcionarios
        </Button>
      </Centered>
    )
  }

  const ficha = fichaQuery.data ?? null
  // `key`: los valores iniciales del formulario se leen una sola vez al montar.
  return (
    <FuncionarioForm
      key={`${mode}-${employeeId ?? "nuevo"}-${establecimiento.id}`}
      mode={mode}
      ficha={ficha}
      establishmentId={establecimiento.id as number}
      establishmentName={establecimiento.nombre}
      isOfficial={ficha ? ficha.establishmentIsOfficial : contexto.data?.isOfficial === true}
    />
  )
}
