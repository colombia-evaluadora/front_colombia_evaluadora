import { useState } from "react"
import { useStore } from "@tanstack/react-form"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useAppForm } from "@/lib/forms"
import { getErrorMessage } from "@/lib/api-client"
import { CATALOGS } from "@/lib/catalogs"
import { parseDateValue } from "@/lib/date-value"

import { correccionIdentidadSchema, SOPORTE_EXTENSIONES } from "@/features/establishment/employees/api/schema"
import { useCorregirIdentidad } from "@/features/establishment/employees/api/mutations/funcionario-ficha"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { FuncionarioFicha } from "@/features/establishment/employees/api/types/funcionario"
import { ArchivoField } from "@/features/establishment/employees/components/forms/archivo-field"
import {
  DOCUMENTO_MAX,
  NOMBRE_MAX,
  esDocumentoNumerico,
  fechaLimiteMayorDeEdad,
  fechaMinimaNacimiento,
  toDocumentoInput,
  toNombreInput,
} from "@/features/establishment/shared/person-field-rules"

const FORM_ID = "corregir-identidad-form"

interface DialogCorregirIdentidadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ficha: FuncionarioFicha
  establishmentId: number
  onCorrected: () => void
}

/**
 * Corregir datos de identidad (Regla 93): lo hacen el Rector o el Jefe de Sistemas, con motivo
 * y soporte, y actualiza la ficha única en todos los establecimientos.
 */
export function DialogCorregirIdentidad({ open, onOpenChange, ficha, establishmentId, onCorrected }: DialogCorregirIdentidadProps) {
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const corregir = useCorregirIdentidad()
  const { data: documentTypes = [] } = useCatalogQuery<CatalogItem>(CATALOGS.DOCUMENT_TYPES)
  const nombre = [ficha.firstName, ficha.middleName, ficha.lastName, ficha.secondLastName].filter(Boolean).join(" ")

  const form = useAppForm({
    defaultValues: {
      documentTypeId: ficha.documentTypeId,
      documentTypeCode: ficha.documentTypeCode,
      identification: ficha.identification,
      firstName: ficha.firstName,
      middleName: ficha.middleName,
      lastName: ficha.lastName,
      secondLastName: ficha.secondLastName,
      birthDate: ficha.birthDate,
      reason: "",
      support: null as File | null,
    },
    validators: { onSubmit: correccionIdentidadSchema },
    onSubmit: async ({ value }) => {
      try {
        await corregir.mutateAsync({
          funcionarioId: ficha.id,
          establishmentId,
          documentTypeId: value.documentTypeId as number,
          identification: value.identification,
          firstName: value.firstName,
          middleName: value.middleName,
          lastName: value.lastName,
          secondLastName: value.secondLastName,
          birthDate: value.birthDate,
          reason: value.reason,
          support: value.support as File,
        })
        onCorrected()
      } catch (err) {
        setError({ id: Date.now(), message: getErrorMessage(err) })
      }
    },
  })
  const documentTypeCode = useStore(form.store, (s) => s.values.documentTypeCode)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (corregir.isPending) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Corregir datos de identidad de {nombre}</DialogTitle>
          <DialogDescription>
            El cambio actualiza la ficha del funcionario en todos los establecimientos y queda en la bitácora.
          </DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />
        <form
          id={FORM_ID}
          noValidate
          className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <form.AppField
            name="documentTypeId"
            listeners={{
              onChange: ({ value }) =>
                form.setFieldValue("documentTypeCode", documentTypes.find((t) => t.id === value)?.code ?? ""),
            }}
          >
            {(f) => (
              <f.SelectField
                label="Tipo de documento"
                required
                options={documentTypes.map((t) => ({ value: t.id, label: t.name }))}
                emptyValue={null}
              />
            )}
          </form.AppField>
          <form.AppField name="identification">
            {(f) => (
              <f.TextField
                label="Número de documento"
                required
                maxLength={DOCUMENTO_MAX}
                inputMode={esDocumentoNumerico(documentTypeCode) ? "numeric" : "text"}
                transform={(v) => toDocumentoInput(v, documentTypeCode)}
              />
            )}
          </form.AppField>
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
          <form.AppField name="birthDate">
            {(f) => (
              <f.DateField
                label="Fecha de nacimiento"
                minDate={parseDateValue(fechaMinimaNacimiento())}
                maxDate={parseDateValue(fechaLimiteMayorDeEdad())}
              />
            )}
          </form.AppField>
          <div className="md:col-span-2">
            <form.AppField name="reason">
              {(f) => <f.TextareaField label="Motivo" required maxLength={500} rows={3} placeholder="Por qué se corrigen los datos" />}
            </form.AppField>
          </div>
          <div className="md:col-span-2">
            <form.AppField name="support">
              {() => (
                <ArchivoField
                  label="Soporte"
                  required
                  hint="PDF, JPG o PNG (p. ej. el documento de identidad); máximo 10 MB."
                  extensions={SOPORTE_EXTENSIONES}
                  maxMb={10}
                />
              )}
            </form.AppField>
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} variant="fill" color="primary" size="sm" disabled={corregir.isPending}>
            {corregir.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Confirmar cambio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
