import { afterAll, afterEach, beforeAll, expect, it } from "vitest"
import { setupServer } from "msw/node"

import { establishmentsDb, establishmentsRowsDb } from "../../../../mocks/db/establishments"
import { establishmentHandlers } from "../../../../mocks/handlers/establishments"

const server = setupServer(...establishmentHandlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it("persists a new establishment through the mock POST handler", async () => {
  const initialCount = establishmentsDb.length

  const response = await fetch("http://localhost/api/establishments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: "test-establishment",
      basicInfo: {
        name: "I.E. Prueba",
        dane: "12345678",
        nit: "900123456",
        ownershipType: {
          id: "oficial",
          code: "OFFICIAL",
          name: "Oficial",
        },
      },
      address: {
        municipality: {
          id: "11001",
          code: "11001",
          name: "Bogotá",
          department: {
            id: "11",
            code: "11",
            name: "Bogotá",
          },
        },
        zone: {
          id: "urbana",
          code: "URBANA",
          name: "Urbana",
        },
        district: {
          id: "district-1",
          code: "01",
          name: "Distrito 1",
        },
        commune: {
          id: "commune-1",
          code: "01",
          name: "Comuna 1",
        },
        locality: {
          id: "locality-1",
          code: "01",
          name: "Localidad 1",
        },
        address: "Calle 123",
      },
      contact: {
        email: "test@example.com",
        website: "https://example.com",
        phone: "3000000000",
        fax: "3000000001",
      },
      additionalInfo: {
        approvalResolution: "RES-001",
        teachingLanguage: {
          id: "es",
          code: "ES",
          name: "Español",
        },
        calendar: {
          id: "cal-a",
          code: "A",
          name: "Calendario A",
        },
        costRegime: {
          id: "libertad-vigilada",
          code: "LIBERTAD_VIGILADA",
          name: "Libertad Vigilada",
        },
        populationGender: {
          id: "m",
          code: "M",
          name: "Masculino",
        },
        tuitionRange: {
          id: "menor-06",
          code: "<0.6",
          name: "Menor de 0.6 SMLV",
        },
        disabilityType: {
          id: "na",
          code: "NA",
          name: "No aplica",
        },
        operatingLicense: true,
        licenseDate: null,
        ethnicAttention: false,
        giftedAttention: false,
        subsidy: false,
      },
      principal: null,
      secretary: null,
    }),
  })

  expect(response.status).toBe(200)

  const payload = await response.json()

  expect(payload.status).toBe("ok")
  expect(establishmentsDb).toHaveLength(initialCount + 1)
  expect(establishmentsRowsDb.some((row) => row.id === payload.establishment.id)).toBe(true)
})

it("loads an existing establishment from the mock store when editing", async () => {
  const existing = establishmentsDb[0]

  expect(existing).toBeDefined()

  const response = await fetch(`http://localhost/api/establishments/${existing.id}`)

  expect(response.status).toBe(200)

  const payload = await response.json()

  expect(payload.establishment.id).toBe(existing.id)
  expect(payload.establishment.basicInfo.name).toBe(existing.basicInfo.name)
})
