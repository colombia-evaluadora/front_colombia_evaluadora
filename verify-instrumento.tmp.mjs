import { chromium } from "playwright"

const BASE = "http://localhost:5173"
const browser = await chromium.launch({ args: ["--no-sandbox"] })
const page = await (await browser.newContext()).newPage()

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" })
await page.waitForTimeout(800)
await page.fill('input[name="email"]', "admin@example.com")
await page.fill('input[name="password"]', "password")
await page.click('button[type="submit"]')
await page.waitForTimeout(2000)

await page.goto(`${BASE}/app/planeador/actividades`, { waitUntil: "domcontentloaded" })
await page.waitForTimeout(1500)

// Open the filter funnel button next to the search bar.
await page.click('[aria-label="Filtros avanzados"], button:has-text("Filtros")').catch(async () => {
  // fallback: find the funnel/filter trigger by role
  await page.locator("button").filter({ hasText: "" }).first().click({ trial: true }).catch(() => {})
})
await page.waitForTimeout(500)
await page.screenshot({ path: "verify-instrumento-1.png" })

// Try to open the Instrumento combobox directly.
const trigger = page.getByText("Instrumento").locator("..").locator("button, [role=combobox]").first()
await trigger.click({ timeout: 5000 }).catch((e) => console.log("trigger click failed:", e.message))
await page.waitForTimeout(500)
await page.screenshot({ path: "verify-instrumento-2.png" })

const optionsText = await page.locator('[role="option"]').allTextContents().catch(() => [])
console.log("Instrumento options found:", optionsText)

await browser.close()
