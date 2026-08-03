import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState, type FormEvent } from "react"

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { paths } from "@/config/paths"
import { CATALOGS } from "@/lib/catalogs"

import { CampusDetailsForm } from "../components/forms/form-campus-details"
import { useCreateCampus } from "../api/mutations/use-create-campus"
import { useUpdateCampus } from "../api/mutations/use-update-campus"
import { useCampusQuery } from "../api/query/use-campus-query"
import { useCatalogQuery } from "../api/query/use-catalogs"
import type { CatalogItem } from "../api/types/catalog"
import type { Campus } from "../api/types/campus"
import { NoticeOutlet, useNotify } from "../components/common/notice-context"

function createEmptyCatalogItem(): CatalogItem {
  return { id: "", code: "", name: "" }
}

function createInitialCampusValues(): Campus {
  return {
    id: crypto.randomUUID(),
    name: "",
    dane: "",
    zone: createEmptyCatalogItem(),
    neighborhood: "",
    commune: "",
    address: "",
    phone: "",
    approvalResolution: "",
  }
}

function validateCampus(values: Campus): string[] {
  const errors: string[] = []

  if (!values.name.trim()) {
    errors.push("El nombre de la sede es obligatorio.")
  }

  if (!values.dane.trim()) {
    errors.push("El código DANE es obligatorio.")
  }

  if (!values.zone.id.trim()) {
    errors.push("La zona es obligatoria.")
  }

  return errors
}

export function AddCampusPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { notify } = useNotify()
  const campusId = useMemo(() => {
    if (!location.pathname.includes("/sedes/editar/")) {
      return null
    }

    return location.pathname.split("/sedes/editar/").at(1) ?? null
  }, [location.pathname])

  const isEditMode = campusId !== null

  const [formValues, setFormValues] = useState<Campus>(createInitialCampusValues)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const { data: zones = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ZONES)
  const campusQuery = useCampusQuery(campusId, isEditMode)

  useEffect(() => {
    if (!isEditMode) {
      setFormValues(createInitialCampusValues())
      setValidationErrors([])
      return
    }

    if (campusQuery.data?.status === "ok") {
      setFormValues(campusQuery.data.campus)
      setValidationErrors([])
    }
  }, [campusQuery.data, isEditMode])

  const createMutation = useCreateCampus({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }

        notify(result.message)
        navigate({ to: paths.app.establishments.campuses.getHref() })
      },
      onError: (error) => {
        notify(error.message || "No fue posible guardar la sede.", { variant: "error" })
      },
    },
  })

  const updateMutation = useUpdateCampus({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }

        notify(result.message)
        navigate({ to: paths.app.establishments.campuses.getHref() })
      },
      onError: (error) => {
        notify(error.message || "No fue posible actualizar la sede.", { variant: "error" })
      },
    },
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateCampus(formValues)
    setValidationErrors(errors)

    if (errors.length > 0) {
      notify("Completa los campos obligatorios antes de guardar.", { variant: "error" })
      return
    }

    if (isEditMode && campusId) {
      await updateMutation.mutateAsync({
        campusId,
        values: formValues,
      })
      return
    }

    await createMutation.mutateAsync(formValues)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? "Editar sede" : "Agregar sede"}</CardTitle>
      </CardHeader>

      <CardContent>
        <NoticeOutlet className="mb-4" />
        {validationErrors.length > 0 ? (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <p className="font-medium">Completa los campos obligatorios:</p>
            <ul className="mt-2 list-disc pl-5">
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <form id="campus-form" onSubmit={handleSubmit}>
          <CampusDetailsForm
            value={formValues}
            onChange={setFormValues}
            zones={zones}
          />
        </form>
      </CardContent>

      <CardFooter className="justify-end gap-2">
        <Button
          render={<Link to={paths.app.establishments.campuses.getHref()} />}
          variant="fill"
          color="neutral"
          nativeButton={false}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          form="campus-form"
          variant="fill"
          color="primary"
          disabled={isPending}
        >
          {isPending ? "Guardando..." : isEditMode ? "Guardar cambios" : "Guardar"}
        </Button>
      </CardFooter>
    </Card>
  )
}