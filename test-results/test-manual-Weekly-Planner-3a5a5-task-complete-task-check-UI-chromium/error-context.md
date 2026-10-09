# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test-manual.spec.js >> Weekly Planner - Manual Testing >> Desktop - Create task, complete task, check UI
- Location: tests\e2e\test-manual.spec.js:15:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.weekly-block:has-text("Test Task E2E")')
Expected: visible
Error: strict mode violation: locator('.weekly-block:has-text("Test Task E2E")') resolved to 2 elements:
    1) <article tabindex="0" role="button" draggable="true" aria-label="Abrir tarea Test Task E2E" class="weekly-block weekly-task-block priority-high status-scheduled">…</article> aka getByRole('button', { name: 'Abrir tarea Test Task E2E' }).first()
    2) <article tabindex="0" role="button" draggable="true" aria-label="Abrir tarea Test Task E2E" class="weekly-block weekly-task-block priority-high status-scheduled">…</article> aka getByRole('button', { name: 'Abrir tarea Test Task E2E' }).nth(1)

Call log:
  - Expect "toBeVisible" locator('.weekly-block:has-text("Test Task E2E")') with timeout 5000ms
  - waiting for locator('.weekly-block:has-text("Test Task E2E")')

```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - banner "barra superior" [ref=f1e3]:
    - button "☰ Menu" [ref=f1e5] [cursor=pointer]
    - generic [ref=f1e6]:
      - generic [ref=f1e7]:
        - img "Avatar de Luis Rodriguez" [ref=f1e8]
        - generic [ref=f1e9]:
          - generic [ref=f1e10]: Tu espacio personal
          - strong [ref=f1e11]: Luis Rodriguez
      - button "Cerrar sesión" [ref=f1e12] [cursor=pointer]
  - main [ref=f1e13]:
    - generic [ref=f1e14]:
      - generic [ref=f1e15]:
        - generic [ref=f1e16]:
          - paragraph [ref=f1e17]: VEKTOR / WEEKLY PLANNER
          - heading "Tu semana, con espacio para lo importante" [level=1] [ref=f1e18]
          - paragraph [ref=f1e19]: Planifica con precisión y deja que el calendario aprenda de tus decisiones.
        - generic [ref=f1e20]:
          - button "Anterior" [ref=f1e21] [cursor=pointer]
          - button "Hoy" [ref=f1e22] [cursor=pointer]
          - button "Siguiente" [ref=f1e23] [cursor=pointer]
          - button "Limpiar semana" [ref=f1e24] [cursor=pointer]
      - region "Resumen semanal" [ref=f1e25]:
        - generic [ref=f1e26]:
          - generic [ref=f1e27]: Completadas
          - strong [ref=f1e28]: "0"
        - generic [ref=f1e29]:
          - generic [ref=f1e30]: Progreso
          - strong [ref=f1e31]: 0%
        - generic [ref=f1e32]:
          - generic [ref=f1e33]: Enfoques
          - strong [ref=f1e34]: "0"
        - generic [ref=f1e35]:
          - generic [ref=f1e36]: Hábitos activos
          - strong [ref=f1e37]: "0"
      - generic [ref=f1e38]:
        - complementary [ref=f1e39]:
          - region "Tareas por colocar" [ref=f1e40]:
            - generic [ref=f1e41]:
              - generic [ref=f1e42]:
                - heading "Tareas por colocar" [level=2] [ref=f1e43]
                - paragraph [ref=f1e44]: Arrastra una tarea a cualquier hora.
              - navigation "Paginación del listado" [ref=f1e45]:
                - generic [ref=f1e46]: Página 1/1
            - list [ref=f1e47]:
              - listitem [ref=f1e48]:
                - generic [ref=f1e49]:
                  - strong [ref=f1e50]: prueba
                  - generic [ref=f1e51]:
                    - generic [ref=f1e52]: HIGH
                    - generic [ref=f1e53]: —
              - listitem [ref=f1e54]:
                - generic [ref=f1e55]:
                  - strong [ref=f1e56]: Test Task E2E
                  - generic [ref=f1e57]:
                    - generic [ref=f1e58]: HIGH
                    - generic [ref=f1e59]: —
              - listitem [ref=f1e60]:
                - generic [ref=f1e61]:
                  - strong [ref=f1e62]: Test Task E2E
                  - generic [ref=f1e63]:
                    - generic [ref=f1e64]: HIGH
                    - generic [ref=f1e65]: —
            - link "Ver todo" [ref=f1e67] [cursor=pointer]:
              - /url: /tasks
          - region "Hábitos por colocar" [ref=f1e68]:
            - generic [ref=f1e69]:
              - generic [ref=f1e70]:
                - heading "Hábitos por colocar" [level=2] [ref=f1e71]
                - paragraph [ref=f1e72]: Arrastra un hábito o prográmalo a las 07:00.
              - navigation "Paginación del listado" [ref=f1e73]:
                - generic [ref=f1e74]: Página 1/2
                - button "Página siguiente" [ref=f1e75] [cursor=pointer]: Siguiente
            - list [ref=f1e76]:
              - listitem [ref=f1e77]:
                - button "Dormir mínimo 7 horas MEDIUM — Arrastra o pulsa para +07:00" [ref=f1e78] [cursor=pointer]:
                  - strong [ref=f1e79]: Dormir mínimo 7 horas
                  - generic [ref=f1e80]:
                    - generic [ref=f1e81]: MEDIUM
                    - generic [ref=f1e82]: —
                  - generic [ref=f1e83]: Arrastra o pulsa para +07:00
              - listitem [ref=f1e84]:
                - button "Caminar 20 minutos diarios MEDIUM — Arrastra o pulsa para +07:00" [ref=f1e85] [cursor=pointer]:
                  - strong [ref=f1e86]: Caminar 20 minutos diarios
                  - generic [ref=f1e87]:
                    - generic [ref=f1e88]: MEDIUM
                    - generic [ref=f1e89]: —
                  - generic [ref=f1e90]: Arrastra o pulsa para +07:00
              - listitem [ref=f1e91]:
                - button "Beber 2 litros de agua MEDIUM — Arrastra o pulsa para +07:00" [ref=f1e92] [cursor=pointer]:
                  - strong [ref=f1e93]: Beber 2 litros de agua
                  - generic [ref=f1e94]:
                    - generic [ref=f1e95]: MEDIUM
                    - generic [ref=f1e96]: —
                  - generic [ref=f1e97]: Arrastra o pulsa para +07:00
            - link "Ver todo" [ref=f1e99] [cursor=pointer]:
              - /url: /habits
        - generic [ref=f1e101]:
          - generic [ref=f1e103]:
            - generic [ref=f1e104]:
              - strong [ref=f1e105]: lun
              - generic [ref=f1e106]: 05/10
              - button "Limpiar día" [ref=f1e107] [cursor=pointer]
            - generic [ref=f1e108]:
              - strong [ref=f1e109]: mar
              - generic [ref=f1e110]: 06/10
              - button "Limpiar día" [ref=f1e111] [cursor=pointer]
            - generic [ref=f1e112]:
              - strong [ref=f1e113]: mié
              - generic [ref=f1e114]: 07/10
              - button "Limpiar día" [ref=f1e115] [cursor=pointer]
            - generic [ref=f1e116]:
              - strong [ref=f1e117]: jue
              - generic [ref=f1e118]: 08/10
              - button "Limpiar día" [ref=f1e119] [cursor=pointer]
            - generic [ref=f1e120]:
              - strong [ref=f1e121]: vie
              - generic [ref=f1e122]: 09/10
              - button "Limpiar día" [ref=f1e123] [cursor=pointer]
            - generic [ref=f1e124]:
              - strong [ref=f1e125]: sáb
              - generic [ref=f1e126]: 10/10
              - button "Limpiar día" [ref=f1e127] [cursor=pointer]
            - generic [ref=f1e128]:
              - strong [ref=f1e129]: dom
              - generic [ref=f1e130]: 11/10
              - button "Limpiar día" [ref=f1e131] [cursor=pointer]
          - generic [aria-hidden] [ref=f1e132]:
            - generic [ref=f1e133]: 05:00
            - generic [ref=f1e134]: 06:00
            - generic [ref=f1e135]: 07:00
            - generic [ref=f1e136]: 08:00
            - generic [ref=f1e137]: 09:00
            - generic [ref=f1e138]: 10:00
            - generic [ref=f1e139]: 11:00
            - generic [ref=f1e140]: 12:00
            - generic [ref=f1e141]: 13:00
            - generic [ref=f1e142]: 14:00
            - generic [ref=f1e143]: 15:00
            - generic [ref=f1e144]: 16:00
            - generic [ref=f1e145]: 17:00
            - generic [ref=f1e146]: 18:00
            - generic [ref=f1e147]: 19:00
            - generic [ref=f1e148]: 20:00
            - generic [ref=f1e149]: 21:00
            - generic [ref=f1e150]: 22:00
            - generic [ref=f1e151]: 23:00
          - generic [ref=f1e152]:
            - region "2026-10-05" [ref=f1e153]:
              - generic [ref=f1e154]:
                - button "2026-10-05 a las 5:00" [ref=f1e155]
                - button "2026-10-05 a las 6:00" [ref=f1e156]
                - button "2026-10-05 a las 7:00" [ref=f1e157]
                - button "2026-10-05 a las 8:00" [ref=f1e158]
                - button "2026-10-05 a las 9:00" [ref=f1e159]
                - button "2026-10-05 a las 10:00" [ref=f1e160]
                - button "2026-10-05 a las 11:00" [ref=f1e161]
                - button "2026-10-05 a las 12:00" [ref=f1e162]
                - button "2026-10-05 a las 13:00" [ref=f1e163]
                - button "2026-10-05 a las 14:00" [ref=f1e164]
                - button "2026-10-05 a las 15:00" [ref=f1e165]
                - button "2026-10-05 a las 16:00" [ref=f1e166]
                - button "2026-10-05 a las 17:00" [ref=f1e167]
                - button "2026-10-05 a las 18:00" [ref=f1e168]
                - button "2026-10-05 a las 19:00" [ref=f1e169]
                - button "2026-10-05 a las 20:00" [ref=f1e170]
                - button "2026-10-05 a las 21:00" [ref=f1e171]
                - button "2026-10-05 a las 22:00" [ref=f1e172]
                - button "Abrir tarea Test Task E2E" [ref=f1e173] [cursor=pointer]:
                  - strong [ref=f1e174]: Test Task E2E
                  - generic [ref=f1e175]: 05:00 - 05:30
                - button "Abrir tarea Test Task E2E" [ref=f1e176] [cursor=pointer]:
                  - strong [ref=f1e177]: Test Task E2E
                  - generic [ref=f1e178]: 05:00 - 05:30
            - region "2026-10-06" [ref=f1e179]:
              - generic [ref=f1e180]:
                - button "2026-10-06 a las 5:00" [ref=f1e181]
                - button "2026-10-06 a las 6:00" [ref=f1e182]
                - button "2026-10-06 a las 7:00" [ref=f1e183]
                - button "2026-10-06 a las 8:00" [ref=f1e184]
                - button "2026-10-06 a las 9:00" [ref=f1e185]
                - button "2026-10-06 a las 10:00" [ref=f1e186]
                - button "2026-10-06 a las 11:00" [ref=f1e187]
                - button "2026-10-06 a las 12:00" [ref=f1e188]
                - button "2026-10-06 a las 13:00" [ref=f1e189]
                - button "2026-10-06 a las 14:00" [ref=f1e190]
                - button "2026-10-06 a las 15:00" [ref=f1e191]
                - button "2026-10-06 a las 16:00" [ref=f1e192]
                - button "2026-10-06 a las 17:00" [ref=f1e193]
                - button "2026-10-06 a las 18:00" [ref=f1e194]
                - button "2026-10-06 a las 19:00" [ref=f1e195]
                - button "2026-10-06 a las 20:00" [ref=f1e196]
                - button "2026-10-06 a las 21:00" [ref=f1e197]
                - button "2026-10-06 a las 22:00" [ref=f1e198]
            - region "2026-10-07" [ref=f1e199]:
              - generic [ref=f1e200]:
                - button "2026-10-07 a las 5:00" [ref=f1e201]
                - button "2026-10-07 a las 6:00" [ref=f1e202]
                - button "2026-10-07 a las 7:00" [ref=f1e203]
                - button "2026-10-07 a las 8:00" [ref=f1e204]
                - button "2026-10-07 a las 9:00" [ref=f1e205]
                - button "2026-10-07 a las 10:00" [ref=f1e206]
                - button "2026-10-07 a las 11:00" [ref=f1e207]
                - button "2026-10-07 a las 12:00" [ref=f1e208]
                - button "2026-10-07 a las 13:00" [ref=f1e209]
                - button "2026-10-07 a las 14:00" [ref=f1e210]
                - button "2026-10-07 a las 15:00" [ref=f1e211]
                - button "2026-10-07 a las 16:00" [ref=f1e212]
                - button "2026-10-07 a las 17:00" [ref=f1e213]
                - button "2026-10-07 a las 18:00" [ref=f1e214]
                - button "2026-10-07 a las 19:00" [ref=f1e215]
                - button "2026-10-07 a las 20:00" [ref=f1e216]
                - button "2026-10-07 a las 21:00" [ref=f1e217]
                - button "2026-10-07 a las 22:00" [ref=f1e218]
            - region "2026-10-08" [ref=f1e219]:
              - generic [ref=f1e220]:
                - button "2026-10-08 a las 5:00" [ref=f1e221]
                - button "2026-10-08 a las 6:00" [ref=f1e222]
                - button "2026-10-08 a las 7:00" [ref=f1e223]
                - button "2026-10-08 a las 8:00" [ref=f1e224]
                - button "2026-10-08 a las 9:00" [ref=f1e225]
                - button "2026-10-08 a las 10:00" [ref=f1e226]
                - button "2026-10-08 a las 11:00" [ref=f1e227]
                - button "2026-10-08 a las 12:00" [ref=f1e228]
                - button "2026-10-08 a las 13:00" [ref=f1e229]
                - button "2026-10-08 a las 14:00" [ref=f1e230]
                - button "2026-10-08 a las 15:00" [ref=f1e231]
                - button "2026-10-08 a las 16:00" [ref=f1e232]
                - button "2026-10-08 a las 17:00" [ref=f1e233]
                - button "2026-10-08 a las 18:00" [ref=f1e234]
                - button "2026-10-08 a las 19:00" [ref=f1e235]
                - button "2026-10-08 a las 20:00" [ref=f1e236]
                - button "2026-10-08 a las 21:00" [ref=f1e237]
                - button "2026-10-08 a las 22:00" [ref=f1e238]
            - region "2026-10-09" [ref=f1e239]:
              - generic [ref=f1e240]:
                - button "2026-10-09 a las 5:00" [ref=f1e241]
                - button "2026-10-09 a las 6:00" [ref=f1e242]
                - button "2026-10-09 a las 7:00" [ref=f1e243]
                - button "2026-10-09 a las 8:00" [ref=f1e244]
                - button "2026-10-09 a las 9:00" [ref=f1e245]
                - button "2026-10-09 a las 10:00" [ref=f1e246]
                - button "2026-10-09 a las 11:00" [ref=f1e247]
                - button "2026-10-09 a las 12:00" [ref=f1e248]
                - button "2026-10-09 a las 13:00" [ref=f1e249]
                - button "2026-10-09 a las 14:00" [ref=f1e250]
                - button "2026-10-09 a las 15:00" [ref=f1e251]
                - button "2026-10-09 a las 16:00" [ref=f1e252]
                - button "2026-10-09 a las 17:00" [ref=f1e253]
                - button "2026-10-09 a las 18:00" [ref=f1e254]
                - button "2026-10-09 a las 19:00" [ref=f1e255]
                - button "2026-10-09 a las 20:00" [ref=f1e256]
                - button "2026-10-09 a las 21:00" [ref=f1e257]
                - button "2026-10-09 a las 22:00" [ref=f1e258]
            - region "2026-10-10" [ref=f1e259]:
              - generic [ref=f1e260]:
                - button "2026-10-10 a las 5:00" [ref=f1e261]
                - button "2026-10-10 a las 6:00" [ref=f1e262]
                - button "2026-10-10 a las 7:00" [ref=f1e263]
                - button "2026-10-10 a las 8:00" [ref=f1e264]
                - button "2026-10-10 a las 9:00" [ref=f1e265]
                - button "2026-10-10 a las 10:00" [ref=f1e266]
                - button "2026-10-10 a las 11:00" [ref=f1e267]
                - button "2026-10-10 a las 12:00" [ref=f1e268]
                - button "2026-10-10 a las 13:00" [ref=f1e269]
                - button "2026-10-10 a las 14:00" [ref=f1e270]
                - button "2026-10-10 a las 15:00" [ref=f1e271]
                - button "2026-10-10 a las 16:00" [ref=f1e272]
                - button "2026-10-10 a las 17:00" [ref=f1e273]
                - button "2026-10-10 a las 18:00" [ref=f1e274]
                - button "2026-10-10 a las 19:00" [ref=f1e275]
                - button "2026-10-10 a las 20:00" [ref=f1e276]
                - button "2026-10-10 a las 21:00" [ref=f1e277]
                - button "2026-10-10 a las 22:00" [ref=f1e278]
            - region "2026-10-11" [ref=f1e279]:
              - generic [ref=f1e280]:
                - button "2026-10-11 a las 5:00" [ref=f1e281]
                - button "2026-10-11 a las 6:00" [ref=f1e282]
                - button "2026-10-11 a las 7:00" [ref=f1e283]
                - button "2026-10-11 a las 8:00" [ref=f1e284]
                - button "2026-10-11 a las 9:00" [ref=f1e285]
                - button "2026-10-11 a las 10:00" [ref=f1e286]
                - button "2026-10-11 a las 11:00" [ref=f1e287]
                - button "2026-10-11 a las 12:00" [ref=f1e288]
                - button "2026-10-11 a las 13:00" [ref=f1e289]
                - button "2026-10-11 a las 14:00" [ref=f1e290]
                - button "2026-10-11 a las 15:00" [ref=f1e291]
                - button "2026-10-11 a las 16:00" [ref=f1e292]
                - button "2026-10-11 a las 17:00" [ref=f1e293]
                - button "2026-10-11 a las 18:00" [ref=f1e294]
                - button "2026-10-11 a las 19:00" [ref=f1e295]
                - button "2026-10-11 a las 20:00" [ref=f1e296]
                - button "2026-10-11 a las 21:00" [ref=f1e297]
                - button "2026-10-11 a las 22:00" [ref=f1e298]
      - generic [ref=f1e299]:
        - region "Tareas sin completar" [ref=f1e300]:
          - generic [ref=f1e301]:
            - generic [ref=f1e302]:
              - heading "Tareas sin completar" [level=2] [ref=f1e303]
              - paragraph [ref=f1e304]: Bloques que todavía requieren seguimiento.
            - navigation "Paginación del listado" [ref=f1e305]:
              - generic [ref=f1e306]: Página 1/1
          - list [ref=f1e307]:
            - listitem [ref=f1e308]:
              - generic [ref=f1e309]:
                - strong [ref=f1e310]: Test Task E2E
                - generic [ref=f1e311]: lun, 05/10 · 05:00
              - generic [ref=f1e312]:
                - button "Finalizada" [ref=f1e313] [cursor=pointer]
                - button "No finalizada" [ref=f1e314] [cursor=pointer]
            - listitem [ref=f1e315]:
              - generic [ref=f1e316]:
                - strong [ref=f1e317]: Test Task E2E
                - generic [ref=f1e318]: lun, 05/10 · 05:00
              - generic [ref=f1e319]:
                - button "Finalizada" [ref=f1e320] [cursor=pointer]
                - button "No finalizada" [ref=f1e321] [cursor=pointer]
          - link "Ver todo" [ref=f1e323] [cursor=pointer]:
            - /url: /tasks
        - region "Hábitos sin completar" [ref=f1e324]:
          - generic [ref=f1e326]:
            - heading "Hábitos sin completar" [level=2] [ref=f1e327]
            - paragraph [ref=f1e328]: Bloques que todavía requieren seguimiento.
          - paragraph [ref=f1e329]: No hay elementos sin completar.
          - link "Ver todo" [ref=f1e331] [cursor=pointer]:
            - /url: /habits
      - region [ref=f1e332]:
        - generic [ref=f1e333]:
          - paragraph [ref=f1e334]: CIERRE DE SEMANA
          - heading "Mide lo que de verdad moviste" [level=2] [ref=f1e335]
        - generic [ref=f1e336]:
          - generic [ref=f1e337]:
            - text: ¿Qué aprendí esta semana?
            - textbox "¿Qué aprendí esta semana?" [ref=f1e338]:
              - /placeholder: Escribe una nota breve...
          - generic [ref=f1e339]:
            - text: ¿Qué construí?
            - textbox "¿Qué construí?" [ref=f1e340]:
              - /placeholder: Escribe una nota breve...
          - generic [ref=f1e341]:
            - text: ¿Qué mejoré?
            - textbox "¿Qué mejoré?" [ref=f1e342]:
              - /placeholder: Escribe una nota breve...
          - generic [ref=f1e343]:
            - text: ¿Qué hábito falló?
            - textbox "¿Qué hábito falló?" [ref=f1e344]:
              - /placeholder: Escribe una nota breve...
          - generic [ref=f1e345]:
            - text: ¿Qué hábito mantuve?
            - textbox "¿Qué hábito mantuve?" [ref=f1e346]:
              - /placeholder: Escribe una nota breve...
        - button "Guardar reflexión" [ref=f1e348] [cursor=pointer]
  - contentinfo [ref=f1e349]: Vektor © 2026
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const TEST_EMAIL = 'luismyname3193@gmail.com';
  4   | const TEST_PASSWORD = 'Guillermo43+';
  5   | 
  6   | test.describe('Weekly Planner - Manual Testing', () => {
  7   |   test.beforeEach(async ({ page }) => {
  8   |     await page.goto('http://127.0.0.1:5173/login');
  9   |     await page.fill('input[type="email"]', TEST_EMAIL);
  10  |     await page.fill('input[type="password"]', TEST_PASSWORD);
  11  |     await page.click('button[type="submit"]');
  12  |     await page.waitForURL('**/dashboard', { timeout: 10000 });
  13  |   });
  14  | 
  15  |   test('Desktop - Create task, complete task, check UI', async ({ page }) => {
  16  |     await page.setViewportSize({ width: 1280, height: 720 });
  17  |     await page.goto('http://127.0.0.1:5173/weekly-planner');
  18  |     
  19  |     // Wait for planner to load
  20  |     await page.waitForSelector('.weekly-grid', { timeout: 10000 });
  21  |     
  22  |     // Take screenshot - Desktop
  23  |     await page.screenshot({ path: 'test-results/weekly-planner-desktop.png', fullPage: true });
  24  |     
  25  |     // Click on a time slot (first column, 9am)
  26  |     const slot = page.locator('.weekly-hour-slot').first();
  27  |     await slot.click();
  28  |     
  29  |     // Modal should appear
  30  |     await expect(page.locator('.weekly-time-slot-modal')).toBeVisible({ timeout: 5000 });
  31  |     
  32  |     // Take screenshot of modal
  33  |     await page.screenshot({ path: 'test-results/weekly-planner-modal-desktop.png', fullPage: true });
  34  |     
  35  |     // Check all 5 tabs exist
  36  |     await expect(page.locator('button[role="tab"]')).toHaveCount(5);
  37  |     await expect(page.locator('button[role="tab"]:has-text("Tarea existente")')).toBeVisible();
  38  |     await expect(page.locator('button[role="tab"]:has-text("Hábito existente")')).toBeVisible();
  39  |     await expect(page.locator('button[role="tab"]:has-text("Nueva tarea")')).toBeVisible();
  40  |     await expect(page.locator('button[role="tab"]:has-text("Nuevo hábito")')).toBeVisible();
  41  |     await expect(page.locator('button[role="tab"]:has-text("Recordatorio")')).toBeVisible();
  42  |     
  43  |     // Create a new task
  44  |     await page.click('button[role="tab"]:has-text("Nueva tarea")');
  45  |     await page.fill('#task-title', 'Test Task E2E');
  46  |     await page.fill('#task-description', 'Test description');
  47  |     await page.selectOption('#task-priority', 'high');
  48  |     await page.selectOption('#task-duration', '30');
  49  |     await page.click('button[type="submit"]:has-text("Crear tarea y agendar")');
  50  |     
  51  |     // Wait for task to be created and modal to close
  52  |     await expect(page.locator('.weekly-time-slot-modal')).not.toBeVisible({ timeout: 5000 });
  53  |     
  54  |     // Verify task appears in grid
> 55  |     await expect(page.locator('.weekly-block:has-text("Test Task E2E")')).toBeVisible({ timeout: 5000 });
      |                                                                           ^ Error: expect(locator).toBeVisible() failed
  56  |     
  57  |     // Take screenshot after task creation
  58  |     await page.screenshot({ path: 'test-results/weekly-planner-task-created.png', fullPage: true });
  59  |     
  60  |     // Complete the task - click on the task block
  61  |     const taskBlock = page.locator('.weekly-block:has-text("Test Task E2E")');
  62  |     await taskBlock.click();
  63  |     
  64  |     // Status change modal should appear - select "completed"
  65  |     await page.click('button:has-text("Finalizada")');
  66  |     
  67  |     // Wait for status to update
  68  |     await page.waitForTimeout(1000);
  69  |     
  70  |     // Take screenshot after completion
  71  |     await page.screenshot({ path: 'test-results/weekly-planner-task-completed.png', fullPage: true });
  72  |     
  73  |     console.log('✅ Desktop test passed');
  74  |   });
  75  | 
  76  |   test('Tablet - Click time slot opens modal', async ({ page }) => {
  77  |     await page.setViewportSize({ width: 768, height: 1024 });
  78  |     await page.goto('http://127.0.0.1:5173/weekly-planner');
  79  |     
  80  |     await page.waitForSelector('.weekly-grid', { timeout: 10000 });
  81  |     
  82  |     await page.screenshot({ path: 'test-results/weekly-planner-tablet.png', fullPage: true });
  83  |     
  84  |     const slot = page.locator('.weekly-hour-slot').first();
  85  |     await slot.click();
  86  |     
  87  |     await expect(page.locator('.weekly-time-slot-modal')).toBeVisible({ timeout: 5000 });
  88  |     await expect(page.locator('button[role="tab"]')).toHaveCount(5);
  89  |     
  90  |     await page.screenshot({ path: 'test-results/weekly-planner-modal-tablet.png', fullPage: true });
  91  |     
  92  |     await page.click('button:has-text("Cancelar")');
  93  |     
  94  |     console.log('✅ Tablet test passed');
  95  |   });
  96  | 
  97  |   test('Mobile - Click time slot opens modal', async ({ page }) => {
  98  |     await page.setViewportSize({ width: 375, height: 667 });
  99  |     await page.goto('http://127.0.0.1:5173/weekly-planner');
  100 |     
  101 |     await page.waitForSelector('.weekly-grid', { timeout: 10000 });
  102 |     
  103 |     await page.screenshot({ path: 'test-results/weekly-planner-mobile.png', fullPage: true });
  104 |     
  105 |     const slot = page.locator('.weekly-hour-slot').first();
  106 |     await slot.click();
  107 |     
  108 |     await expect(page.locator('.weekly-time-slot-modal')).toBeVisible({ timeout: 5000 });
  109 |     await expect(page.locator('button[role="tab"]')).toHaveCount(5);
  110 |     
  111 |     await page.screenshot({ path: 'test-results/weekly-planner-modal-mobile.png', fullPage: true });
  112 |     
  113 |     await page.click('button:has-text("Cancelar")');
  114 |     
  115 |     console.log('✅ Mobile test passed');
  116 |   });
  117 | 
  118 |   test('Theme toggle - Switch to light mode', async ({ page }) => {
  119 |     await page.setViewportSize({ width: 1280, height: 720 });
  120 |     await page.goto('http://127.0.0.1:5173/settings');
  121 |     
  122 |     await page.waitForSelector('select', { timeout: 5000 });
  123 |     
  124 |     // Get current theme
  125 |     const htmlTheme = await page.getAttribute('html', 'data-theme');
  126 |     console.log('Initial theme:', htmlTheme);
  127 |     
  128 |     // Toggle theme
  129 |     const themeSelect = page.locator('select');
  130 |     await themeSelect.selectOption('light');
  131 |     
  132 |     const htmlThemeLight = await page.getAttribute('html', 'data-theme');
  133 |     expect(htmlThemeLight).toBe('light');
  134 |     console.log('Theme switched to:', htmlThemeLight);
  135 |     
  136 |     // Switch back to dark
  137 |     await themeSelect.selectOption('dark');
  138 |     const htmlThemeDark = await page.getAttribute('html', 'data-theme');
  139 |     expect(htmlThemeDark).toBe('dark');
  140 |     console.log('Theme switched back to:', htmlThemeDark);
  141 |   });
  142 | 
  143 |   test('Console errors check', async ({ page }) => {
  144 |     const errors = [];
  145 |     page.on('console', msg => {
  146 |       if (msg.type() === 'error') {
  147 |         errors.push(msg.text());
  148 |       }
  149 |     });
  150 |     
  151 |     await page.setViewportSize({ width: 1280, height: 720 });
  152 |     await page.goto('http://127.0.0.1:5173/weekly-planner');
  153 |     await page.waitForSelector('.weekly-grid', { timeout: 10000 });
  154 |     
  155 |     // Click time slot
```