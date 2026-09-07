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

await page.click('button[aria-label="Filtros avanzados"]')
await page.waitForTimeout(500)
await page.screenshot({ path: "verify-instrumento-panel.png" })

// Instrumento combobox trigger is the second ComboboxFieldTrigger (Ver por, Estado, Instrumento)
const instrumentoTrigger = page.locator("#filtro")
await instrumentoTrigger.click({ timeout: 5000 })
await page.waitForTimeout(500)
await page.screenshot({ path: "verify-instrumento-open.png" })

const optionsText = await page.locator('[role="option"]').allTextContents().catch(() => [])
console.log("Instrumento options found:", JSON.stringify(optionsText))

await browser.close()
