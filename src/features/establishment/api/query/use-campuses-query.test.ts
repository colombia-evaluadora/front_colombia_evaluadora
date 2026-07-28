import { afterAll, afterEach, beforeAll, expect, it } from "vitest"
import { setupServer } from "msw/node"

import { campusesDb, campusesRowsDb } from "../../../../mocks/db/campuses"
import { campusHandlers } from "../../../../mocks/handlers/campuses"

const server = setupServer(...campusHandlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it("returns paginated campus rows through the mock query handler", async () => {
  const response = await fetch("http://localhost/api/campuses/query", {
    method: "QUERY",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filters: {
        search: campusesDb[0].name.slice(0, 8),
        zones: [campusesDb[0].zone.code],
      },
      sorting: [],
      pageIndex: 0,
      pageSize: 10,
    }),
  })

  expect(response.status).toBe(200)

  const payload = await response.json()

  expect(payload.totalCount).toBeGreaterThan(0)
  expect(payload.rows.length).toBeGreaterThan(0)
  expect(campusesRowsDb).toHaveLength(300)
})