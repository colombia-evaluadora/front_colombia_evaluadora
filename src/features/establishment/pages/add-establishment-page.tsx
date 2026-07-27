import React from "react"
import { Link } from "@tanstack/react-router"

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

import { paths } from "@/config/paths"
import { EstablishmentDetailsForm } from "@/features/establishment/components/forms/form-establishment-details"
import { UserDetailsForm } from "../components/forms/form-user-datails"

export function AddEstablishmentPage() {
  return (
    <Card>
      <CardHeader>
        <CardAction>
          <div className="flex gap-2">
            <Button variant="fill" color="primary" size="sm">
              Guardar
            </Button>
            <Button render={<Link to={paths.app.establishments.general.getHref()} />} variant="ghost" color="neutral" size="sm" nativeButton={false}>
              Cancelar
            </Button>
          </div>
        </CardAction>
        <CardTitle>Agregar establecimiento educativo</CardTitle>
      </CardHeader>

      <CardContent>
        <Accordion type="multiple" defaultValue="datos-establecimiento">
          <AccordionItem value="datos-establecimiento">
            <AccordionTrigger>Datos de establecimiento</AccordionTrigger>
            <AccordionContent>
              <div className="py-4">
                <EstablishmentDetailsForm />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="datos-rector">
            <AccordionTrigger>Datos de rector y secretaria</AccordionTrigger>
            <AccordionContent>
              <div className="py-4 ">
                <UserDetailsForm role="RECTOR" />
                <UserDetailsForm role="SECRETARY" />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
