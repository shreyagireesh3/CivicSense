# CivicSense Visual & UX Redesign Plan

## Overview

Complete visual and interaction redesign of `dashboard/src/App.jsx` and
`dashboard/src/index.css`. The dark cyberpunk aesthetic is replaced with a warm
cream/off-white premium SaaS design language. The single-page scroll layout becomes a
four-section application shell with functional navigation. All analytical data, API
endpoints, and component logic are preserved exactly. No files outside
`dashboard/src/App.jsx` and `dashboard/src/index.css` are modified.

**Scope:** `dashboard/src/App.jsx` (full rewrite of styling and layout) +
`dashboard/src/index.css` (new design tokens and base styles)

**Not in scope:** Any Python notebook, any backend file, any JSON artifact, `package.json`,
`vite.config.js`, `.oxlintrc.json`, test files, `README.md`.

---

## Design Language Reference

### Color system

| Role | Token name | Value |
|------|-----------|-------|
| Page background | `--bg-base` | `#faf9f6` (warm cream) |
| Surface (card) | `--bg-surface` | `#ffffff` |
| Surface subtle | `--bg-subtle` | `#f5f3ef` |
| Border default | `--border` | `#e8e4dd` |
| Border strong | `--border-strong` | `#d4cfc7` |
| Text primary | `--text-primary` | `#1a1917` (near-black warm) |
| Text secondary | `--text-secondary` | `#6b6560` |
| Text muted | `--text-muted` | `#a09890` |
| Lavender accent | `--lavender` | `#c4b5fd` / bg `#f3f0ff` |
| Blush accent | `--blush` | `#fda4af` / bg `#fff1f2` |
| Mint accent | `--mint` | `#6ee7b7` / bg `#f0fdf9` |
| Powder blue accent | `--blue` | `#93c5fd` / bg `#eff6ff` |
| Butter yellow accent | `--butter` | `#fde68a` / bg `#fffbeb` |
| Sidebar bg | `--sidebar-bg` | `#f0ede8` |
| Active nav | `--nav-active` | `#1a1917` |
| Nav hover | `--nav-hover` | `#f5f3ef` |

### Typography

- Font: Inter (already loaded in current CSS) — unchanged
- Page title: `text-2xl font-bold text-[#1a1917]`
- Section heading: `text-lg font-semibold text-[#1a1917]`
- Card label (ALL CAPS): `text-[10px] font-semibold tracking-[0.14em] text-[#a09890]`
- Body: `text-sm text-[#6b6560]`
- KPI value: `text-3xl font-bold text-[#1a1917]`

### Card style

- `bg-white rounded-2xl border border-[#e8e4dd] shadow-sm`
- Inner padding: `p-5` or `p-6`
- No glassmorphism, no dark overlay
- Hover: `hover:shadow-md transition-shadow`

### Accent usage rules

- Use lavender for Analytics / category-related sections
- Use mint/sage for Command Centre KPIs (operational/closure)
- Use powder blue for ward/geographic sections
- Use butter yellow for Forecasts
- Use blush pink for warnings / planning signals
- Use charcoal text consistently — never white text on white cards

### Chart style (light theme)

- Grid: `stroke="#e8e4dd"` (soft warm gray)
- Axis text: `fill="#a09890"` 
- Stroke for lines: bold, colorful but controlled
- Chart fills: soft pastel gradients (low opacity 0.15–0.25)
- Tooltip: white card with border, charcoal text, warm shadow

---

## Application Shell Layout

The current single-column scroll becomes an application shell:

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (240px fixed left, full height)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Logo + wordmark                                      │   │
│  │ ─────────────────────                                │   │
│  │ ○  Command Centre    ← active state (filled pill)    │   │
│  │ ○  Analytics                                         │   │
│  │ ○  Forecasts                                         │   │
│  │ ○  Insights                                          │   │
│  │                                                      │   │
│  │ ─────────────────────                                │   │
│  │ Dataset coverage  1 Jan – 19 Jun 2025                │   │
│  │ BBMP · 2025 · v1.0                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  MAIN CONTENT AREA (fills remaining width)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Page heading + section subtitle                      │  │
│  │  ─────────────────────────────────────────────────── │  │
│  │  Content grid (varies per section)                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

On mobile (< md breakpoint): sidebar collapses to a horizontal tab bar pinned at the top.

---

## Sub-Task 1 — CSS Foundation

**Status:** [ ] pending

### Intent

Replace the dark-mode CSS in `index.css` with the warm light-mode design tokens and base
styles. This is the prerequisite for every visual change in `App.jsx`.

### Expected Outcomes

- Page background is warm cream `#faf9f6`
- Body text is charcoal `#1a1917`
- Scrollbar is styled to match (light, thin)
- No dark radial gradient backgrounds
- Font family preserved (Inter)
- Tailwind import unchanged

### Todo List

1. Remove the `color: #e8edf5` and `background: #070a0f` `:root` declarations.
2. Remove the `body` radial-gradient background rule.
3. Add light-mode base rules:
   ```css
   :root {
     font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
     font-synthesis: none;
     text-rendering: optimizeLegibility;
   }
   body {
     margin: 0;
     min-width: 320px;
     min-height: 100vh;
     background-color: #faf9f6;
     color: #1a1917;
   }
   ```
4. Add a custom scrollbar style:
   ```css
   ::-webkit-scrollbar { width: 6px; }
   ::-webkit-scrollbar-track { background: #f0ede8; }
   ::-webkit-scrollbar-thumb { background: #d4cfc7; border-radius: 3px; }
   ```
5. Add a `select` reset that lets the dropdown inherit the light theme without browser
   default dark styling:
   ```css
   select option { background: #ffffff; color: #1a1917; }
   ```

### Relevant Context

- `dashboard/src/index.css` current content: `@import "tailwindcss"` + dark `:root` +
  dark `body` background. Full replacement.

---

## Sub-Task 2 — App Shell, Navigation, and State

**Status:** [ ] pending

### Intent

Replace the current top `Header` component and single-page scroll with an application
shell: fixed sidebar on desktop, tab bar on mobile, and a `useState("command")` controlling
which section is active. This is the structural foundation that all section sub-tasks build
on.

### Expected Outcomes

- `App()` renders a two-column shell: `<Sidebar>` + `<main>` content area.
- A new `const [activeSection, setActiveSection] = useState("command")` controls which
  section is visible.
- The `Header` function is removed.
- A new `Sidebar({ activeSection, setActiveSection, metadata })` component is added.
- The ambient background blob divs (`pointer-events-none fixed inset-0…`) are removed.
- The outer `<div className="min-h-screen bg-[#070a0f] text-white">` becomes
  `<div className="flex min-h-screen bg-[#faf9f6] text-[#1a1917]">`.
- The `<main>` area renders `{activeSection === "command" && <CommandCentreSection … />}`,
  etc., one for each of the four sections.
- The `LoadingScreen` and `ApiErrorScreen` backgrounds update to the light theme
  (`bg-[#faf9f6]`, charcoal text, blush/mint icon backgrounds).

### Todo List

1. Add `const [activeSection, setActiveSection] = useState("command");` to `App()`.
   Keep all existing state and `loadData` unchanged.

2. Change the outer wrapper div's className from dark to:
   `"flex min-h-screen bg-[#faf9f6] text-[#1a1917]"`

3. Remove the ambient blob divs (lines ~215–221).

4. Replace `<Header />` call with `<Sidebar activeSection={activeSection} setActiveSection={setActiveSection} metadata={data.metadata} />`.

5. Replace the `<main>` block content with four conditional renders:
   ```jsx
   <main className="flex-1 min-h-screen overflow-y-auto">
     {activeSection === "command"   && <CommandCentreSection … />}
     {activeSection === "analytics" && <AnalyticsSection … />}
     {activeSection === "forecasts" && <ForecastsSection … />}
     {activeSection === "insights"  && <InsightsSection … />}
   </main>
   ```
   Pass all required data props into each section component.

6. Remove the old `Header` function body.

7. Add `Sidebar({ activeSection, setActiveSection, metadata })` function:
   - Background: `bg-[#f0ede8] border-r border-[#e8e4dd]`
   - Width: `w-[240px] shrink-0 hidden md:flex flex-col`
   - Logo block: Building2 icon in a warm white rounded square + "CIVICSENSE" wordmark in
     charcoal + "Urban Intelligence" subtitle in muted
   - Navigation items: array of `{ id, label, icon }` for the four sections
   - Active state: filled pill `bg-[#1a1917] text-white rounded-xl px-3 py-2`
   - Inactive state: `text-[#6b6560] hover:bg-[#e8e4dd] rounded-xl px-3 py-2`
   - Bottom metadata block: dataset coverage dates (from `metadata` prop), version string
   - Mobile: a `<nav>` with `flex md:hidden` for the horizontal tab bar pinned to top

8. Update `LoadingScreen` and `ApiErrorScreen`:
   - Background: `bg-[#faf9f6]`
   - Icon container: mint bg `bg-[#f0fdf9]` with `border-[#a7f3d0]` (LoadingScreen) /
     blush bg `bg-[#fff1f2]` with `border-[#fda4af]` (ApiErrorScreen)
   - Text: `text-[#1a1917]` primary, `text-[#6b6560]` secondary
   - Retry button: `bg-[#1a1917] text-white hover:bg-[#2d2a26]`

### Relevant Context

- Current `Header` function: lines 744–803 of `App.jsx` — remove entirely.
- Current ambient blobs: lines 215–221 of `App.jsx` — remove.
- `data.metadata?.date_min` / `date_max` — pass as `metadata={data.metadata}` to Sidebar.
- The existing `selectedCategory` / `setSelectedCategory` state moves to `App()` unchanged.
- No routing library — section switching is pure `useState`.

---

## Sub-Task 3 — Command Centre Section

**Status:** [ ] pending

### Intent

Redesign the command centre content using the light design language. This replaces the
current `Hero` + four `MetricCard`s + monthly AreaChart + category BarChart + ward list +
status PieChart with a coherent executive overview page.

### Expected Outcomes

- Page heading "Command Centre" with subtitle.
- Four KPI cards in a 2×2 or 4-column grid, each with a colored accent chip.
- Monthly demand trend (AreaChart) in a wide card.
- Category concentration (horizontal BarChart) in a narrower card beside it.
- Top wards list card (with proportion bars).
- Operational status card (PieChart + legend grid).
- Dataset freshness line at bottom (replaces the floating `<p>` that was appended after the
  footer).
- All existing data bindings (`totalGrievances`, `closureRate`, `wardCount`,
  `data.forecastSummary`, `data.monthly`, `data.categories`, `data.wards`, `data.statuses`)
  are preserved exactly.

### Todo List

1. Create a `CommandCentreSection({ totalGrievances, closureRate, wardCount, forecastSummary, monthly, categories, wards, statuses, metadata })` function component.

2. **Page heading block:**
   ```jsx
   <div className="border-b border-[#e8e4dd] px-8 py-6">
     <h1 className="text-2xl font-bold text-[#1a1917]">Command Centre</h1>
     <p className="mt-1 text-sm text-[#6b6560]">Executive overview of BBMP grievance intelligence</p>
   </div>
   ```

3. **KPI grid** — four cards in `grid grid-cols-2 xl:grid-cols-4 gap-4 px-8 py-6`:
   Redesign `MetricCard` to light theme:
   - Card: `bg-white rounded-2xl border border-[#e8e4dd] shadow-sm p-5`
   - Label: `text-[10px] font-semibold tracking-[0.14em] text-[#a09890]` (uppercase)
   - Value: `text-3xl font-bold text-[#1a1917] mt-3`
   - Sub: `text-xs text-[#a09890] mt-1`
   - Icon badge — four accent variants (mint, lavender, powder blue, butter):
     - Total Grievances: mint `bg-[#f0fdf9] text-[#059669] border-[#a7f3d0]`
     - Closure Rate: lavender `bg-[#f3f0ff] text-[#7c3aed] border-[#c4b5fd]`
     - Ward Coverage: powder blue `bg-[#eff6ff] text-[#2563eb] border-[#93c5fd]`
     - Forecast/Day: butter `bg-[#fffbeb] text-[#d97706] border-[#fde68a]`

4. **Analytics charts row** — `grid xl:grid-cols-[1.7fr_1fr] gap-5 px-8 pb-6`:
   Redesign `Panel` to light theme:
   - Card: `bg-white rounded-2xl border border-[#e8e4dd] shadow-sm p-6`
   - Title: `text-sm font-semibold text-[#1a1917]`
   - Subtitle: `text-xs text-[#a09890]`
   - Badge: `bg-[#f5f3ef] text-[#6b6560] text-[9px] tracking-[0.14em] rounded-full px-2.5 py-1`
   - Icon: colored per section (mint for activity, lavender for categories)
   Update chart colors:
   - Monthly AreaChart: stroke `#059669` (mint), gradient fill from `#059669` at 0.15 to transparent
   - Category BarChart: fill `#7c3aed` (lavender), grid stroke `#e8e4dd`, axis `#a09890`
   - CartesianGrid: `stroke="#e8e4dd"`
   - XAxis/YAxis: `stroke="#a09890"`

5. **Wards + Status row** — `grid xl:grid-cols-[1.15fr_0.85fr] gap-5 px-8 pb-6`:
   - Ward list items: `bg-[#f5f3ef] rounded-xl` with rank badge in `bg-[#e8e4dd]`
   - Ward bar: `bg-[#93c5fd]` (powder blue)
   - Ward count: `text-[#1a1917] font-semibold`
   - Status PieChart Cell colors: `["#c4b5fd", "#6ee7b7", "#93c5fd", "#fde68a", "#fda4af"]`
   - Status legend chips: matching pastel backgrounds

6. **Dataset freshness footer** — small `text-xs text-[#a09890]` block inside the section
   (replaces the floating `<p>` at the bottom of the old App return):
   ```jsx
   {metadata?.date_min && (
     <p className="px-8 pb-6 text-xs text-[#a09890]">
       Dataset coverage: {…} – {…}
     </p>
   )}
   ```

7. Remove the old `Hero`, `HeroPill` component functions — their content is merged into the
   Command Centre page heading and KPI grid. The "grievances analysed" and "forecast/day"
   pills become the KPI card values, not separate components.

### Relevant Context

- Current `Hero` component: lines 808–849 — remove.
- Current `HeroPill`: lines 872–927 — remove.
- Current `MetricCard`: lines 934–974 — redesign in place (keep function name, change classes).
- Current `Panel`: lines 978–1006 — redesign in place (keep function name, change classes).
- AreaChart gradient id `"trendGradient"` — keep id, change colors.
- PieChart Cell colors array — change to pastels.
- `data.metadata` freshness — include in section, remove old floating `<p>`.

---

## Sub-Task 4 — Analytics Section

**Status:** [ ] pending

### Intent

The Analytics section becomes a dedicated full-page workspace. The existing
`CategoryExplorer` component is the primary element. It is redesigned to the light theme
and given more visual prominence.

### Expected Outcomes

- Page heading "Analytics" with subtitle.
- A styled category selector at the top (replaces the plain dark dropdown).
- Four summary stat chips (`ExplorerStat`) in a horizontal row.
- Two-column grid: subcategory ranked list + ward ranked list.
- Monthly pattern line chart in a card.
- Status distribution horizontal bar chart in a card.
- All data bindings from `CategoryExplorer` preserved exactly.

### Todo List

1. Create `AnalyticsSection({ categories, categorySubcategory, categoryWard, categoryMonth, categoryStatus, selectedCategory, setSelectedCategory })`.

2. **Page heading block** — same structure as Command Centre heading.

3. Redesign the `CategoryExplorer` function in-place (keep function name and all logic):
   - Outer container: `bg-[#faf9f6]` (no card wrapper — the section is the page)
   - Remove the `rounded-2xl border border-cyan-300/10 bg-white/[0.025]` section wrapper
   - Category selector: styled native `<select>` with `bg-white border border-[#e8e4dd] rounded-xl px-4 py-2.5 text-sm text-[#1a1917] shadow-sm`
   - Section label: `text-[10px] tracking-[0.14em] text-[#a09890]` with lavender `BarChart3` icon

4. Redesign `ExplorerStat`:
   - Card: `bg-white rounded-2xl border border-[#e8e4dd] shadow-sm p-4`
   - Label: `text-[9px] font-semibold tracking-[0.15em] text-[#a09890]`
   - Value: `text-2xl font-bold text-[#1a1917]` or `text-sm font-semibold` if `small`

5. Redesign `ExplorerList`:
   - Container: `bg-white rounded-2xl border border-[#e8e4dd] shadow-sm p-5`
   - Title: `text-xs font-semibold text-[#1a1917] mb-4`
   - Rank badge: `bg-[#f5f3ef] text-[#a09890] rounded-md`
   - Name text: `text-[#1a1917]`
   - Count: `text-[#7c3aed] font-medium` (lavender)
   - Bar track: `bg-[#f5f3ef]`
   - Bar fill: `bg-[#c4b5fd]` (lavender)

6. Monthly line chart in Analytics:
   - Card: `bg-white rounded-2xl border border-[#e8e4dd] shadow-sm p-5`
   - Line stroke: `#7c3aed` (lavender)
   - Dot: filled lavender
   - Grid: `stroke="#e8e4dd"`

7. Status distribution bar list:
   - Card: `bg-white rounded-2xl border border-[#e8e4dd] shadow-sm p-5`
   - Bar fill: `bg-[#c4b5fd]` (lavender)
   - Track: `bg-[#f3f0ff]`

### Relevant Context

- `CategoryExplorer` function: lines 1010–1265 — preserve all logic, change all classes.
- `ExplorerStat`: lines 1270–1284 — preserve props, change classes.
- `ExplorerList`: lines 1288–1329 — preserve props and logic, change classes.
- The dark select background `bg-[#0b1018]` must change to `bg-white`.

---

## Sub-Task 5 — Forecasts Section

**Status:** [ ] pending

### Intent

The Forecasts section becomes a dedicated workspace. The existing `ForecastIntelligence`
and `PerformanceMetric` components are redesigned to the light theme with butter yellow as
the primary accent.

### Expected Outcomes

- Page heading "Forecasts" with subtitle.
- Hero KPI row: Forecast Total, Daily Average, Horizon Days — three compact cards.
- Full-width 14-day forecast area chart (butter yellow).
- Model evaluation card: MAE, RMSE as `PerformanceMetric` components, improvement %, R².
- Interpretation / planning-signal disclaimer card (blush pink accent).
- All data bindings from `ForecastIntelligence` preserved exactly.

### Todo List

1. Create `ForecastsSection({ evaluation, forecast, summary })`.

2. **Page heading block** — same pattern.

3. **Forecast KPI row** — three cards in `grid grid-cols-3 gap-4 px-8 py-6`:
   - "Forecast Total": value from `summary?.forecast_total` — butter yellow accent
   - "Daily Average": value from `summary?.forecast_average` — butter yellow
   - "Horizon": `14 days` — powder blue accent

4. Redesign `ForecastIntelligence` in-place:
   - Remove the current outer `section` / `rounded-2xl border border-amber-300/10` wrapper
   - The section is the page now
   - Forecast area chart card: `bg-white rounded-2xl border border-[#e8e4dd] shadow-sm p-6`
   - Chart stroke: `#d97706` (amber/butter), gradient fill from `#fde68a` at 0.2 to transparent
   - Grid: `stroke="#e8e4dd"`
   - The "NEXT 14 DAYS" summary badge: butter card `bg-[#fffbeb] border-[#fde68a]`

5. Redesign `PerformanceMetric` in-place:
   - Container: `bg-white rounded-2xl border border-[#e8e4dd] shadow-sm p-5`
   - Label: `text-[10px] tracking-[0.12em] text-[#a09890]`
   - Model value: `text-sm font-bold text-[#d97706]` (butter)
   - Baseline value: `text-sm font-semibold text-[#a09890]`
   - Improvement: `text-[#059669]` (mint green)

6. **Model evaluation panel** (redesigned from the dark inner card):
   - Card: `bg-white rounded-2xl border border-[#e8e4dd] shadow-sm p-6`
   - Model name: butter accent chip `bg-[#fffbeb] text-[#d97706]`
   - Improvement % block: mint card `bg-[#f0fdf9] border-[#a7f3d0]`

7. **Planning-signal disclaimer** (redesigned from the interpretation block):
   - Card: `bg-[#fff1f2] border border-[#fda4af] rounded-2xl p-5`
   - Text: `text-[#9f1239]` for heading, `text-[#6b6560]` for body
   - Icon: blush `Radio` or `AlertTriangle` icon

### Relevant Context

- `ForecastIntelligence`: lines 1515–1806 — preserve all logic and props.
- `PerformanceMetric`: lines 1813–1872 — preserve logic, change classes.
- Forecast gradient id `"forecastGradient"` — keep id, change colors.
- `evaluation?.interpretation` text — displayed in the disclaimer card.

---

## Sub-Task 6 — Insights Section

**Status:** [ ] pending

### Intent

The Insights section becomes a full-page workspace that replaces the cramped 3-column card
grid with an editorial layout. Each insight card expands to show observation, insight,
hypothesis, recommendation, and evidence fields from the API when present (falling back to
the `buildInsights` computed structure).

### Expected Outcomes

- Page heading "Insights" with subtitle.
- Six insight cards in a responsive grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`).
- Each card has a numbered badge, colored accent strip, title, body, and action.
- Cards use distinct pastel top-border accents cycling through the palette.
- Hover state: subtle shadow lift (`hover:shadow-md`).
- The `buildInsights` function and `InsightCard` component logic are preserved — only
  classes change.

### Todo List

1. Create `InsightsSection({ data, totalGrievances })`.

2. **Page heading block** — same pattern as other sections, with BrainCircuit icon accent.

3. Redesign `InsightCard` in-place:
   - Container: `bg-white rounded-2xl border border-[#e8e4dd] shadow-sm p-6 hover:shadow-md transition-shadow`
   - Top accent: a `4px` top border in a cycling color from `["#c4b5fd", "#6ee7b7", "#93c5fd", "#fde68a", "#fda4af", "#c4b5fd"]` using `index % 6`
     — achieved with `style={{ borderTop: `4px solid ${accentColors[index % 6]}` }}`
   - Numbered badge: `bg-[#f5f3ef] text-[#6b6560] rounded-lg px-2 py-1 text-[10px] font-semibold tracking-[0.14em]`
   - Title: `text-sm font-bold text-[#1a1917] mt-3 leading-5`
   - Body: `text-xs text-[#6b6560] mt-2 leading-6`
   - Action divider: `border-t border-[#e8e4dd] mt-4 pt-3`
   - Action row: lavender `ChevronRight` icon + `text-[11px] text-[#7c3aed] leading-5`
   - Remove the `ArrowUpRight` icon (replaced by the accent color strip)

4. Note: `buildInsights` reads from `data.categories`, `data.wards`, etc. — no changes
   to the function body, only to the card rendering.

### Relevant Context

- `InsightCard`: lines 1879–1935 — change classes only.
- `buildInsights`: lines 1988–2119 — no changes.
- Six insights are rendered; six accent colors cycle cleanly.

---

## Sub-Task 7 — Chart Tooltip and Shared Utilities

**Status:** [ ] pending

### Intent

The `ChartTooltip` component must be updated to the light theme so it doesn't render a
dark popup over the cream background. `formatNumber` is unchanged.

### Expected Outcomes

- Tooltip: white card with warm border and soft shadow, charcoal text.
- No dark `#0b1018` background.

### Todo List

1. Redesign `ChartTooltip` in-place:
   - Container: `bg-white border border-[#e8e4dd] rounded-xl px-3 py-2 shadow-lg`
   - Label: `text-[10px] text-[#a09890] mb-1`
   - Value text: `text-xs font-semibold text-[#1a1917]`

2. No changes to `formatNumber`.

### Relevant Context

- `ChartTooltip`: lines 1942–1981 — change classes only.

---

## Sub-Task 8 — Responsive and Interaction Polish

**Status:** [ ] pending

### Intent

Add the interactive refinements described in the brief: hover states throughout, mobile
nav bar, loading/error screens updated to light theme, empty states, and
accessibility-appropriate focus styles.

### Expected Outcomes

- Mobile tab bar (four nav items in a row) renders when sidebar is hidden.
- Every clickable card / list item has a `hover:` state.
- The category select has `focus:ring-2 focus:ring-[#c4b5fd]` focus style.
- Ward list items have `hover:bg-[#f5f3ef]` transition.
- `LoadingScreen` and `ApiErrorScreen` use the new light theme colors.
- Empty states for charts show a minimal placeholder (`"No data available"` in muted text)
  when arrays are empty, consistent across all sections.

### Todo List

1. **Mobile tab bar** inside `Sidebar`: when `md` breakpoint is not met, render a
   `<nav className="fixed bottom-0 left-0 right-0 flex md:hidden bg-white border-t border-[#e8e4dd] z-20">` 
   with four tab items. (Alternative: pin it to the top as a second nav approach — choose
   based on which feels more natural for a dashboard product.)

2. Add `hover:shadow-md transition-shadow` to all `bg-white rounded-2xl` card containers.

3. Add `transition-colors` to all interactive list items in ward list and explorer lists.

4. Add `focus:outline-none focus:ring-2 focus:ring-[#c4b5fd]` to the category `<select>`.

5. For empty arrays passed to Recharts, add a guard that renders:
   ```jsx
   {(!array || array.length === 0) ? (
     <div className="flex h-full items-center justify-center">
       <p className="text-xs text-[#a09890]">No data available</p>
     </div>
   ) : (
     <ResponsiveContainer …>…</ResponsiveContainer>
   )}
   ```
   Apply to: monthly AreaChart, category BarChart, ward list, forecast AreaChart,
   category monthly LineChart.

6. Update `LoadingScreen` to light theme (per Sub-Task 2 Todo item 8).
7. Update `ApiErrorScreen` to light theme (per Sub-Task 2 Todo item 8).

### Relevant Context

- All changes are class-level inside existing components — no new components added here.
- The mobile nav must set `activeSection` state the same way the sidebar does.

---

## Execution Order and Dependencies

```
Sub-Task 1 (CSS tokens)
       ↓
Sub-Task 2 (App shell + navigation)
       ↓  ↓  ↓  ↓
      ST3 ST4 ST5 ST6  ← sections can be done in any order once shell is in place
       ↓
Sub-Task 7 (Tooltip + utilities)
       ↓
Sub-Task 8 (Responsive polish)
```

Sub-Tasks 3–6 are independent of each other and can be implemented sequentially in any
order. Sub-Task 7 is a small cleanup that should happen after the section work is complete.

---

## What Is Preserved Exactly (No Changes)

| Item | Preserved how |
|------|---------------|
| All `data.*` state bindings | All prop names identical — only className strings change |
| `loadData()` and all `useEffect` logic | Unchanged |
| `useMemo` metrics computation | Unchanged |
| `buildInsights()` function body | Unchanged |
| `formatNumber()` | Unchanged |
| All Recharts components and data keys | Unchanged (only colors/stroke values change) |
| `CategoryExplorer` data logic | All filter/sort/slice logic unchanged |
| `ForecastIntelligence` data logic | All null-guard logic unchanged |
| `PerformanceMetric` improvement calculation | Unchanged |
| `REQUIRED_KEYS` and error handling | Unchanged |
| `API_BASE` env var | Unchanged |
| `selectedCategory` state | Unchanged |

---

## Risk Register

| Risk | Sub-Task | Mitigation |
|------|----------|------------|
| Tailwind v4 with arbitrary values — some hex values may need `bg-[#hex]` syntax confirmed | All | Tailwind v4 supports arbitrary value syntax — use `bg-[#faf9f6]` etc. throughout |
| `select` option styling is browser-controlled | ST4 | The `select option` CSS rule in `index.css` (Sub-Task 1) handles this; native selects on light-mode browsers will render correctly |
| Mobile bottom nav overlapping content | ST8 | Add `pb-16 md:pb-0` to the main content area when mobile nav is present |
| Chart tooltip z-index over cards | ST7 | Recharts tooltips render in a portal — no z-index conflict |
| `text-[#1a1917]` on `bg-[#faf9f6]` contrast ratio | All | #1a1917 on #faf9f6 is ~16:1 contrast — well above WCAG AA |
| oxlint after the rewrite | Final | Run `npm run lint` after ST8; the rewrite does not add new patterns beyond existing component structure |
| Build bundle size | Final | No new dependencies — bundle size unchanged |
