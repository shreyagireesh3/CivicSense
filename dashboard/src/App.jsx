import { useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Layers,
  MapPin,
  MessageSquare,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
} from "lucide-react";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";


/* =========================================================
   CONSTANTS
========================================================= */

const API_BASE =
  import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000/api";

const REQUIRED_KEYS = new Set([
  "monthly",
  "categories",
  "wards",
  "metrics",
  "statuses",
]);

// Pastel accent palette — spec colours: visible card backgrounds + strong text
const PASTELS = {
  mint:    { bg: "#D9F7EA", border: "#6ee7b7", text: "#059669", strong: "#047857", card: "#D9F7EA" },
  lavender:{ bg: "#E9DEFF", border: "#c4b5fd", text: "#7c3aed", strong: "#6d28d9", card: "#E9DEFF" },
  blue:    { bg: "#DCEEFF", border: "#93c5fd", text: "#2563eb", strong: "#1d4ed8", card: "#DCEEFF" },
  butter:  { bg: "#FFF0B8", border: "#fde68a", text: "#d97706", strong: "#b45309", card: "#FFF0B8" },
  blush:   { bg: "#FFDDE8", border: "#fda4af", text: "#e11d48", strong: "#9f1239", card: "#FFDDE8" },
};

// Richer pastel colors for insight card accents
const INSIGHT_ACCENT_COLORS = [
  "#8B5CF6", // lavender strong
  "#10B981", // mint strong
  "#3B82F6", // blue strong
  "#F59E0B", // butter strong
  "#F472B6", // pink strong
  "#8B5CF6", // lavender repeat
];

// Insight card background tints to match
const INSIGHT_CARD_BG = [
  "#E9DEFF", // lavender
  "#D9F7EA", // mint
  "#DCEEFF", // blue
  "#FFF0B8", // butter
  "#FFDDE8", // pink
  "#E9DEFF", // lavender repeat
];

const STATUS_PIE_COLORS = ["#8B5CF6", "#10B981", "#3B82F6", "#F59E0B", "#F472B6"];

// Multi-color palette for the category bar chart
const CATEGORY_BAR_COLORS = ["#8B5CF6","#3B82F6","#10B981","#F59E0B","#F472B6","#6366f1"];

const NAV_ITEMS = [
  { id: "command",   label: "Command Centre", icon: Activity },
  { id: "analytics", label: "Analytics",      icon: BarChart3 },
  { id: "forecasts", label: "Forecasts",      icon: TrendingUp },
  { id: "insights",  label: "Insights",       icon: BrainCircuit },
  { id: "desk",      label: "Service Desk",   icon: ClipboardList },
];

const DESK_API = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000/api";

const DESK_STATUSES = ["Received", "Under Review", "Action Taken", "Resolved", "Reopened"];

const STATUS_COLORS = {
  "Received":     PASTELS.blue,
  "Under Review": PASTELS.butter,
  "Action Taken": PASTELS.lavender,
  "Resolved":     PASTELS.mint,
  "Reopened":     PASTELS.blush,
};


/* =========================================================
   APP ROOT
========================================================= */

function App() {
  const [data, setData] = useState({
    monthly: [],
    categories: [],
    wards: [],
    metrics: [],
    statuses: [],
    forecasts: [],
    insights: [],
    categorySubcategory: [],
    categoryWard: [],
    categoryMonth: [],
    categoryStatus: [],
    forecastEvaluation: {},
    forecastDashboard: [],
    forecastSummary: {},
    metadata: null,
  });

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [activeSection, setActiveSection] = useState("command");
  const [selectedCategory, setSelectedCategory] = useState("");

  const loadData = () => {
    setLoading(true);
    setApiError(false);

    const endpoints = [
      ["monthly",            "/monthly"],
      ["categories",         "/categories"],
      ["wards",              "/wards"],
      ["metrics",            "/summary"],
      ["statuses",           "/status"],
      ["forecasts",          "/forecast"],
      ["insights",           "/insights"],
      ["categorySubcategory","/category/subcategories"],
      ["categoryWard",       "/category/wards"],
      ["categoryMonth",      "/category/monthly"],
      ["categoryStatus",     "/category/status"],
      ["forecastEvaluation", "/forecast/evaluation"],
      ["forecastSummary",    "/forecast/summary"],
      ["metadata",           "/metadata"],
    ];

    Promise.all(
      endpoints.map(async ([key, endpoint]) => {
        try {
          const response = await fetch(
            `${API_BASE}${endpoint}`,
            { signal: AbortSignal.timeout(10_000) }
          );
          if (!response.ok) {
            throw new Error(`API error ${response.status}: ${endpoint}`);
          }
          return [key, await response.json()];
        } catch (error) {
          console.error(`Failed to load ${endpoint}`, error);
          return [key, { _error: true }];
        }
      })
    )
      .then((results) => {
        const resolved = Object.fromEntries(results);
        const hasRequiredFailure = Array.from(REQUIRED_KEYS).some(
          (key) => resolved[key]?._error === true
        );
        setData((prev) => ({
          ...prev,
          ...resolved,
          forecastDashboard: resolved.forecasts?._error
            ? []
            : (resolved.forecasts ?? prev.forecastDashboard),
        }));
        if (hasRequiredFailure) setApiError(true);
        setLoading(false);
      })
      .catch((error) => {
        console.error("CivicSense API loading error:", error);
        setApiError(true);
        setLoading(false);
      });
  };

  // oxlint-disable-next-line react/set-state-in-effect -- loadData is the
  // intentional data-fetching entry point; setState resets are correct here.
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const metrics = useMemo(() => {
    const rows = Array.isArray(data.metrics) ? data.metrics : [];
    const findMetric = (key) => {
      const row = rows.find((item) => item.metric === key);
      return row?.value ?? null;
    };
    return {
      total:   findMetric("total_grievances")    !== null ? Number(findMetric("total_grievances"))    : null,
      closure: findMetric("closed_rate_percent") !== null ? Number(findMetric("closed_rate_percent")) : null,
      wards:   findMetric("unique_wards")        !== null ? Number(findMetric("unique_wards"))        : null,
    };
  }, [data.metrics]);

  const totalGrievances = metrics.total;
  const closureRate     = metrics.closure;
  const wardCount       = metrics.wards;

  if (loading) return <LoadingScreen />;
  if (apiError) return <ApiErrorScreen onRetry={loadData} />;

  return (
    <div className="flex min-h-screen bg-[#FFF9F2] text-[#1a1917]">

      {/* SIDEBAR — desktop */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        metadata={data.metadata}
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 min-h-screen overflow-y-auto pb-16 md:pb-0">

        {activeSection === "command" && (
          <CommandCentreSection
            totalGrievances={totalGrievances}
            closureRate={closureRate}
            wardCount={wardCount}
            forecastSummary={data.forecastSummary}
            monthly={data.monthly}
            categories={data.categories}
            wards={data.wards}
            statuses={data.statuses}
            metadata={data.metadata}
          />
        )}

        {activeSection === "analytics" && (
          <AnalyticsSection
            categories={data.categories}
            categorySubcategory={data.categorySubcategory}
            categoryWard={data.categoryWard}
            categoryMonth={data.categoryMonth}
            categoryStatus={data.categoryStatus}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />
        )}

        {activeSection === "forecasts" && (
          <ForecastsSection
            evaluation={data.forecastEvaluation}
            forecast={data.forecastDashboard}
            summary={data.forecastSummary}
          />
        )}

        {activeSection === "insights" && (
          <InsightsSection
            data={data}
            totalGrievances={totalGrievances}
          />
        )}

        {activeSection === "desk" && (
          <ServiceDeskSection categories={data.categories} wards={data.wards} />
        )}

      </main>

      {/* BOTTOM TAB BAR — mobile */}
      <MobileNav
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

    </div>
  );
}


/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({ activeSection, setActiveSection, metadata }) {
  const dateStr = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  return (
    <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-[#e8e4dd] bg-[#f0ede8] min-h-screen sticky top-0">

      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-[#e8e4dd]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1a1917]">
            <Building2 size={17} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-[0.12em] text-[#1a1917]">CIVICSENSE</p>
            <p className="text-[10px] text-[#a09890] tracking-[0.1em]">Urban Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        <p className="px-2 mb-2 text-[9px] font-semibold tracking-[0.18em] text-[#a09890]">NAVIGATION</p>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={
              activeSection === id
                ? "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold w-full text-left transition-colors text-[#172033]"
                : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#6b6560] hover:bg-[#e8e4dd] hover:text-[#172033] w-full text-left transition-colors"
            }
            style={activeSection === id ? { background: PASTELS.lavender.bg, border: `1px solid ${PASTELS.lavender.border}` } : {}}
          >
            <Icon
              size={16}
              style={activeSection === id ? { color: PASTELS.lavender.strong } : { color: "#a09890" }}
            />
            {label}
          </button>
        ))}
      </nav>

      {/* Footer metadata */}
      <div className="px-5 py-4 border-t border-[#e8e4dd]">
        {metadata?.date_min && (
          <p className="text-[10px] text-[#a09890] leading-5">
            <span className="font-semibold text-[#6b6560]">Dataset</span><br />
            {dateStr(metadata.date_min)} – {dateStr(metadata.date_max)}
          </p>
        )}
        <p className="mt-2 text-[10px] text-[#a09890]">BBMP · 2025 · v1.0</p>
      </div>

    </aside>
  );
}


/* =========================================================
   MOBILE BOTTOM TAB BAR
========================================================= */

function MobileNav({ activeSection, setActiveSection }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex md:hidden bg-white border-t border-[#e8e4dd] z-20 shadow-lg">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setActiveSection(id)}
          className={
            "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold tracking-[0.06em] transition-colors " +
            (activeSection === id
              ? "text-[#1a1917]"
              : "text-[#a09890] hover:text-[#6b6560]")
          }
        >
          <Icon
            size={18}
            className={activeSection === id ? "text-[#1a1917]" : "text-[#c4cfd8]"}
          />
          <span className="hidden xs:block">{label}</span>
        </button>
      ))}
    </nav>
  );
}


/* =========================================================
   PAGE HEADING (shared)
========================================================= */

function PageHeading({ title, subtitle, icon: Icon, accentColor = "#7c3aed", accentBg = "#f3f0ff" }) {
  return (
    <div className="border-b border-[#e8e4dd] px-6 py-6 md:px-8">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: accentBg }}
        >
          <Icon size={17} style={{ color: accentColor }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1a1917]">{title}</h1>
          <p className="text-xs text-[#a09890]">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   CARD (shared wrapper)
========================================================= */

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#e8e4dd] shadow-sm ${className}`}>
      {children}
    </div>
  );
}


/* =========================================================
   CARD HEADER (shared)
========================================================= */

function CardHeader({ title, subtitle, badge, iconColor = "#7c3aed", iconBg = "#f3f0ff", icon: Icon }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex gap-3 items-start">
        {Icon && (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5"
            style={{ background: iconBg }}
          >
            <Icon size={14} style={{ color: iconColor }} />
          </div>
        )}
        <div>
          <h2 className="text-sm font-semibold text-[#1a1917]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[#a09890]">{subtitle}</p>}
        </div>
      </div>
      {badge && (
        <span className="shrink-0 rounded-full bg-[#f5f3ef] px-2.5 py-1 text-[9px] font-semibold tracking-[0.14em] text-[#6b6560]">
          {badge}
        </span>
      )}
    </div>
  );
}


/* =========================================================
   KPI CARD
========================================================= */

function KpiCard({ icon: Icon, label, value, sub, accent = "mint" }) {
  const p = PASTELS[accent] ?? PASTELS.mint;
  return (
    <div
      className="rounded-2xl border shadow-sm p-5 hover:shadow-md transition-shadow"
      style={{ background: p.card, borderColor: p.border }}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold tracking-[0.14em]" style={{ color: p.strong }}>{label}</span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "rgba(255,255,255,0.55)", border: `1px solid ${p.border}` }}
        >
          <Icon size={14} style={{ color: p.strong }} />
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight" style={{ color: "#172033" }}>{value}</p>
      <p className="mt-1 text-xs" style={{ color: p.strong }}>{sub}</p>
    </div>
  );
}


/* =========================================================
   CHART TOOLTIP
========================================================= */

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-[#e8e4dd] rounded-xl px-3 py-2 shadow-lg">
      <p className="mb-1 text-[10px] text-[#a09890]">{label}</p>
      {payload.map((item, i) => (
        <p key={i} className="text-xs font-semibold text-[#1a1917]">
          {item.name}: {formatNumber(item.value)}
        </p>
      ))}
    </div>
  );
}


/* =========================================================
   EMPTY CHART PLACEHOLDER
========================================================= */

function EmptyChart({ height = 280 }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl bg-[#f5f3ef]"
      style={{ height }}
    >
      <p className="text-xs text-[#a09890]">No data available</p>
    </div>
  );
}


/* =========================================================
   COMMAND CENTRE SECTION
========================================================= */

function CommandCentreSection({
  totalGrievances, closureRate, wardCount,
  forecastSummary, monthly, categories, wards, statuses, metadata,
}) {
  const topCategories = (categories || []).slice(0, 6);
  const topWards      = (wards || []).slice(0, 8);

  const dateStr = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  return (
    <div>
      <PageHeading
        title="Command Centre"
        subtitle="Executive overview of BBMP civic grievance intelligence"
        icon={Activity}
        accentColor={PASTELS.mint.text}
        accentBg={PASTELS.mint.bg}
      />

      <div className="px-6 md:px-8 py-6 space-y-6">

        {/* Editorial intro */}
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={13} style={{ color: PASTELS.lavender.text }} />
            <span className="text-[10px] font-semibold tracking-[0.18em] text-[#a09890]">
              CIVIC INTELLIGENCE
            </span>
          </div>
          <p className="text-2xl font-bold text-[#1a1917] leading-snug">
            See the city.<br />
            <span style={{ color: PASTELS.lavender.text }}>Understand what it needs.</span>
          </p>
          <p className="mt-2 text-sm text-[#6b6560] leading-6 max-w-xl">
            CivicSense transforms BBMP citizen grievance data into structured
            intelligence — revealing demand patterns, operational signals, and
            forward-looking planning insights.
          </p>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            icon={Activity}
            label="TOTAL GRIEVANCES"
            value={totalGrievances != null ? formatNumber(totalGrievances) : "—"}
            sub="BBMP · 2025 dataset"
            accent="mint"
          />
          <KpiCard
            icon={CheckCircle2}
            label="RECORDED CLOSURE"
            value={closureRate != null ? `${closureRate.toFixed(2)}%` : "—"}
            sub="Based on status field"
            accent="lavender"
          />
          <KpiCard
            icon={MapPin}
            label="WARD COVERAGE"
            value={wardCount != null ? formatNumber(wardCount) : "—"}
            sub="Unique ward names"
            accent="blue"
          />
          <KpiCard
            icon={TrendingUp}
            label="FORECAST / DAY"
            value={
              forecastSummary?.forecast_average != null
                ? formatNumber(forecastSummary.forecast_average)
                : "—"
            }
            sub="Next 14-day planning signal"
            accent="butter"
          />
        </div>

        {/* Monthly trend + Category concentration */}
        <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">

          <Card className="p-5 md:p-6">
            <CardHeader
              title="Grievance Activity"
              subtitle="Monthly volume across the 2025 dataset"
              badge="OBSERVED"
              icon={Activity}
              iconColor={PASTELS.mint.text}
              iconBg={PASTELS.mint.bg}
            />
            {(!monthly || monthly.length === 0) ? (
              <EmptyChart height={300} />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthly}>
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dd" />
                    <XAxis dataKey="month" stroke="#a09890" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis stroke="#a09890" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="complaints" stroke="#10B981" strokeWidth={3} fill="url(#trendGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-5 md:p-6">
            <CardHeader
              title="Category Concentration"
              subtitle="Where civic demand is concentrated"
              badge="TOP 6"
              icon={BarChart3}
              iconColor={PASTELS.lavender.text}
              iconBg={PASTELS.lavender.bg}
            />
            {(!topCategories || topCategories.length === 0) ? (
              <EmptyChart height={300} />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCategories} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dd" horizontal={false} />
                    <XAxis type="number" stroke="#a09890" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <YAxis type="category" dataKey="category" width={115} stroke="#a09890" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6b6560" }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="complaints" radius={[0, 8, 8, 0]}>
                      {topCategories.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_BAR_COLORS[i % CATEGORY_BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

        </div>

        {/* Top wards + Operational status */}
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">

          <Card className="p-5 md:p-6">
            <CardHeader
              title="Urban Demand Map"
              subtitle="Highest-volume wards in the dataset"
              badge="TOP WARDS"
              icon={MapPin}
              iconColor={PASTELS.blue.text}
              iconBg={PASTELS.blue.bg}
            />
            {(!topWards || topWards.length === 0) ? (
              <div className="py-8 text-center text-xs text-[#a09890]">No ward data available</div>
            ) : (
              <div className="space-y-2">
                {topWards.map((ward, index) => {
                  const max = Number(topWards[0]?.complaints || 1);
                  const width = (Number(ward.complaints) / max) * 100;
                  return (
                    <div
                      key={`${ward.ward}-${index}`}
                      className="rounded-xl bg-[#f5f3ef] hover:bg-[#ede9e3] p-3 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#e8e4dd] text-[10px] font-semibold text-[#6b6560]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="truncate text-sm text-[#1a1917]">{ward.ward}</span>
                        </div>
                        <span className="text-sm font-semibold text-[#2563eb]">
                          {formatNumber(ward.complaints)}
                        </span>
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#e8e4dd]">
                        <div
                          className="h-full rounded-full bg-[#93c5fd]"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-5 md:p-6">
            <CardHeader
              title="Operational Status"
              subtitle="Grievance status distribution"
              badge="STATUS"
              icon={ShieldCheck}
              iconColor={PASTELS.mint.text}
              iconBg={PASTELS.mint.bg}
            />
            {(!statuses || statuses.length === 0) ? (
              <EmptyChart height={220} />
            ) : (
              <>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statuses}
                        dataKey="complaints"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {(statuses || []).map((_, i) => (
                          <Cell key={i} fill={STATUS_PIE_COLORS[i % STATUS_PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {(statuses || []).slice(0, 4).map((item, i) => (
                    <div
                      key={item.status}
                      className="rounded-xl px-3 py-2 border"
                      style={{
                        background: STATUS_PIE_COLORS[i % STATUS_PIE_COLORS.length] + "18",
                        borderColor: STATUS_PIE_COLORS[i % STATUS_PIE_COLORS.length] + "44",
                      }}
                    >
                      <span className="text-[10px] text-[#6b6560]">{item.status}</span>
                      <p className="mt-0.5 text-sm font-semibold text-[#1a1917]">
                        {formatNumber(item.complaints)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

        </div>

        {/* Dataset freshness */}
        {metadata?.date_min && (
          <p className="text-xs text-[#a09890] text-center pb-2">
            Dataset coverage: {dateStr(metadata.date_min)} – {dateStr(metadata.date_max)}
          </p>
        )}

      </div>
    </div>
  );
}


/* =========================================================
   ANALYTICS SECTION
========================================================= */

function AnalyticsSection({
  categories, categorySubcategory, categoryWard, categoryMonth, categoryStatus,
  selectedCategory, setSelectedCategory,
}) {
  const activeCategory = selectedCategory || categories?.[0]?.category || "";

  const total = categories?.find((item) => item.category === activeCategory)?.complaints || 0;

  const subcategories = (categorySubcategory || [])
    .filter((item) => item.category === activeCategory)
    .sort((a, b) => Number(b.count) - Number(a.count))
    .slice(0, 6);

  const wards = (categoryWard || [])
    .filter((item) => item.category === activeCategory)
    .sort((a, b) => Number(b.count) - Number(a.count))
    .slice(0, 6);

  const monthly = (categoryMonth || [])
    .filter((item) => item.category === activeCategory)
    .sort((a, b) => Number(a.month_num) - Number(b.month_num));

  const statuses = (categoryStatus || [])
    .filter((item) => item.category === activeCategory)
    .sort((a, b) => Number(b.count) - Number(a.count));

  const datasetTotal = categories?.reduce((sum, item) => sum + Number(item.complaints || 0), 0) || 1;
  const share = ((Number(total) / datasetTotal) * 100).toFixed(2);

  return (
    <div>
      <PageHeading
        title="Analytics"
        subtitle="Drill into any civic demand category — subcategory, ward, time, status"
        icon={BarChart3}
        accentColor={PASTELS.lavender.text}
        accentBg={PASTELS.lavender.bg}
      />

      <div className="px-6 md:px-8 py-6 space-y-6">

        {/* Category selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-[#a09890] mb-1">
              SELECTED CATEGORY
            </p>
            <p className="text-sm text-[#6b6560]">
              Explore subcategories, wards, monthly patterns and status for any demand category.
            </p>
          </div>
          <div className="relative shrink-0">
            <select
              value={activeCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="min-w-[260px] appearance-none bg-white border border-[#e8e4dd] rounded-xl px-4 py-2.5 pr-10 text-sm text-[#1a1917] shadow-sm outline-none focus:ring-2 focus:border-[#c4b5fd] transition-shadow"
              style={{ "--tw-ring-color": "#c4b5fd" }}
            >
              {(categories || []).map((item) => (
                <option key={item.category} value={item.category}>
                  {item.category}
                </option>
              ))}
            </select>
            <ChevronRight
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#a09890]"
            />
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "CATEGORY VOLUME", value: formatNumber(total), small: false },
            { label: "SHARE OF DATASET", value: `${share}%`, small: false },
            { label: "TOP SUBCATEGORY", value: subcategories[0]?.subcategory || "—", small: true },
            { label: "TOP WARD",        value: wards[0]?.ward || "—",              small: true },
          ].map(({ label, value, small }) => (
            <Card key={label} className="p-4 hover:shadow-md transition-shadow">
              <p className="text-[9px] font-semibold tracking-[0.15em] text-[#a09890]">{label}</p>
              <p className={`mt-2 font-bold text-[#1a1917] truncate ${small ? "text-sm" : "text-2xl"}`}>
                {value}
              </p>
            </Card>
          ))}
        </div>

        {/* Subcategory + Ward lists */}
        <div className="grid gap-5 xl:grid-cols-2">
          <AnalyticsList
            title="Top subcategories"
            items={subcategories}
            nameKey="subcategory"
            barColor="#c4b5fd"
            trackColor="#f3f0ff"
            countColor={PASTELS.lavender.text}
          />
          <AnalyticsList
            title="Highest-volume wards"
            items={wards}
            nameKey="ward"
            barColor="#93c5fd"
            trackColor="#eff6ff"
            countColor={PASTELS.blue.text}
          />
        </div>

        {/* Monthly pattern + Status distribution */}
        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">

          <Card className="p-5">
            <CardHeader
              title="Monthly pattern"
              subtitle="Volume over time for the selected category"
              icon={CalendarDays}
              iconColor={PASTELS.lavender.text}
              iconBg={PASTELS.lavender.bg}
            />
            {(!monthly || monthly.length === 0) ? (
              <EmptyChart height={220} />
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dd" />
                    <XAxis dataKey="month" stroke="#a09890" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis stroke="#a09890" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 3, fill: "#8B5CF6" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <CardHeader
              title="Status distribution"
              subtitle="Resolution breakdown for selected category"
              icon={ShieldCheck}
              iconColor={PASTELS.mint.text}
              iconBg={PASTELS.mint.bg}
            />
            {(!statuses || statuses.length === 0) ? (
              <div className="py-8 text-center text-xs text-[#a09890]">No data available</div>
            ) : (
              <div className="space-y-3 mt-1">
                {statuses.slice(0, 6).map((item) => {
                  const maxStatus = Number(statuses[0]?.complaints || 1);
                  const w = (Number(item.complaints) / maxStatus) * 100;
                  return (
                    <div key={item.status}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-[#6b6560] truncate">{item.status}</span>
                        <span className="text-[#1a1917] font-medium ml-2 shrink-0">{formatNumber(item.complaints)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#f3f0ff]">
                        <div
                          className="h-full rounded-full bg-[#c4b5fd]"
                          style={{ width: `${Math.min(w, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

        </div>

      </div>
    </div>
  );
}


/* =========================================================
   ANALYTICS LIST (subcategory / ward ranked list)
========================================================= */

function AnalyticsList({ title, items, nameKey, barColor, trackColor, countColor }) {
  const max = Number(items?.[0]?.count || 1);
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-[#1a1917] mb-4">{title}</p>
      {(!items || items.length === 0) ? (
        <p className="text-xs text-[#a09890] py-4 text-center">No data available</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const w = (Number(item.count) / max) * 100;
            return (
              <div key={`${item[nameKey]}-${index}`}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#f5f3ef] text-[10px] font-semibold text-[#a09890]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate text-xs text-[#1a1917]" title={item[nameKey]}>
                      {item[nameKey]}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs font-semibold" style={{ color: countColor }}>
                    {formatNumber(item.count)}
                  </span>
                </div>
                <div className="ml-7 h-1 overflow-hidden rounded-full" style={{ background: trackColor }}>
                  <div className="h-full rounded-full" style={{ width: `${w}%`, background: barColor }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}


/* =========================================================
   FORECASTS SECTION
========================================================= */

function ForecastsSection({ evaluation, forecast, summary }) {
  const modelMAE      = evaluation?.model_mae != null           ? Number(evaluation.model_mae)            : null;
  const baselineMAE   = evaluation?.baseline_mae != null        ? Number(evaluation.baseline_mae)         : null;
  const modelRMSE     = evaluation?.model_rmse != null          ? Number(evaluation.model_rmse)           : null;
  const baselineRMSE  = evaluation?.baseline_rmse != null       ? Number(evaluation.baseline_rmse)        : null;
  const improvement   = evaluation?.mae_improvement_percent != null ? Number(evaluation.mae_improvement_percent) : null;
  const modelR2       = evaluation?.model_r2 != null            ? Number(evaluation.model_r2)             : null;
  const total         = summary?.forecast_total != null         ? Number(summary.forecast_total)          : null;
  const average       = summary?.forecast_average != null       ? Number(summary.forecast_average)        : null;
  const horizon       = summary?.horizon_days ?? 14;

  return (
    <div>
      <PageHeading
        title="Forecasts"
        subtitle="14-day planning signal with model evaluation and performance metrics"
        icon={TrendingUp}
        accentColor={PASTELS.butter.text}
        accentBg={PASTELS.butter.bg}
      />

      <div className="px-6 md:px-8 py-6 space-y-6">

        {/* Forecast KPI row */}
        <div className="grid grid-cols-3 gap-4">
          <KpiCard
            icon={TrendingUp}
            label="FORECAST TOTAL"
            value={total != null ? formatNumber(total) : "—"}
            sub={`${horizon}-day horizon`}
            accent="butter"
          />
          <KpiCard
            icon={Activity}
            label="DAILY AVERAGE"
            value={average != null ? formatNumber(average) : "—"}
            sub="Grievances per day"
            accent="butter"
          />
          <KpiCard
            icon={CalendarDays}
            label="HORIZON"
            value={`${horizon} days`}
            sub="Planning window"
            accent="blue"
          />
        </div>

        {/* Forecast chart */}
        <Card className="p-5 md:p-6">
          <CardHeader
            title="Forecast trajectory"
            subtitle="Predicted daily grievance volume — 14-day planning signal"
            badge="MODEL OUTPUT"
            icon={TrendingUp}
            iconColor={PASTELS.butter.text}
            iconBg={PASTELS.butter.bg}
          />
          {(!forecast || forecast.length === 0) ? (
            <EmptyChart height={280} />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast}>
                  <defs>
                    <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#d97706" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dd" />
                  <XAxis dataKey="date" stroke="#a09890" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis stroke="#a09890" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="forecast" stroke="#d97706" strokeWidth={2.5} fill="url(#forecastGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Model evaluation + Planning disclaimer */}
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">

          {/* Model evaluation card */}
          <Card className="p-5 md:p-6">
            <CardHeader
              title="Model evaluation"
              subtitle="Performance against 7-day seasonal-naive baseline"
              icon={BrainCircuit}
              iconColor={PASTELS.lavender.text}
              iconBg={PASTELS.lavender.bg}
            />

            {/* Model name chip */}
            <div
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium mb-5"
              style={{ background: PASTELS.butter.bg, color: PASTELS.butter.text, border: `1px solid ${PASTELS.butter.border}` }}
            >
              {evaluation?.model || "HistGradientBoostingRegressor"}
            </div>

            {/* Performance metrics */}
            <div className="space-y-4">
              {modelMAE != null && baselineMAE != null ? (
                <PerformanceMetric label="MAE" model={modelMAE} baseline={baselineMAE} />
              ) : (
                <p className="text-xs text-[#a09890]">MAE — data unavailable</p>
              )}
              {modelRMSE != null && baselineRMSE != null ? (
                <PerformanceMetric label="RMSE" model={modelRMSE} baseline={baselineRMSE} />
              ) : (
                <p className="text-xs text-[#a09890]">RMSE — data unavailable</p>
              )}
            </div>

            {/* Improvement + R² */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div
                className="rounded-xl p-4"
                style={{ background: PASTELS.mint.bg, border: `1px solid ${PASTELS.mint.border}` }}
              >
                <p className="text-[9px] font-semibold tracking-[0.14em] text-[#a09890]">MAE IMPROVEMENT</p>
                <p className="mt-1.5 text-2xl font-bold" style={{ color: PASTELS.mint.strong }}>
                  {improvement != null ? `${improvement.toFixed(1)}%` : "—"}
                </p>
                <p className="mt-0.5 text-[10px] text-[#6b6560]">vs 7-day baseline</p>
              </div>
              <div className="rounded-xl p-4 bg-[#f5f3ef] border border-[#e8e4dd]">
                <p className="text-[9px] font-semibold tracking-[0.14em] text-[#a09890]">MODEL R²</p>
                <p className="mt-1.5 text-2xl font-bold text-[#1a1917]">
                  {modelR2 != null ? modelR2.toFixed(3) : "—"}
                </p>
                <p className="mt-0.5 text-[10px] text-[#6b6560]">test set</p>
              </div>
            </div>
          </Card>

          {/* Planning signal disclaimer */}
          <div className="space-y-4">
            <div
              className="rounded-2xl p-5 border"
              style={{ background: PASTELS.blush.bg, borderColor: PASTELS.blush.border }}
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} style={{ color: PASTELS.blush.strong }} />
                <span className="text-[10px] font-semibold tracking-[0.14em]" style={{ color: PASTELS.blush.strong }}>
                  PLANNING SIGNAL
                </span>
              </div>
              <p className="text-sm font-semibold text-[#1a1917] leading-5 mb-2">
                Use forecasts as directional signals, not guarantees
              </p>
              <p className="text-xs text-[#6b6560] leading-5">
                {evaluation?.interpretation ||
                  "The negative R² indicates that predictive performance remains limited. Forecasts should be treated as planning signals rather than guaranteed outcomes."}
              </p>
            </div>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={14} style={{ color: PASTELS.lavender.text }} />
                <span className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890]">METHODOLOGY</span>
              </div>
              <ul className="space-y-2 text-xs text-[#6b6560] leading-5">
                <li className="flex gap-2"><span className="text-[#c4b5fd] font-bold">·</span> HistGradientBoostingRegressor</li>
                <li className="flex gap-2"><span className="text-[#c4b5fd] font-bold">·</span> 18 engineered features (lag, rolling, cyclical)</li>
                <li className="flex gap-2"><span className="text-[#c4b5fd] font-bold">·</span> 80/20 chronological train/test split</li>
                <li className="flex gap-2"><span className="text-[#c4b5fd] font-bold">·</span> TimeSeriesSplit(n_splits=4) cross-validation</li>
                <li className="flex gap-2"><span className="text-[#c4b5fd] font-bold">·</span> 7-day seasonal-naive baseline</li>
                <li className="flex gap-2"><span className="text-[#c4b5fd] font-bold">·</span> Recursive 14-day rolling forecast</li>
              </ul>
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
}


/* =========================================================
   PERFORMANCE METRIC
========================================================= */

function PerformanceMetric({ label, model, baseline }) {
  const imp = baseline > 0 ? ((baseline - model) / baseline) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold tracking-[0.12em] text-[#a09890]">{label}</span>
        <span className="text-[10px] font-medium" style={{ color: PASTELS.mint.text }}>
          ↓ {imp.toFixed(1)}%
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-lg p-2.5 border"
          style={{ background: PASTELS.butter.bg, borderColor: PASTELS.butter.border }}
        >
          <p className="text-[8px] text-[#a09890] font-semibold tracking-wide">MODEL</p>
          <p className="mt-1 text-sm font-bold" style={{ color: PASTELS.butter.strong }}>
            {model.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg p-2.5 bg-[#f5f3ef] border border-[#e8e4dd]">
          <p className="text-[8px] text-[#a09890] font-semibold tracking-wide">BASELINE</p>
          <p className="mt-1 text-sm font-semibold text-[#6b6560]">{baseline.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   INSIGHTS SECTION
========================================================= */

function InsightsSection({ data, totalGrievances }) {
  const insights = buildInsights(data, totalGrievances);

  return (
    <div>
      <PageHeading
        title="Insights"
        subtitle="Evidence-driven observations, hypotheses, and recommendations from the dataset"
        icon={BrainCircuit}
        accentColor={PASTELS.lavender.text}
        accentBg={PASTELS.lavender.bg}
      />

      <div className="px-6 md:px-8 py-6">

        {/* Intro blurb */}
        <p className="text-sm text-[#6b6560] mb-6 max-w-2xl leading-6">
          Each insight follows a structured analytical framework:
          an <strong className="text-[#1a1917] font-semibold">observation</strong> grounded in the data,
          an <strong className="text-[#1a1917] font-semibold">interpretation</strong> of its significance,
          a <strong className="text-[#1a1917] font-semibold">hypothesis</strong> about causes,
          and a concrete <strong className="text-[#1a1917] font-semibold">recommendation</strong>.
        </p>

        <div className="grid gap-5 md:grid-cols-2">
          {insights.map((insight, index) => (
            <InsightCard key={index} insight={insight} index={index} />
          ))}
        </div>

      </div>
    </div>
  );
}


/* =========================================================
   INSIGHT CARD
========================================================= */

function InsightCard({ insight, index }) {
  const accentColor = INSIGHT_ACCENT_COLORS[index % INSIGHT_ACCENT_COLORS.length];
  const cardBg      = INSIGHT_CARD_BG[index % INSIGHT_CARD_BG.length];

  return (
    <div
      className="rounded-2xl border border-[#e8e4dd] shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      style={{ background: cardBg }}
    >
      {/* Colored top accent strip */}
      <div className="h-1" style={{ background: accentColor }} />

      <div className="p-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <span
            className="inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em]"
            style={{
              background: accentColor + "22",
              color: accentColor === "#fde68a" ? "#b45309" : accentColor,
            }}
          >
            INSIGHT {String(index + 1).padStart(2, "0")}
          </span>
          <ArrowUpRight size={15} className="text-[#d4cfc7] shrink-0 mt-0.5" />
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-[#1a1917] leading-5 mb-4">
          {insight.title}
        </h3>

        {/* Body / Observation */}
        <p className="text-xs text-[#6b6560] leading-6 mb-4">{insight.body}</p>

        {/* Action / Recommendation */}
        {insight.action && (
          <div className="border-t border-[#f0ede8] pt-4">
            <p className="text-[9px] font-semibold tracking-[0.14em] text-[#a09890] mb-1.5">
              RECOMMENDATION
            </p>
            <div className="flex gap-2">
              <ChevronRight
                size={13}
                className="mt-0.5 shrink-0"
                style={{ color: accentColor === "#fde68a" ? "#b45309" : accentColor }}
              />
              <p className="text-xs text-[#6b6560] leading-5">{insight.action}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


/* =========================================================
   BUILD INSIGHTS (pure function — logic unchanged)
========================================================= */

function buildInsights(data, total) {
  const electrical = data.categories?.find((item) =>
    String(item.category).toLowerCase().includes("electrical")
  );
  const solidWaste = data.categories?.find((item) =>
    String(item.category).toLowerCase().includes("solid waste")
  );
  const topWard = data.wards?.[0];

  const electricalShare =
    electrical && total
      ? ((Number(electrical.complaints) / total) * 100).toFixed(2)
      : null;

  const wasteShare =
    solidWaste && total
      ? ((Number(solidWaste.complaints) / total) * 100).toFixed(2)
      : null;

  const combinedShare =
    electricalShare != null && wasteShare != null
      ? (Number(electricalShare) + Number(wasteShare)).toFixed(2)
      : null;

  return [
    {
      title: "Demand is highly concentrated",
      body: combinedShare != null
        ? `Electrical and Solid Waste together account for approximately ${combinedShare}% of all recorded grievances.`
        : "Electrical and Solid Waste are the two largest demand categories in the dataset.",
      action: "Prioritise category-level operational analysis before treating all grievance types equally.",
    },
    {
      title: "Electrical issues form the largest category",
      body: electricalShare != null
        ? `Electrical grievances represent approximately ${electricalShare}% of the dataset.`
        : "Electrical grievances form the largest category in the dataset.",
      action: "Break electrical complaints down by ward, subcategory and time period to identify recurring demand patterns.",
    },
    {
      title: "Waste management is another major demand cluster",
      body: wasteShare != null
        ? `Solid Waste (Garbage) Related grievances represent approximately ${wasteShare}% of recorded complaints.`
        : "Solid Waste (Garbage) Related grievances are a major demand cluster in the dataset.",
      action: "Compare waste-related demand across wards and time periods to identify operational patterns.",
    },
    {
      title: "Street-light complaints dominate the subcategory layer",
      body: "Street Light Not Working is the largest individual subcategory in the dataset.",
      action: "Investigate repeated street-light demand geographically and across time.",
    },
    {
      title: "Grievance volume varies geographically",
      body: topWard
        ? `${topWard.ward} has the highest absolute grievance volume in this dataset with ${formatNumber(topWard.complaints)} recorded grievances.`
        : "Ward-level grievance volumes vary across the dataset.",
      action: "Use ward-level demand as a screening signal rather than treating complaint volume alone as evidence of service quality.",
    },
    {
      title: "The forecast can support planning",
      body: "The validated time-series model improves MAE over the seasonal-naive baseline. Its negative R² indicates that predictive performance remains limited — forecasts are planning signals, not guaranteed outcomes.",
      action: "Use the forecast as a planning signal and improve future versions with longer historical data and additional explanatory variables.",
    },
  ];
}


/* =========================================================
   SERVICE DESK SECTION
========================================================= */

/* --- Urban illustration SVG elements used in the Service Desk scene --- */
function DeskIllustrations() {
  return (
    <div aria-hidden="true" className="pointer-events-none select-none absolute inset-0 overflow-hidden">

      {/* ── TOP-LEFT: small office building cluster ── */}
      <svg width="160" height="180" viewBox="0 0 160 180" fill="none"
        className="absolute top-0 left-0 opacity-70">
        {/* tall building */}
        <rect x="8" y="40" width="38" height="130" rx="3" fill="#DCEEFF" stroke="#93c5fd" strokeWidth="1.2"/>
        <rect x="14" y="50" width="8" height="10" rx="1.5" fill="#93c5fd" opacity=".6"/>
        <rect x="28" y="50" width="8" height="10" rx="1.5" fill="#93c5fd" opacity=".6"/>
        <rect x="14" y="68" width="8" height="10" rx="1.5" fill="#93c5fd" opacity=".6"/>
        <rect x="28" y="68" width="8" height="10" rx="1.5" fill="#93c5fd" opacity=".6"/>
        <rect x="14" y="86" width="8" height="10" rx="1.5" fill="#93c5fd" opacity=".6"/>
        <rect x="28" y="86" width="8" height="10" rx="1.5" fill="#93c5fd" opacity=".6"/>
        <rect x="14" y="104" width="8" height="10" rx="1.5" fill="#93c5fd" opacity=".6"/>
        <rect x="28" y="104" width="8" height="10" rx="1.5" fill="#93c5fd" opacity=".6"/>
        {/* water tank */}
        <rect x="19" y="32" width="16" height="10" rx="2" fill="#c4b5fd"/>
        <rect x="23" y="24" width="8" height="10" rx="1" fill="#c4b5fd"/>
        {/* shorter building */}
        <rect x="54" y="72" width="30" height="98" rx="3" fill="#E9DEFF" stroke="#c4b5fd" strokeWidth="1.2"/>
        <rect x="60" y="80" width="7" height="9" rx="1.5" fill="#c4b5fd" opacity=".55"/>
        <rect x="72" y="80" width="7" height="9" rx="1.5" fill="#c4b5fd" opacity=".55"/>
        <rect x="60" y="96" width="7" height="9" rx="1.5" fill="#c4b5fd" opacity=".55"/>
        <rect x="72" y="96" width="7" height="9" rx="1.5" fill="#c4b5fd" opacity=".55"/>
        <rect x="60" y="112" width="7" height="9" rx="1.5" fill="#c4b5fd" opacity=".55"/>
        <rect x="72" y="112" width="7" height="9" rx="1.5" fill="#c4b5fd" opacity=".55"/>
        {/* small civic hall with triangular roof */}
        <rect x="96" y="108" width="48" height="62" rx="3" fill="#FFF0B8" stroke="#fde68a" strokeWidth="1.2"/>
        <polygon points="96,108 120,80 144,108" fill="#fde68a"/>
        <rect x="108" y="130" width="24" height="40" rx="2" fill="#d97706" opacity=".25"/>
        {/* flagpole */}
        <line x1="120" y1="62" x2="120" y2="82" stroke="#a09890" strokeWidth="1.5"/>
        <rect x="120" y="62" width="14" height="9" rx="1" fill="#FFDDE8" stroke="#fda4af" strokeWidth="1"/>
        {/* ground strip */}
        <rect x="0" y="168" width="160" height="12" rx="2" fill="#f0ede8"/>
        {/* small tree left */}
        <rect x="90" y="148" width="4" height="20" rx="1" fill="#a09890"/>
        <ellipse cx="92" cy="145" rx="10" ry="9" fill="#D9F7EA" stroke="#6ee7b7" strokeWidth="1"/>
      </svg>

      {/* ── TOP-RIGHT: clouds + streetlight ── */}
      <svg width="200" height="130" viewBox="0 0 200 130" fill="none"
        className="absolute top-0 right-0 opacity-65">
        {/* cloud 1 */}
        <ellipse cx="150" cy="38" rx="30" ry="16" fill="white" stroke="#e8e4dd" strokeWidth="1"/>
        <ellipse cx="168" cy="32" rx="20" ry="14" fill="white" stroke="#e8e4dd" strokeWidth="1"/>
        <ellipse cx="135" cy="34" rx="16" ry="12" fill="white" stroke="#e8e4dd" strokeWidth="1"/>
        {/* small rain drops below cloud 1 */}
        <line x1="148" y1="56" x2="145" y2="66" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="157" y1="58" x2="154" y2="68" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="165" y1="56" x2="162" y2="66" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round"/>
        {/* cloud 2 smaller */}
        <ellipse cx="60" cy="22" rx="22" ry="11" fill="white" stroke="#e8e4dd" strokeWidth="1"/>
        <ellipse cx="74" cy="18" rx="15" ry="10" fill="white" stroke="#e8e4dd" strokeWidth="1"/>
        <ellipse cx="48" cy="20" rx="12" ry="9" fill="white" stroke="#e8e4dd" strokeWidth="1"/>
        {/* streetlight */}
        <line x1="188" y1="130" x2="188" y2="70" stroke="#a09890" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M188 70 Q188 55 175 55" stroke="#a09890" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="175" cy="55" rx="7" ry="4" fill="#FFF0B8" stroke="#fde68a" strokeWidth="1.2"/>
        {/* glow dot */}
        <circle cx="175" cy="55" r="3" fill="#d97706" opacity=".5"/>
      </svg>

      {/* ── BOTTOM-LEFT: bicycle + tree ── */}
      <svg width="180" height="130" viewBox="0 0 180 130" fill="none"
        className="absolute bottom-0 left-0 opacity-65">
        {/* ground */}
        <rect x="0" y="118" width="180" height="12" rx="2" fill="#f0ede8"/>
        {/* tree */}
        <rect x="12" y="78" width="5" height="40" rx="1.5" fill="#a09890"/>
        <ellipse cx="14" cy="72" rx="14" ry="13" fill="#D9F7EA" stroke="#6ee7b7" strokeWidth="1.2"/>
        <ellipse cx="20" cy="66" rx="10" ry="9" fill="#D9F7EA" stroke="#6ee7b7" strokeWidth="1"/>
        {/* bicycle */}
        {/* rear wheel */}
        <circle cx="90" cy="108" r="18" stroke="#6b6560" strokeWidth="2" fill="none"/>
        <circle cx="90" cy="108" r="4" fill="#6b6560"/>
        {/* front wheel */}
        <circle cx="140" cy="108" r="18" stroke="#6b6560" strokeWidth="2" fill="none"/>
        <circle cx="140" cy="108" r="4" fill="#6b6560"/>
        {/* spokes rear */}
        <line x1="90" y1="90" x2="90" y2="126" stroke="#a09890" strokeWidth="1"/>
        <line x1="72" y1="108" x2="108" y2="108" stroke="#a09890" strokeWidth="1"/>
        {/* spokes front */}
        <line x1="140" y1="90" x2="140" y2="126" stroke="#a09890" strokeWidth="1"/>
        <line x1="122" y1="108" x2="158" y2="108" stroke="#a09890" strokeWidth="1"/>
        {/* frame */}
        <polyline points="90,108 110,78 130,108" stroke="#6b6560" strokeWidth="2" fill="none" strokeLinejoin="round"/>
        <line x1="110" y1="78" x2="140" y2="108" stroke="#6b6560" strokeWidth="2"/>
        {/* handlebar */}
        <line x1="130" y1="85" x2="145" y2="78" stroke="#6b6560" strokeWidth="2" strokeLinecap="round"/>
        <line x1="145" y1="78" x2="150" y2="82" stroke="#6b6560" strokeWidth="2" strokeLinecap="round"/>
        {/* seat */}
        <line x1="110" y1="78" x2="105" y2="72" stroke="#6b6560" strokeWidth="2" strokeLinecap="round"/>
        <rect x="98" y="69" width="16" height="5" rx="2.5" fill="#6b6560"/>
        {/* rider (small) */}
        <circle cx="118" cy="60" r="8" fill="#FFDDE8" stroke="#fda4af" strokeWidth="1.2"/>
        <path d="M112 68 Q115 72 118 68 Q121 72 124 68" stroke="#fda4af" strokeWidth="1.2" fill="none"/>
      </svg>

      {/* ── BOTTOM-RIGHT: auto-rickshaw + small shrub ── */}
      <svg width="200" height="130" viewBox="0 0 200 130" fill="none"
        className="absolute bottom-0 right-0 opacity-65">
        {/* ground */}
        <rect x="0" y="118" width="200" height="12" rx="2" fill="#f0ede8"/>
        {/* shrub right */}
        <rect x="172" y="92" width="4" height="26" rx="1" fill="#a09890"/>
        <ellipse cx="174" cy="88" rx="12" ry="10" fill="#D9F7EA" stroke="#6ee7b7" strokeWidth="1.2"/>
        {/* auto-rickshaw body */}
        <rect x="30" y="72" width="110" height="44" rx="10" fill="#FFF0B8" stroke="#fde68a" strokeWidth="1.5"/>
        {/* windshield */}
        <rect x="118" y="78" width="22" height="28" rx="4" fill="#DCEEFF" stroke="#93c5fd" strokeWidth="1"/>
        {/* top stripe */}
        <rect x="30" y="72" width="110" height="8" rx="5" fill="#fde68a"/>
        {/* wheel rear */}
        <circle cx="55" cy="116" r="14" stroke="#6b6560" strokeWidth="2" fill="#f5f3ef"/>
        <circle cx="55" cy="116" r="6" fill="#6b6560"/>
        {/* wheel front */}
        <circle cx="130" cy="116" r="14" stroke="#6b6560" strokeWidth="2" fill="#f5f3ef"/>
        <circle cx="130" cy="116" r="6" fill="#6b6560"/>
        {/* driver window */}
        <rect x="80" y="80" width="30" height="22" rx="3" fill="#DCEEFF" stroke="#93c5fd" strokeWidth="1"/>
        {/* small flag on top */}
        <line x1="85" y1="72" x2="85" y2="58" stroke="#a09890" strokeWidth="1.5"/>
        <polygon points="85,58 98,63 85,68" fill="#FFDDE8" stroke="#fda4af" strokeWidth="1"/>
        {/* headlight */}
        <circle cx="142" cy="94" r="4" fill="#FFF0B8" stroke="#fde68a" strokeWidth="1"/>
        {/* civic signboard on side */}
        <rect x="36" y="84" width="36" height="18" rx="3" fill="white" stroke="#e8e4dd" strokeWidth="1"/>
        <text x="54" y="97" textAnchor="middle" fontSize="7" fill="#6b6560" fontFamily="system-ui">BBMP</text>
      </svg>

      {/* ── MID-LEFT edge: potted plant ── */}
      <svg width="52" height="90" viewBox="0 0 52 90" fill="none"
        className="absolute left-0 opacity-60" style={{ top: "42%" }}>
        <rect x="14" y="60" width="24" height="28" rx="4" fill="#FFF0B8" stroke="#fde68a" strokeWidth="1.2"/>
        <rect x="10" y="80" width="32" height="8" rx="2" fill="#fde68a"/>
        <line x1="26" y1="60" x2="26" y2="42" stroke="#6ee7b7" strokeWidth="1.5"/>
        <ellipse cx="26" cy="36" rx="14" ry="12" fill="#D9F7EA" stroke="#6ee7b7" strokeWidth="1.2"/>
        <ellipse cx="18" cy="42" rx="10" ry="9" fill="#D9F7EA" stroke="#6ee7b7" strokeWidth="1"/>
        <ellipse cx="34" cy="42" rx="10" ry="9" fill="#D9F7EA" stroke="#6ee7b7" strokeWidth="1"/>
      </svg>

      {/* ── MID-RIGHT edge: streetlight small ── */}
      <svg width="40" height="120" viewBox="0 0 40 120" fill="none"
        className="absolute right-0 opacity-60" style={{ top: "35%" }}>
        <line x1="20" y1="120" x2="20" y2="35" stroke="#a09890" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M20 35 Q20 22 8 22" stroke="#a09890" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="8" cy="22" rx="6" ry="3.5" fill="#FFF0B8" stroke="#fde68a" strokeWidth="1.2"/>
        <circle cx="8" cy="22" r="2.5" fill="#d97706" opacity=".45"/>
        {/* small decorative circle ring */}
        <circle cx="20" cy="55" r="4" fill="none" stroke="#e8e4dd" strokeWidth="1.2"/>
        <circle cx="20" cy="75" r="4" fill="none" stroke="#e8e4dd" strokeWidth="1.2"/>
      </svg>

    </div>
  );
}

function ServiceDeskSection({ categories, wards }) {
  const [view, setView] = useState("citizen"); // "citizen" | "officer"
  return (
    <div className="relative" style={{ minHeight: "calc(100vh - 120px)" }}>

      {/* Illustrated urban scene behind the UI */}
      <DeskIllustrations />

      {/* Actual page content — sits above illustrations */}
      <div className="relative z-10">
        <PageHeading
          title="Service Desk"
          subtitle="Submit and track civic grievances · Officer complaint management"
          icon={ClipboardList}
          accentColor={PASTELS.blue.text}
          accentBg={PASTELS.blue.bg}
        />

        {/* Tab switcher */}
        <div className="flex gap-1 px-6 md:px-8 pt-5">
          {[
            { id: "citizen", label: "Citizen Portal",   icon: Search },
            { id: "officer", label: "Officer Console",  icon: UserCheck },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors"
              style={
                view === id
                  ? { background: PASTELS.blue.bg, color: PASTELS.blue.strong, border: `1px solid ${PASTELS.blue.border}` }
                  : { background: "rgba(255,255,255,0.7)", color: "#6b6560", border: "1px solid #e8e4dd" }
              }
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Citizen: centered narrow column. Officer: full-width grid (illustrations stay as ambience). */}
        {view === "citizen" ? (
          <div className="flex justify-center px-6 py-8">
            <div className="w-full max-w-xl">
              <CitizenPortal categories={categories} wards={wards} />
            </div>
          </div>
        ) : (
          <div className="px-6 md:px-8 py-6">
            <OfficerConsole categories={categories} />
          </div>
        )}
      </div>

    </div>
  );
}


/* =========================================================
   CITIZEN PORTAL
========================================================= */

function CitizenPortal({ categories, wards }) {
  const [tab, setTab]       = useState("submit"); // "submit" | "track"
  const [form, setForm]     = useState({ category: "", subcategory: "", description: "", ward: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(null); // { ticket_id, status, created_at }
  const [submitErr, setSubmitErr]   = useState("");

  const [trackId, setTrackId]     = useState("");
  const [tracking, setTracking]   = useState(null);
  const [trackErr, setTrackErr]   = useState("");
  const [tracking_, setTracking_] = useState(false);

  const catNames = (categories || []).map((c) => c.category);
  const wardNames = (wards || []).map((w) => w.ward);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category || !form.description.trim() || !form.ward) return;
    setSubmitting(true);
    setSubmitErr("");
    try {
      const res = await fetch(`${DESK_API}/desk/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: AbortSignal.timeout(10_000),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail ?? "Submission failed");
      setSubmitted(body);
      setForm({ category: "", subcategory: "", description: "", ward: "" });
    } catch (err) {
      setSubmitErr(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackId.trim()) return;
    setTracking_(true);
    setTrackErr("");
    setTracking(null);
    try {
      const res = await fetch(`${DESK_API}/desk/tickets/${encodeURIComponent(trackId.trim().toUpperCase())}`,
        { signal: AbortSignal.timeout(10_000) });
      if (res.status === 404) throw new Error(`Ticket ${trackId.trim().toUpperCase()} not found`);
      if (!res.ok) throw new Error("Lookup failed");
      setTracking(await res.json());
    } catch (err) {
      setTrackErr(err.message);
    } finally {
      setTracking_(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-1">
        {[["submit","Submit Grievance"],["track","Track Ticket"]].map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setSubmitted(null); setTracking(null); }}
            className="rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors"
            style={tab === id
              ? { background: "#1a1917", color: "#fff" }
              : { background: "#f5f3ef", color: "#6b6560" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ---- SUBMIT FORM ---- */}
      {tab === "submit" && !submitted && (
        <Card className="p-6">
          <CardHeader title="Submit a Grievance" subtitle="Your complaint will be assigned a unique ticket ID" icon={MessageSquare} iconColor={PASTELS.blue.text} iconBg={PASTELS.blue.bg} />
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890]">CATEGORY *</span>
                <select required value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full appearance-none bg-white border border-[#e8e4dd] rounded-xl px-3 py-2 text-sm text-[#1a1917] outline-none">
                  <option value="">Select category…</option>
                  {catNames.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890]">SUB-CATEGORY</span>
                <input value={form.subcategory}
                  onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
                  placeholder="e.g. Street Light Not Working"
                  className="mt-1 w-full bg-white border border-[#e8e4dd] rounded-xl px-3 py-2 text-sm text-[#1a1917] outline-none" />
              </label>
            </div>

            <label className="block">
              <span className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890]">WARD *</span>
              <select required value={form.ward}
                onChange={(e) => setForm((f) => ({ ...f, ward: e.target.value }))}
                className="mt-1 w-full appearance-none bg-white border border-[#e8e4dd] rounded-xl px-3 py-2 text-sm text-[#1a1917] outline-none">
                <option value="">Select ward…</option>
                {wardNames.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890]">DESCRIPTION *</span>
              <textarea required rows={4} value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe the issue in detail…"
                className="mt-1 w-full bg-white border border-[#e8e4dd] rounded-xl px-3 py-2 text-sm text-[#1a1917] outline-none resize-none" />
            </label>

            {submitErr && (
              <p className="text-xs rounded-xl px-3 py-2" style={{ background: PASTELS.blush.bg, color: PASTELS.blush.strong }}>{submitErr}</p>
            )}

            <button type="submit" disabled={submitting}
              className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: PASTELS.blue.strong }}>
              {submitting ? "Submitting…" : "Submit Grievance"}
            </button>
          </form>
        </Card>
      )}

      {/* ---- SUCCESS STATE ---- */}
      {tab === "submit" && submitted && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: PASTELS.mint.bg }}>
              <CheckCircle2 size={18} style={{ color: PASTELS.mint.strong }} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1a1917]">Grievance submitted</p>
              <p className="text-xs text-[#a09890]">Keep your ticket ID to track progress</p>
            </div>
          </div>
          <div className="rounded-2xl p-5 text-center" style={{ background: PASTELS.blue.bg, border: `1px solid ${PASTELS.blue.border}` }}>
            <p className="text-[10px] font-semibold tracking-[0.16em] mb-1" style={{ color: PASTELS.blue.strong }}>YOUR TICKET ID</p>
            <p className="text-3xl font-bold tracking-wide text-[#1a1917]">{submitted.ticket_id}</p>
            <p className="mt-2 text-[10px] text-[#a09890]">{new Date(submitted.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => { setSubmitted(null); }}
              className="flex-1 rounded-xl px-4 py-2 text-xs font-semibold text-[#6b6560] hover:bg-[#e8e4dd] transition-colors border border-[#e8e4dd]">
              Submit another
            </button>
            <button onClick={() => { setTab("track"); setTrackId(submitted.ticket_id); setSubmitted(null); }}
              className="flex-1 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: PASTELS.blue.strong }}>
              Track this ticket
            </button>
          </div>
        </Card>
      )}

      {/* ---- TRACK FORM ---- */}
      {tab === "track" && (
        <div className="space-y-4">
          <Card className="p-5">
            <form onSubmit={handleTrack} className="flex gap-3">
              <input value={trackId} onChange={(e) => setTrackId(e.target.value.toUpperCase())}
                placeholder="Enter ticket ID e.g. CS-2026-0001"
                className="flex-1 bg-white border border-[#e8e4dd] rounded-xl px-3 py-2 text-sm text-[#1a1917] outline-none font-mono" />
              <button type="submit" disabled={tracking_}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                style={{ background: PASTELS.blue.strong }}>
                <Search size={13} />
                {tracking_ ? "…" : "Track"}
              </button>
            </form>
          </Card>

          {trackErr && (
            <p className="text-xs rounded-xl px-4 py-3" style={{ background: PASTELS.blush.bg, color: PASTELS.blush.strong }}>{trackErr}</p>
          )}

          {tracking && <TicketTimeline ticket={tracking} />}
        </div>
      )}
    </div>
  );
}


/* =========================================================
   TICKET TIMELINE  (citizen tracking view)
========================================================= */

function TicketTimeline({ ticket }) {
  const steps = [
    { key: "Received",     label: "Complaint Received" },
    { key: "Under Review", label: "Assigned / Under Review" },
    { key: "Action Taken", label: "Action Taken" },
    { key: "Resolved",     label: "Resolved" },
  ];

  const statusOrder = ["Received","Under Review","Action Taken","Resolved","Reopened"];
  const currentIdx  = statusOrder.indexOf(ticket.status);
  const isReopened  = ticket.status === "Reopened";
  const p           = STATUS_COLORS[ticket.status] ?? PASTELS.blue;

  const lastRemark = ticket.remarks?.length
    ? ticket.remarks[ticket.remarks.length - 1]
    : null;

  return (
    <Card className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890]">TICKET</p>
          <p className="text-xl font-bold font-mono text-[#1a1917]">{ticket.ticket_id}</p>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: p.bg, color: p.strong, border: `1px solid ${p.border}` }}>
          {ticket.status}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {[
          ["Category",   ticket.category],
          ["Ward",       ticket.ward],
          ["Submitted",  new Date(ticket.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })],
          ["Updated",    new Date(ticket.updated_at).toLocaleDateString("en-GB", { dateStyle: "medium" })],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-[#f5f3ef] px-3 py-2">
            <p className="text-[9px] font-semibold tracking-[0.12em] text-[#a09890] mb-0.5">{k.toUpperCase()}</p>
            <p className="text-[#1a1917] font-medium truncate">{v}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      <div className="rounded-xl bg-[#f5f3ef] px-4 py-3 text-xs text-[#6b6560] leading-5">
        <p className="text-[9px] font-semibold tracking-[0.12em] text-[#a09890] mb-1">DESCRIPTION</p>
        {ticket.description}
      </div>

      {/* Timeline */}
      <div>
        <p className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890] mb-3">PROGRESS</p>
        <div className="space-y-2">
          {steps.map((step, i) => {
            const done    = isReopened ? i <= 2 : i <= currentIdx;
            const active  = !isReopened && i === currentIdx;
            const sp      = active ? p : (done ? PASTELS.mint : null);
            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                  style={done || active
                    ? { background: sp?.bg ?? PASTELS.mint.bg, borderColor: sp?.border ?? PASTELS.mint.border }
                    : { background: "#f5f3ef", borderColor: "#e8e4dd" }}>
                  {done && <CheckCircle2 size={12} style={{ color: sp?.strong ?? PASTELS.mint.strong }} />}
                </div>
                <span className={`text-xs ${active ? "font-semibold text-[#1a1917]" : done ? "text-[#6b6560]" : "text-[#c4cfd8]"}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
          {isReopened && (
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                style={{ background: PASTELS.blush.bg, borderColor: PASTELS.blush.border }}>
                <ChevronRight size={12} style={{ color: PASTELS.blush.strong }} />
              </div>
              <span className="text-xs font-semibold text-[#1a1917]">Reopened</span>
            </div>
          )}
        </div>
      </div>

      {/* Latest officer remark */}
      {lastRemark && (
        <div className="rounded-xl px-4 py-3" style={{ background: PASTELS.lavender.bg, border: `1px solid ${PASTELS.lavender.border}` }}>
          <p className="text-[9px] font-semibold tracking-[0.12em] mb-1" style={{ color: PASTELS.lavender.strong }}>LATEST OFFICER REMARK</p>
          <p className="text-xs text-[#1a1917] leading-5">{lastRemark.officer_note}</p>
          <p className="text-[10px] text-[#a09890] mt-1">{new Date(lastRemark.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
      )}
    </Card>
  );
}


/* =========================================================
   OFFICER CONSOLE
========================================================= */

function OfficerConsole({ categories }) {
  const [tickets, setTickets]       = useState(null);
  const [filterStatus, setFilterStatus]   = useState("");
  const [filterCategory, setFilterCat]    = useState("");
  const [selected, setSelected]     = useState(null); // full ticket object
  const [loading, setLoading]       = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: "", officer_note: "" });
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState("");

  const catNames = (categories || []).map((c) => c.category);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus)   params.set("status",   filterStatus);
      if (filterCategory) params.set("category", filterCategory);
      const res = await fetch(`${DESK_API}/desk/tickets?${params}`, { signal: AbortSignal.timeout(10_000) });
      setTickets(await res.json());
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOne = async (ticketId) => {
    const res = await fetch(`${DESK_API}/desk/tickets/${encodeURIComponent(ticketId)}`, { signal: AbortSignal.timeout(10_000) });
    const data = await res.json();
    setSelected(data);
    setUpdateForm({ status: data.status, officer_note: "" });
    setSaveMsg("");
  };

  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { fetchTickets(); }, [filterStatus, filterCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e) => {
    e.preventDefault();
    if (!updateForm.status) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(`${DESK_API}/desk/tickets/${encodeURIComponent(selected.ticket_id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateForm),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error("Save failed");
      await fetchOne(selected.ticket_id);
      await fetchTickets();
      setSaveMsg("Saved");
    } catch (err) {
      setSaveMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">

      {/* Left — ticket list */}
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="appearance-none bg-white border border-[#e8e4dd] rounded-xl px-3 py-2 text-xs text-[#1a1917] outline-none">
            <option value="">All statuses</option>
            {DESK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCat(e.target.value)}
            className="appearance-none bg-white border border-[#e8e4dd] rounded-xl px-3 py-2 text-xs text-[#1a1917] outline-none">
            <option value="">All categories</option>
            {catNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* List */}
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {loading && <p className="text-xs text-[#a09890] py-4 text-center">Loading…</p>}
          {!loading && tickets?.length === 0 && (
            <p className="text-xs text-[#a09890] py-8 text-center">No tickets found</p>
          )}
          {(tickets || []).map((t) => {
            const sp = STATUS_COLORS[t.status] ?? PASTELS.blue;
            const isActive = selected?.ticket_id === t.ticket_id;
            return (
              <button key={t.ticket_id} onClick={() => fetchOne(t.ticket_id)}
                className="w-full text-left rounded-xl p-3 border transition-colors"
                style={isActive
                  ? { background: PASTELS.blue.bg, borderColor: PASTELS.blue.border }
                  : { background: "white", borderColor: "#e8e4dd" }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold font-mono text-[#1a1917]">{t.ticket_id}</span>
                  <span className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                    style={{ background: sp.bg, color: sp.strong }}>
                    {t.status}
                  </span>
                </div>
                <p className="text-xs text-[#6b6560] truncate">{t.category} · {t.ward}</p>
                <p className="text-[10px] text-[#a09890] truncate mt-0.5">{t.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right — complaint detail + update */}
      {!selected ? (
        <div className="flex items-center justify-center rounded-2xl border border-[#e8e4dd] bg-[#f5f3ef]" style={{ minHeight: "300px" }}>
          <p className="text-xs text-[#a09890]">Select a ticket to view details</p>
        </div>
      ) : (
        <Card className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890]">TICKET</p>
              <p className="text-xl font-bold font-mono text-[#1a1917]">{selected.ticket_id}</p>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: (STATUS_COLORS[selected.status] ?? PASTELS.blue).bg, color: (STATUS_COLORS[selected.status] ?? PASTELS.blue).strong, border: `1px solid ${(STATUS_COLORS[selected.status] ?? PASTELS.blue).border}` }}>
              {selected.status}
            </span>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Category",   selected.category],
              ["Ward",       selected.ward],
              ["Submitted",  new Date(selected.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })],
              ["Updated",    new Date(selected.updated_at).toLocaleDateString("en-GB", { dateStyle: "medium" })],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-[#f5f3ef] px-3 py-2">
                <p className="text-[9px] font-semibold tracking-wide text-[#a09890] mb-0.5">{k.toUpperCase()}</p>
                <p className="text-[#1a1917] font-medium truncate">{v}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="rounded-xl bg-[#f5f3ef] px-4 py-3 text-xs text-[#6b6560] leading-5">
            <p className="text-[9px] font-semibold tracking-wide text-[#a09890] mb-1">DESCRIPTION</p>
            {selected.description}
          </div>

          {/* Remarks history */}
          {selected.remarks?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890]">OFFICER REMARKS</p>
              {selected.remarks.map((r) => (
                <div key={r.id} className="rounded-xl px-3 py-2.5 border border-[#e8e4dd] bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                      style={{ background: (STATUS_COLORS[r.status] ?? PASTELS.blue).bg, color: (STATUS_COLORS[r.status] ?? PASTELS.blue).strong }}>
                      {r.status}
                    </span>
                    <span className="text-[10px] text-[#a09890]">{new Date(r.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}</span>
                  </div>
                  <p className="text-xs text-[#1a1917]">{r.officer_note}</p>
                </div>
              ))}
            </div>
          )}

          {/* Update form */}
          <form onSubmit={handleSave} className="space-y-3 border-t border-[#e8e4dd] pt-4">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890]">UPDATE STATUS</p>
            <select value={updateForm.status} onChange={(e) => setUpdateForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full appearance-none bg-white border border-[#e8e4dd] rounded-xl px-3 py-2 text-sm text-[#1a1917] outline-none">
              {DESK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <textarea rows={3} value={updateForm.officer_note}
              onChange={(e) => setUpdateForm((f) => ({ ...f, officer_note: e.target.value }))}
              placeholder="Add an officer remark (optional)…"
              className="w-full bg-white border border-[#e8e4dd] rounded-xl px-3 py-2 text-sm text-[#1a1917] outline-none resize-none" />
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving}
                className="rounded-xl px-5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: PASTELS.lavender.strong }}>
                {saving ? "Saving…" : "Save update"}
              </button>
              {saveMsg && (
                <span className="text-xs font-semibold" style={{ color: saveMsg === "Saved" ? PASTELS.mint.strong : PASTELS.blush.strong }}>
                  {saveMsg}
                </span>
              )}
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}




/* =========================================================
   LOADING SCREEN
========================================================= */

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF9F2]">
      <div className="text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border"
          style={{ background: PASTELS.mint.bg, borderColor: PASTELS.mint.border }}
        >
          <BrainCircuit className="animate-pulse" style={{ color: PASTELS.mint.text }} />
        </div>
        <p className="mt-5 text-sm font-bold tracking-[0.2em] text-[#1a1917]">CIVICSENSE</p>
        <p className="mt-2 text-xs text-[#a09890]">Loading urban intelligence…</p>
      </div>
    </div>
  );
}


/* =========================================================
   API ERROR SCREEN
========================================================= */

function ApiErrorScreen({ onRetry }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF9F2]">
      <div className="text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border"
          style={{ background: PASTELS.blush.bg, borderColor: PASTELS.blush.border }}
        >
          <Radio style={{ color: PASTELS.blush.text }} />
        </div>
        <p className="mt-5 text-sm font-bold tracking-[0.2em] text-[#1a1917]">CIVICSENSE</p>
        <p className="mt-2 text-sm text-[#6b6560]">Unable to reach the API</p>
        <p className="mt-1 text-xs text-[#a09890]">
          Make sure the backend is running:<br />
          <span className="font-mono text-[#6b6560]">uvicorn backend.main:app --reload</span>
        </p>
        <button
          onClick={onRetry}
          className="mt-6 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
          style={{ background: "#1a1917" }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}


/* =========================================================
   FORMAT NUMBER
========================================================= */

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Number(value) || 0
  );
}


export default App;
