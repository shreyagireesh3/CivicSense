import { useEffect, useMemo, useRef, useState } from "react";

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
  Database,
  Download,
  FileText,
  Layers,
  MapPin,
  MessageSquare,
  Palette,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
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

/* =========================================================
   THEME SYSTEM  — Feature 10
   Themes control decorative background SVGs around the Service Desk
   portals. They never affect functionality, analytics, or the API.
========================================================= */

const THEMES = {
  countryside: {
    label: "Countryside",
    sky: "#EBF5FF",
    ground: "#D9F7EA",
    accent1: "#6ee7b7",
    accent2: "#93c5fd",
    accent3: "#fde68a",
    description: "Soft blue sky · green fields · warm morning",
  },
  neighborhood: {
    label: "Neighborhood",
    sky: "#FFF9F2",
    ground: "#E9DEFF",
    accent1: "#c4b5fd",
    accent2: "#6ee7b7",
    accent3: "#fda4af",
    description: "Pastel houses · trees · friendly residential",
  },
  civic: {
    label: "Civic Street",
    sky: "#F0F7FF",
    ground: "#f0ede8",
    accent1: "#93c5fd",
    accent2: "#a09890",
    accent3: "#FFF0B8",
    description: "Roads · streetlights · urban civic elements",
  },
  coastal: {
    label: "Coastal",
    sky: "#DCEEFF",
    ground: "#D9F7EA",
    accent1: "#3B82F6",
    accent2: "#fde68a",
    accent3: "#fda4af",
    description: "Blue sky · sea horizon · pastel seaside",
  },
  evening: {
    label: "Evening",
    sky: "#FFF0B8",
    ground: "#FFDDE8",
    accent1: "#d97706",
    accent2: "#c4b5fd",
    accent3: "#fda4af",
    description: "Warm sunset · homes · calm evening glow",
  },
};

/* =========================================================
   PAGE ENVIRONMENT  — global illustrated world for all pages
   Renders theme-aware edge/corner decorations behind each section.
   The `page` prop selects the scene variant (command, analytics,
   forecasts, insights). ServiceDesk uses its own ThemedEnvironment.
   Opacity is lower than ServiceDesk so content stays prominent.
========================================================= */

function PageEnvironment({ theme, page = "command" }) {
  if (!theme) return null;
  const sky    = theme.sky    ?? "#EBF5FF";
  const ground = theme.ground ?? "#f0ede8";
  const a1     = theme.accent1 ?? "#93c5fd";
  const a2     = theme.accent2 ?? "#a09890";
  const a3     = theme.accent3 ?? "#FFF0B8";
  const tid    = theme.label?.toLowerCase().replace(/\s+/g, "_") ?? "civic";

  // Skyline strip shown at top-right on most pages
  const Skyline = () => (
    <svg width="320" height="130" viewBox="0 0 320 130" fill="none"
      className="absolute top-0 right-0 opacity-30 pointer-events-none"
      style={{transition:"all 0.5s"}}>
      {/* sky tint */}
      <rect x="0" y="0" width="320" height="130" fill={sky} opacity=".35"/>
      {/* distant buildings */}
      <rect x="200" y="55" width="22" height="75" rx="2" fill={a1} opacity=".4"/>
      <rect x="225" y="40" width="18" height="90" rx="2" fill={a2} opacity=".3"/>
      <rect x="246" y="60" width="26" height="70" rx="2" fill={a1} opacity=".35"/>
      <rect x="275" y="45" width="20" height="85" rx="2" fill={a2} opacity=".3"/>
      <rect x="298" y="65" width="22" height="65" rx="2" fill={a1} opacity=".3"/>
      {/* clouds */}
      <ellipse cx="80" cy="28" rx="32" ry="13" fill="white" opacity=".6"/>
      <ellipse cx="98" cy="22" rx="20" ry="11" fill="white" opacity=".65"/>
      <ellipse cx="60" cy="25" rx="15" ry="10" fill="white" opacity=".55"/>
      <ellipse cx="160" cy="18" rx="24" ry="10" fill="white" opacity=".5"/>
      <ellipse cx="176" cy="13" rx="15" ry="9" fill="white" opacity=".55"/>
      {/* birds */}
      <path d="M40 45 Q43 42 46 45" stroke={a2} strokeWidth="1.2" fill="none" opacity=".4"/>
      <path d="M52 38 Q55 35 58 38" stroke={a2} strokeWidth="1.2" fill="none" opacity=".4"/>
    </svg>
  );

  // Ground strip shown at bottom of pages
  const Ground = ({ trees = true, road = false }) => (
    <svg width="100%" height="90" viewBox="0 0 900 90" preserveAspectRatio="none" fill="none"
      className="absolute bottom-0 left-0 opacity-25 pointer-events-none"
      style={{transition:"all 0.5s"}}>
      <rect x="0" y="70" width="900" height="20" fill={ground}/>
      {road && <rect x="0" y="70" width="900" height="20" fill={a2} opacity=".15"/>}
      {road && <line x1="0" y1="80" x2="900" y2="80" stroke="white" strokeWidth="1.5"
        strokeDasharray="16,12" opacity=".25"/>}
      {trees && <>
        <rect x="60" y="44" width="5" height="26" rx="2" fill={a2} opacity=".4"/>
        <ellipse cx="62" cy="38" rx="16" ry="13" fill={a1} opacity=".22"/>
        <rect x="200" y="48" width="4" height="22" rx="1.5" fill={a2} opacity=".35"/>
        <ellipse cx="202" cy="43" rx="13" ry="11" fill={a1} opacity=".2"/>
        <rect x="420" y="45" width="5" height="25" rx="2" fill={a2} opacity=".35"/>
        <ellipse cx="422" cy="39" rx="15" ry="12" fill={a1} opacity=".2"/>
        <rect x="680" y="47" width="4" height="23" rx="1.5" fill={a2} opacity=".35"/>
        <ellipse cx="682" cy="42" rx="14" ry="11" fill={a1} opacity=".2"/>
        <rect x="820" y="44" width="5" height="26" rx="2" fill={a2} opacity=".38"/>
        <ellipse cx="822" cy="38" rx="16" ry="13" fill={a1} opacity=".22"/>
      </>}
    </svg>
  );

  // Left-side buildings/houses strip
  const LeftStrip = ({ tall = false }) => (
    <svg width="70" height="320" viewBox="0 0 70 320" fill="none"
      className="absolute left-0 top-20 opacity-22 pointer-events-none"
      style={{transition:"all 0.5s"}}>
      {tall ? <>
        {/* tall civic buildings on left */}
        <rect x="4" y="20" width="26" height="220" rx="2" fill={a1} opacity=".5"/>
        {[30,48,66,84,102,120,138,156,174,192].map((y, i) => (
          <g key={i}>
            <rect x="7" y={y} width="8" height="10" rx="1" fill={a2} opacity=".4"/>
            <rect x="18" y={y} width="8" height="10" rx="1" fill={a2} opacity=".4"/>
          </g>
        ))}
        <rect x="38" y="80" width="22" height="160" rx="2" fill={ground} opacity=".7"/>
        {[88,104,120,136,152,168,184,200].map((y, i) => (
          <rect key={i} x="42" y={y} width="14" height="9" rx="1" fill={a2} opacity=".3"/>
        ))}
      </> : <>
        {/* residential houses on left */}
        <rect x="4" y="80" width="34" height="50" rx="2" fill={a3} opacity=".45"/>
        <polygon points="0,82 21,60 42,82" fill={a2} opacity=".35"/>
        <rect x="14" y="98" width="10" height="32" rx="2" fill={a1} opacity=".25"/>
        <rect x="4" y="88" width="9" height="8" rx="1" fill={sky} opacity=".5"/>
        <rect x="28" y="88" width="9" height="8" rx="1" fill={sky} opacity=".5"/>
        <rect x="6" y="158" width="30" height="44" rx="2" fill={a1} opacity=".4"/>
        <polygon points="2,160 21,138 40,160" fill={a2} opacity=".3"/>
        <rect x="15" y="178" width="10" height="24" rx="2" fill={a3} opacity=".25"/>
        {/* tree */}
        <rect x="44" y="192" width="4" height="28" rx="1.5" fill={a2} opacity=".35"/>
        <ellipse cx="46" cy="186" rx="14" ry="12" fill={a1} opacity=".22"/>
      </>}
    </svg>
  );

  // Right-side strip (streetlight + small element)
  const RightStrip = () => (
    <svg width="55" height="300" viewBox="0 0 55 300" fill="none"
      className="absolute right-0 top-32 opacity-22 pointer-events-none"
      style={{transition:"all 0.5s"}}>
      {/* streetlight */}
      <line x1="38" y1="300" x2="38" y2="60" stroke={a2} strokeWidth="2.5" strokeLinecap="round" opacity=".5"/>
      <path d="M38 60 Q38 46 26 46" stroke={a2} strokeWidth="2.5" fill="none" opacity=".5"/>
      <ellipse cx="26" cy="46" rx="8" ry="5" fill={a3} opacity=".55"/>
      <circle cx="26" cy="46" r="3.5" fill={a1} opacity=".45"/>
      <ellipse cx="26" cy="55" rx="14" ry="8" fill={a3} opacity=".12"/>
      {/* second light lower */}
      <line x1="20" y1="300" x2="20" y2="160" stroke={a2} strokeWidth="2" strokeLinecap="round" opacity=".35"/>
      <path d="M20 160 Q20 150 10 150" stroke={a2} strokeWidth="2" fill="none" opacity=".35"/>
      <ellipse cx="10" cy="150" rx="6" ry="3.5" fill={a3} opacity=".4"/>
    </svg>
  );

  // Theme-specific top-left corner element
  const TopLeft = () => {
    if (tid === "countryside" || tid === "countryside_morning") return (
      <svg width="160" height="140" viewBox="0 0 160 140" fill="none"
        className="absolute top-0 left-0 opacity-28 pointer-events-none"
        style={{transition:"all 0.5s"}}>
        <ellipse cx="50" cy="110" rx="70" ry="40" fill={a1} opacity=".2"/>
        <rect x="85" y="72" width="38" height="50" rx="2" fill={a3} opacity=".45"/>
        <polygon points="80,74 104,50 128,74" fill={a2} opacity=".35"/>
        <rect x="95" y="92" width="12" height="30" rx="2" fill={a1} opacity=".2"/>
        <rect x="28" y="90" width="4" height="30" rx="1.5" fill={a2} opacity=".3"/>
        <ellipse cx="30" cy="84" rx="16" ry="13" fill={a1} opacity=".22"/>
        <circle cx="60" cy="120" r="4" fill={a3} opacity=".5"/>
        <circle cx="72" cy="118" r="3" fill={a3} opacity=".45"/>
        <circle cx="50" cy="122" r="2.5" fill={a3} opacity=".4"/>
      </svg>
    );
    if (tid === "coastal") return (
      <svg width="160" height="140" viewBox="0 0 160 140" fill="none"
        className="absolute top-0 left-0 opacity-28 pointer-events-none"
        style={{transition:"all 0.5s"}}>
        <rect x="0" y="70" width="160" height="70" fill={a1} opacity=".12"/>
        <path d="M0 72 Q40 62 80 70 Q120 78 160 68" stroke={a1} strokeWidth="1.5" fill="none" opacity=".4"/>
        <rect x="8" y="50" width="18" height="80" rx="2" fill="white" opacity=".6"/>
        <rect x="4" y="48" width="26" height="6" rx="2" fill={a1} opacity=".5"/>
        <ellipse cx="17" cy="42" rx="10" ry="6" fill={a3} opacity=".55"/>
        <rect x="44" y="82" width="34" height="42" rx="2" fill={a3} opacity=".4"/>
        <polygon points="40,84 61,62 82,84" fill={a2} opacity=".3"/>
        <line x1="120" y1="140" x2="126" y2="100" stroke="#a09890" strokeWidth="3" strokeLinecap="round" opacity=".4"/>
        <path d="M126,100 Q138,90 146,98" stroke={a1} strokeWidth="2.5" fill="none" opacity=".35"/>
        <path d="M126,100 Q114,88 110,98" stroke={a1} strokeWidth="2.5" fill="none" opacity=".35"/>
      </svg>
    );
    if (tid === "evening") return (
      <svg width="160" height="140" viewBox="0 0 160 140" fill="none"
        className="absolute top-0 left-0 opacity-28 pointer-events-none"
        style={{transition:"all 0.5s"}}>
        <rect x="4" y="80" width="38" height="52" rx="2" fill={a2} opacity=".35"/>
        <polygon points="0,82 23,58 46,82" fill={a2} opacity=".38"/>
        <rect x="8" y="90" width="11" height="9" rx="2" fill={a3} opacity=".7"/>
        <rect x="28" y="90" width="11" height="9" rx="2" fill={a3} opacity=".7"/>
        <rect x="14" y="108" width="14" height="24" rx="2" fill={a3} opacity=".4"/>
        <rect x="56" y="88" width="34" height="44" rx="2" fill={a2} opacity=".3"/>
        <polygon points="52,90 73,66 94,90" fill={a2} opacity=".32"/>
        <rect x="62" y="98" width="10" height="9" rx="2" fill={a3} opacity=".65"/>
        <rect x="78" y="98" width="10" height="9" rx="2" fill={a3} opacity=".65"/>
        <rect x="110" y="72" width="4" height="42" rx="1.5" fill={a2} opacity=".35"/>
        <ellipse cx="112" cy="66" rx="18" ry="14" fill={a2} opacity=".28"/>
      </svg>
    );
    if (tid === "neighborhood") return (
      <svg width="160" height="140" viewBox="0 0 160 140" fill="none"
        className="absolute top-0 left-0 opacity-28 pointer-events-none"
        style={{transition:"all 0.5s"}}>
        <rect x="4" y="76" width="36" height="50" rx="2" fill={a3} opacity=".5"/>
        <polygon points="0,78 22,52 44,78" fill={a2} opacity=".38"/>
        <rect x="10" y="104" width="12" height="22" rx="2" fill={a1} opacity=".3"/>
        <rect x="6" y="84" width="9" height="8" rx="1.5" fill={sky} opacity=".5"/>
        <rect x="27" y="84" width="9" height="8" rx="1.5" fill={sky} opacity=".5"/>
        <rect x="52" y="84" width="32" height="42" rx="2" fill={a1} opacity=".4"/>
        <polygon points="48,86 68,62 88,86" fill={a2} opacity=".32"/>
        <rect x="58" y="108" width="12" height="18" rx="2" fill={a3} opacity=".25"/>
        <rect x="100" y="90" width="4" height="26" rx="1.5" fill={a2} opacity=".3"/>
        <ellipse cx="102" cy="84" rx="14" ry="12" fill={a1} opacity=".22"/>
        <circle cx="130" cy="122" r="3" fill={a3} opacity=".5"/>
        <circle cx="140" cy="120" r="2.5" fill={a3} opacity=".45"/>
      </svg>
    );
    // civic (default)
    return (
      <svg width="160" height="140" viewBox="0 0 160 140" fill="none"
        className="absolute top-0 left-0 opacity-28 pointer-events-none"
        style={{transition:"all 0.5s"}}>
        <rect x="4" y="20" width="30" height="120" rx="2" fill={a1} opacity=".4"/>
        {[28,44,60,76,92,108,124].map((y, i) => (
          <g key={i}>
            <rect x="8" y={y} width="8" height="10" rx="1" fill={a2} opacity=".35"/>
            <rect x="20" y={y} width="8" height="10" rx="1" fill={a2} opacity=".35"/>
          </g>
        ))}
        <rect x="42" y="60" width="24" height="80" rx="2" fill={ground} opacity=".7"/>
        {[68,84,100,116].map((y, i) => (
          <rect key={i} x="46" y={y} width="16" height="9" rx="1" fill={a2} opacity=".28"/>
        ))}
        <rect x="76" y="90" width="52" height="50" rx="2" fill={a3} opacity=".4"/>
        <polygon points="72,92 102,66 132,92" fill={a3} opacity=".38"/>
        <rect x="90" y="110" width="22" height="30" rx="2" fill={a1} opacity=".22"/>
        <line x1="140" y1="140" x2="140" y2="80" stroke={a2} strokeWidth="2" opacity=".3"/>
        <ellipse cx="132" cy="80" rx="6" ry="3" fill={a3} opacity=".4"/>
      </svg>
    );
  };

  return (
    <div aria-hidden="true" className="pointer-events-none select-none absolute inset-0 overflow-hidden"
      style={{zIndex: 0, transition:"all 0.5s"}}>
      {/* Subtle sky gradient at top */}
      <div className="absolute top-0 left-0 right-0 h-48 opacity-20"
        style={{background: `linear-gradient(180deg, ${sky} 0%, transparent 100%)`, transition:"background 0.5s"}}/>
      {/* Subtle ground tint at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 opacity-15"
        style={{background: `linear-gradient(0deg, ${ground} 0%, transparent 100%)`, transition:"background 0.5s"}}/>
      <TopLeft />
      <Skyline />
      <LeftStrip tall={page === "command" || page === "analytics"} />
      <RightStrip />
      <Ground trees={true} road={page === "command" || page === "analytics"} />
    </div>
  );
}

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
  const [deskTheme, setDeskTheme] = useState("civic");

  // Imported-dataset analytics state
  const [loadedDataset, setLoadedDataset] = useState(null); // null | { loaded, dataset_tag, total_records, ... }
  const [importedAnalytics, setImportedAnalytics] = useState(null); // null | analytics response

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

    // Fetch static analytics + check for imported dataset in parallel
    Promise.all([
      // static analytics endpoints
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
      ),
      // imported dataset check
      fetch(`${DESK_API}/desk/hub/loaded-dataset`, { signal: AbortSignal.timeout(10_000) })
        .then((r) => r.json())
        .catch(() => null),
    ])
      .then(async ([staticResults, dsInfo]) => {
        const resolved = Object.fromEntries(staticResults);
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

        // If a dataset is loaded, also fetch analytics from imported records
        if (dsInfo?.loaded && dsInfo?.total_records > 0) {
          setLoadedDataset(dsInfo);
          try {
            const aRes = await fetch(`${DESK_API}/desk/hub/analytics`, { signal: AbortSignal.timeout(10_000) });
            const aData = await aRes.json();
            if (aData.data_source === "imported") {
              setImportedAnalytics(aData);
            }
          } catch {
            // analytics fetch failed — fall back to static data silently
          }
        } else {
          setLoadedDataset(dsInfo?.loaded === false ? dsInfo : null);
          setImportedAnalytics(null);
        }

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

  // When an imported dataset is active, use its analytics over the static data
  const activeCategories = importedAnalytics ? importedAnalytics.categories : data.categories;
  const activeWards      = importedAnalytics ? importedAnalytics.wards      : data.wards;
  const activeStatuses   = importedAnalytics ? importedAnalytics.statuses   : data.statuses;
  const activeMonthly    = importedAnalytics ? importedAnalytics.monthly    : data.monthly;
  const activeMetricsRaw = importedAnalytics ? importedAnalytics.metrics    : data.metrics;

  const metrics = useMemo(() => {
    const rows = Array.isArray(activeMetricsRaw) ? activeMetricsRaw : [];
    const findMetric = (key) => {
      const row = rows.find((item) => item.metric === key);
      return row?.value ?? null;
    };
    return {
      total:   findMetric("total_grievances")    !== null ? Number(findMetric("total_grievances"))    : null,
      closure: findMetric("closed_rate_percent") !== null ? Number(findMetric("closed_rate_percent")) : null,
      wards:   findMetric("unique_wards")        !== null ? Number(findMetric("unique_wards"))        : null,
    };
  }, [activeMetricsRaw]);

  const totalGrievances = metrics.total;
  const closureRate     = metrics.closure;
  const wardCount       = metrics.wards;

  if (loading) return <LoadingScreen />;
  if (apiError) return <ApiErrorScreen onRetry={loadData} />;

  const theme = THEMES[deskTheme] ?? THEMES.civic;

  return (
    <div className="flex min-h-screen bg-[#FFF9F2] text-[#1a1917]">

      {/* SIDEBAR — desktop */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        metadata={importedAnalytics?.metadata ?? data.metadata}
        loadedDataset={loadedDataset}
        theme={theme}
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 min-h-screen overflow-y-auto pb-16 md:pb-0">

        {activeSection === "command" && (
          <CommandCentreSection
            totalGrievances={totalGrievances}
            closureRate={closureRate}
            wardCount={wardCount}
            forecastSummary={data.forecastSummary}
            monthly={activeMonthly}
            categories={activeCategories}
            wards={activeWards}
            statuses={activeStatuses}
            metadata={importedAnalytics?.metadata ?? data.metadata}
            loadedDataset={loadedDataset}
            importedAnalytics={importedAnalytics}
            theme={theme}
          />
        )}

        {activeSection === "analytics" && (
          <AnalyticsSection
            categories={activeCategories}
            categorySubcategory={data.categorySubcategory}
            categoryWard={data.categoryWard}
            categoryMonth={data.categoryMonth}
            categoryStatus={data.categoryStatus}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            loadedDataset={loadedDataset}
            importedAnalytics={importedAnalytics}
            theme={theme}
          />
        )}

        {activeSection === "forecasts" && (
          <ForecastsSection
            evaluation={data.forecastEvaluation}
            forecast={data.forecastDashboard}
            summary={data.forecastSummary}
            theme={theme}
          />
        )}

        {activeSection === "insights" && (
          <InsightsSection
            data={data}
            totalGrievances={totalGrievances}
            theme={theme}
          />
        )}

        {activeSection === "desk" && (
          <ServiceDeskSection
            categories={data.categories}
            wards={data.wards}
            deskTheme={deskTheme}
            setDeskTheme={setDeskTheme}
          />
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

function Sidebar({ activeSection, setActiveSection, metadata, loadedDataset, _theme }) {
  const dateStr = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  const isImported = loadedDataset?.loaded && loadedDataset?.total_records > 0;

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

      {/* Footer metadata — reflects active dataset */}
      <div className="px-5 py-4 border-t border-[#e8e4dd]">
        {isImported ? (
          <>
            <div
              className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-[0.12em]"
              style={{ background: PASTELS.mint.bg, color: PASTELS.mint.strong, border: `1px solid ${PASTELS.mint.border}` }}
            >
              <Database size={9} />
              IMPORTED DATASET
            </div>
            <p className="text-[10px] text-[#a09890] leading-5">
              <span className="font-semibold text-[#6b6560]">{loadedDataset.dataset_tag}</span><br />
              {loadedDataset.total_records?.toLocaleString("en-IN")} records
              {loadedDataset.date_range?.from && (
                <><br />{loadedDataset.date_range.from} – {loadedDataset.date_range.to}</>
              )}
            </p>
          </>
        ) : (
          <>
            {metadata?.date_min && (
              <p className="text-[10px] text-[#a09890] leading-5">
                <span className="font-semibold text-[#6b6560]">BBMP 2025 dataset</span><br />
                {dateStr(metadata.date_min)} – {dateStr(metadata.date_max)}
              </p>
            )}
            <p className="mt-2 text-[10px] text-[#a09890]">Demo data · v2.0</p>
          </>
        )}
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

function DataSourceBadge({ loadedDataset, importedAnalytics }) {
  const isImported = importedAnalytics && importedAnalytics.data_source === "imported";

  if (isImported) {
    const ds = loadedDataset ?? {};
    const tag   = importedAnalytics.dataset_tag ?? ds.dataset_tag ?? "imported";
    const total = importedAnalytics.metadata?.total_records ?? ds.total_records ?? "—";
    const dMin  = importedAnalytics.metadata?.date_min ?? ds.date_range?.from;
    const dMax  = importedAnalytics.metadata?.date_max ?? ds.date_range?.to;
    return (
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2 border text-xs"
        style={{ background: PASTELS.mint.bg, borderColor: PASTELS.mint.border, color: PASTELS.mint.strong }}
      >
        <Database size={12} />
        <span>
          <span className="font-semibold">Imported dataset</span>
          {" · "}{tag}
          {" · "}{typeof total === "number" ? total.toLocaleString("en-IN") : total} records
          {dMin && dMax && <> · {dMin} – {dMax}</>}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2 border text-xs"
      style={{ background: PASTELS.blue.bg, borderColor: PASTELS.blue.border, color: PASTELS.blue.strong }}
    >
      <Database size={12} />
      <span><span className="font-semibold">BBMP 2025 demo dataset</span> · Historical grievance data</span>
    </div>
  );
}


function CommandCentreSection({
  totalGrievances, closureRate, wardCount,
  forecastSummary, monthly, categories, wards, statuses, metadata,
  loadedDataset, importedAnalytics, theme,
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
    <div className="relative">
      <PageEnvironment theme={theme} page="command" />
      <div className="relative z-10">
      <PageHeading
        title="Command Centre"
        subtitle="Executive overview of civic grievance intelligence"
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
            CivicSense transforms civic grievance data into structured
            intelligence — revealing demand patterns, operational signals, and
            forward-looking planning insights.
          </p>
        </div>

        {/* Data source badge — reflects active dataset */}
        <DataSourceBadge loadedDataset={loadedDataset} importedAnalytics={importedAnalytics} />

        {/* KPI grid */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            icon={Activity}
            label="TOTAL GRIEVANCES"
            value={totalGrievances != null ? formatNumber(totalGrievances) : "—"}
            sub={importedAnalytics ? "Imported dataset" : "BBMP · 2025 dataset"}
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

        {/* Data source clarity — dynamic based on active dataset */}
        <div className="rounded-2xl border border-[#e8e4dd] bg-[#f5f3ef] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Database size={14} style={{ color: PASTELS.lavender.text }} />
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890]">DATA STREAMS</p>
              {importedAnalytics ? (
                <p className="text-xs text-[#6b6560]">
                  <span className="font-semibold text-[#1a1917]">Analytics:</span>{" "}
                  Imported dataset ({importedAnalytics.dataset_tag}).{" "}
                  <span className="font-semibold text-[#1a1917]">Operational:</span>{" "}
                  Citizen complaints via Service Desk (desk.db).
                </p>
              ) : (
                <p className="text-xs text-[#6b6560]">
                  <span className="font-semibold text-[#1a1917]">Analytics:</span>{" "}
                  BBMP 2025 demo dataset — powers analytics &amp; forecasts.{" "}
                  <span className="font-semibold text-[#1a1917]">Operational:</span>{" "}
                  Citizen complaints via Service Desk (desk.db).
                </p>
              )}
            </div>
          </div>
          {metadata?.date_min && (
            <p className="text-xs text-[#a09890] shrink-0">
              {dateStr(metadata.date_min)} – {dateStr(metadata.date_max)}
            </p>
          )}
        </div>

      </div>
      </div> {/* end z-10 */}
    </div>
  );
}


/* =========================================================
   ANALYTICS SECTION
========================================================= */

function AnalyticsSection({
  categories, categorySubcategory, categoryWard, categoryMonth, categoryStatus,
  selectedCategory, setSelectedCategory,
  loadedDataset, importedAnalytics, theme,
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
    <div className="relative">
      <PageEnvironment theme={theme} page="analytics" />
      <div className="relative z-10">
      <PageHeading
        title="Analytics"
        subtitle="Drill into any civic demand category — subcategory, ward, time, status"
        icon={BarChart3}
        accentColor={PASTELS.lavender.text}
        accentBg={PASTELS.lavender.bg}
      />

      <div className="px-6 md:px-8 py-6 space-y-6">

        {/* Data source badge */}
        <DataSourceBadge loadedDataset={loadedDataset} importedAnalytics={importedAnalytics} />

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
      </div> {/* end z-10 */}
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

function ForecastsSection({ evaluation, forecast, summary, theme }) {
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
    <div className="relative">
      <PageEnvironment theme={theme} page="forecasts" />
      <div className="relative z-10">
      <PageHeading
        title="Forecasts"
        subtitle="14-day planning signal with model evaluation and performance metrics"
        icon={TrendingUp}
        accentColor={PASTELS.butter.text}
        accentBg={PASTELS.butter.bg}
      />

      <div className="px-6 md:px-8 py-6 space-y-6">

        {/* Forecast safety note — Feature 7 */}
        <div
          className="rounded-2xl border px-5 py-4 flex items-start gap-3"
          style={{ background: PASTELS.butter.bg, borderColor: PASTELS.butter.border }}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: PASTELS.butter.strong }} />
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em]" style={{ color: PASTELS.butter.strong }}>
              FORECAST SOURCE
            </p>
            <p className="mt-0.5 text-xs text-[#6b6560] leading-5">
              These forecasts are generated from the <strong className="text-[#1a1917]">2025 BBMP historical dataset</strong>.
              If you load a new dataset via the Service Desk Data Hub, forecasts will only be regenerated
              when the loaded dataset contains sufficient chronological history (≥ 90 days).
              Otherwise: <em>"Forecast unavailable: insufficient chronological history."</em>
            </p>
          </div>
        </div>

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
      </div> {/* end z-10 */}
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

function InsightsSection({ data, totalGrievances, theme }) {
  const insights = buildInsights(data, totalGrievances);

  return (
    <div className="relative">
      <PageEnvironment theme={theme} page="insights" />
      <div className="relative z-10">
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
      </div>{/* end z-10 */}
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
/* eslint-disable react/display-name */
function ThemedEnvironment({ theme }) {
  const sky    = theme?.sky    ?? "#EBF5FF";
  const ground = theme?.ground ?? "#f0ede8";
  const a1     = theme?.accent1 ?? "#93c5fd";
  const a2     = theme?.accent2 ?? "#a09890";
  const a3     = theme?.accent3 ?? "#FFF0B8";
  const id     = theme?.label?.toLowerCase().replace(/\s+/g, "_") ?? "civic";

  const wrapper = (children) => (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none absolute inset-0 overflow-hidden"
      style={{ transition: "background 0.5s", background: `linear-gradient(180deg, ${sky} 0%, transparent 28%)` }}
    >
      {children}
    </div>
  );

  /* ---- 1. COUNTRYSIDE MORNING ---- */
  if (id === "countryside_morning" || id === "countryside") return wrapper(
    <>
      {/* Top-left: hills + farmhouse + oak trees */}
      <svg width="220" height="200" viewBox="0 0 220 200" fill="none" className="absolute top-0 left-0 opacity-75" style={{transition:"all 0.5s"}}>
        {/* distant hills */}
        <ellipse cx="60" cy="160" rx="90" ry="50" fill={a1} opacity=".25"/>
        <ellipse cx="160" cy="170" rx="80" ry="45" fill={a1} opacity=".18"/>
        {/* ground */}
        <rect x="0" y="178" width="220" height="22" fill={ground}/>
        {/* path */}
        <path d="M80 200 Q90 185 100 178" stroke={a2} strokeWidth="3" fill="none" strokeLinecap="round"/>
        {/* farmhouse */}
        <rect x="110" y="130" width="50" height="48" rx="3" fill={a3} stroke={a2} strokeWidth="1.2"/>
        <polygon points="105,132 135,108 165,132" fill={a2}/>
        <rect x="126" y="155" width="18" height="23" rx="2" fill={a1} opacity=".4"/>
        {/* window */}
        <rect x="112" y="138" width="12" height="10" rx="2" fill={sky} stroke={a2} strokeWidth="1"/>
        <rect x="148" y="138" width="12" height="10" rx="2" fill={sky} stroke={a2} strokeWidth="1"/>
        {/* chimney */}
        <rect x="150" y="112" width="7" height="22" rx="1" fill={a2}/>
        {/* oak tree 1 */}
        <rect x="62" y="148" width="5" height="32" rx="2" fill="#a09890"/>
        <ellipse cx="64" cy="140" rx="18" ry="16" fill={a1} opacity=".65"/>
        <ellipse cx="72" cy="148" rx="12" ry="11" fill={a1} opacity=".55"/>
        {/* oak tree 2 */}
        <rect x="90" y="152" width="4" height="26" rx="1.5" fill="#a09890"/>
        <ellipse cx="92" cy="144" rx="14" ry="13" fill={a1} opacity=".6"/>
        {/* flowers */}
        <circle cx="85" cy="177" r="3" fill={a3}/>
        <circle cx="92" cy="175" r="2.5" fill={a3}/>
        <circle cx="75" cy="179" r="2" fill={a3}/>
        {/* fence posts */}
        <rect x="168" y="155" width="3" height="22" rx="1" fill={a2}/>
        <rect x="178" y="155" width="3" height="22" rx="1" fill={a2}/>
        <rect x="188" y="155" width="3" height="22" rx="1" fill={a2}/>
        <line x1="168" y1="162" x2="191" y2="162" stroke={a2} strokeWidth="1.5"/>
        <line x1="168" y1="170" x2="191" y2="170" stroke={a2} strokeWidth="1.5"/>
      </svg>
      {/* Top-right: sky elements — birds + sun */}
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none" className="absolute top-0 right-0 opacity-70" style={{transition:"all 0.5s"}}>
        {/* sun */}
        <circle cx="180" cy="35" r="22" fill={a3} opacity=".75"/>
        <circle cx="180" cy="35" r="16" fill={a3}/>
        {/* sun rays */}
        {[0,30,60,90,120,150,210,240,270,300,330].map((deg, i) => (
          <line key={i} x1={180 + 19*Math.cos(deg*Math.PI/180)} y1={35 + 19*Math.sin(deg*Math.PI/180)}
            x2={180 + 28*Math.cos(deg*Math.PI/180)} y2={35 + 28*Math.sin(deg*Math.PI/180)}
            stroke={a3} strokeWidth="2" strokeLinecap="round"/>
        ))}
        {/* clouds */}
        <ellipse cx="80" cy="30" rx="28" ry="13" fill="white" opacity=".85"/>
        <ellipse cx="96" cy="24" rx="18" ry="12" fill="white" opacity=".9"/>
        <ellipse cx="65" cy="27" rx="14" ry="10" fill="white" opacity=".8"/>
        <ellipse cx="30" cy="50" rx="20" ry="9" fill="white" opacity=".7"/>
        {/* birds (V shapes) */}
        <path d="M130 55 Q133 52 136 55" stroke={a2} strokeWidth="1.5" fill="none"/>
        <path d="M140 48 Q143 45 146 48" stroke={a2} strokeWidth="1.5" fill="none"/>
        <path d="M150 60 Q153 57 156 60" stroke={a2} strokeWidth="1.5" fill="none"/>
      </svg>
      {/* Bottom-left: figure walking on path */}
      <svg width="160" height="100" viewBox="0 0 160 100" fill="none" className="absolute bottom-0 left-0 opacity-70" style={{transition:"all 0.5s"}}>
        <rect x="0" y="88" width="160" height="12" fill={ground}/>
        <path d="M0 88 Q40 82 80 88 Q120 94 160 88" stroke={a2} strokeWidth="1.5" fill="none"/>
        {/* figure */}
        <circle cx="50" cy="60" r="7" fill={a2}/>
        <line x1="50" y1="67" x2="50" y2="82" stroke={a2} strokeWidth="2"/>
        <line x1="50" y1="72" x2="44" y2="79" stroke={a2} strokeWidth="1.5"/>
        <line x1="50" y1="72" x2="56" y2="79" stroke={a2} strokeWidth="1.5"/>
        <line x1="50" y1="82" x2="44" y2="92" stroke={a2} strokeWidth="1.5"/>
        <line x1="50" y1="82" x2="56" y2="92" stroke={a2} strokeWidth="1.5"/>
        {/* bush */}
        <ellipse cx="120" cy="84" rx="16" ry="10" fill={a1} opacity=".6"/>
        <ellipse cx="130" cy="80" rx="12" ry="9" fill={a1} opacity=".5"/>
      </svg>
      {/* Bottom-right: more trees + fence */}
      <svg width="180" height="110" viewBox="0 0 180 110" fill="none" className="absolute bottom-0 right-0 opacity-70" style={{transition:"all 0.5s"}}>
        <rect x="0" y="98" width="180" height="12" fill={ground}/>
        <rect x="120" y="60" width="5" height="38" rx="2" fill="#a09890"/>
        <ellipse cx="122" cy="52" rx="20" ry="17" fill={a1} opacity=".6"/>
        <ellipse cx="132" cy="58" rx="14" ry="12" fill={a1} opacity=".5"/>
        <rect x="150" y="66" width="4" height="32" rx="1.5" fill="#a09890"/>
        <ellipse cx="152" cy="60" rx="15" ry="13" fill={a1} opacity=".55"/>
        {/* flowers on ground */}
        <circle cx="40" cy="96" r="3" fill={a3}/>
        <circle cx="55" cy="98" r="2.5" fill={a3}/>
        <circle cx="70" cy="95" r="2" fill={a3} opacity=".8"/>
      </svg>
    </>
  );

  /* ---- 2. NEIGHBORHOOD ---- */
  if (id === "neighborhood") return wrapper(
    <>
      {/* Top-left: colourful row houses */}
      <svg width="240" height="200" viewBox="0 0 240 200" fill="none" className="absolute top-0 left-0 opacity-72" style={{transition:"all 0.5s"}}>
        <rect x="0" y="178" width="240" height="22" fill={ground}/>
        {/* house 1 (lavender) */}
        <rect x="8" y="120" width="44" height="60" rx="3" fill={a3}/>
        <polygon points="4,122 30,92 56,122" fill={a2}/>
        <rect x="18" y="148" width="14" height="32" rx="2" fill={a1} opacity=".5"/>
        <rect x="10" y="126" width="10" height="10" rx="2" fill={sky} stroke={a2} strokeWidth="1"/>
        <rect x="35" y="126" width="10" height="10" rx="2" fill={sky} stroke={a2} strokeWidth="1"/>
        {/* house 2 (mint) */}
        <rect x="58" y="130" width="40" height="50" rx="3" fill={a1} opacity=".6"/>
        <polygon points="54,132 78,106 102,132" fill={a2} opacity=".8"/>
        <rect x="68" y="156" width="12" height="24" rx="2" fill={a3} opacity=".5"/>
        <rect x="60" y="138" width="9" height="8" rx="1.5" fill={sky} stroke={a2} strokeWidth="1"/>
        <rect x="82" y="138" width="9" height="8" rx="1.5" fill={sky} stroke={a2} strokeWidth="1"/>
        {/* house 3 (accent) */}
        <rect x="104" y="118" width="48" height="62" rx="3" fill={a3} opacity=".7"/>
        <polygon points="100,120 128,90 156,120" fill={a2}/>
        <rect x="116" y="146" width="16" height="34" rx="2" fill={a1} opacity=".4"/>
        <rect x="106" y="126" width="11" height="10" rx="2" fill={sky} stroke={a2} strokeWidth="1"/>
        <rect x="136" y="126" width="11" height="10" rx="2" fill={sky} stroke={a2} strokeWidth="1"/>
        {/* small tree between houses */}
        <rect x="158" y="148" width="4" height="30" rx="1.5" fill="#a09890"/>
        <ellipse cx="160" cy="140" rx="16" ry="14" fill={a1} opacity=".6"/>
        {/* garden fence */}
        <line x1="58" y1="178" x2="58" y2="162" stroke={a2} strokeWidth="2"/>
        <line x1="66" y1="178" x2="66" y2="162" stroke={a2} strokeWidth="2"/>
        <line x1="74" y1="178" x2="74" y2="162" stroke={a2} strokeWidth="2"/>
        <line x1="82" y1="178" x2="82" y2="162" stroke={a2} strokeWidth="2"/>
        <line x1="58" y1="167" x2="82" y2="167" stroke={a2} strokeWidth="1.5"/>
      </svg>
      {/* Top-right: clouds + more houses */}
      <svg width="200" height="160" viewBox="0 0 200 160" fill="none" className="absolute top-0 right-0 opacity-68" style={{transition:"all 0.5s"}}>
        <ellipse cx="80" cy="28" rx="30" ry="14" fill="white" opacity=".85"/>
        <ellipse cx="96" cy="22" rx="20" ry="12" fill="white" opacity=".9"/>
        <ellipse cx="64" cy="25" rx="15" ry="10" fill="white" opacity=".8"/>
        <ellipse cx="160" cy="18" rx="22" ry="10" fill="white" opacity=".75"/>
        {/* house 4 */}
        <rect x="120" y="110" width="44" height="50" rx="3" fill={a3}/>
        <polygon points="116,112 142,84 168,112" fill={a2}/>
        <rect x="132" y="136" width="12" height="24" rx="2" fill={a1} opacity=".45"/>
        <rect x="122" y="118" width="10" height="9" rx="2" fill={sky} stroke={a2} strokeWidth="1"/>
        <rect x="149" y="118" width="10" height="9" rx="2" fill={sky} stroke={a2} strokeWidth="1"/>
        {/* chimney */}
        <rect x="152" y="90" width="6" height="22" rx="1" fill={a2}/>
      </svg>
      {/* Bottom-left: bicycle + path */}
      <svg width="200" height="110" viewBox="0 0 200 110" fill="none" className="absolute bottom-0 left-0 opacity-68" style={{transition:"all 0.5s"}}>
        <rect x="0" y="98" width="200" height="12" fill={ground}/>
        <path d="M0 98 Q50 90 100 98 Q150 106 200 98" stroke={a2} strokeWidth="1.5" fill="none" opacity=".5"/>
        {/* bicycle */}
        <circle cx="80" cy="85" r="15" stroke="#6b6560" strokeWidth="2" fill="none"/>
        <circle cx="80" cy="85" r="4" fill="#6b6560"/>
        <circle cx="120" cy="85" r="15" stroke="#6b6560" strokeWidth="2" fill="none"/>
        <circle cx="120" cy="85" r="4" fill="#6b6560"/>
        <polyline points="80,85 96,64 112,85" stroke="#6b6560" strokeWidth="2" fill="none"/>
        <line x1="96" y1="64" x2="120" y2="85" stroke="#6b6560" strokeWidth="2"/>
        <line x1="107" y1="68" x2="117" y2="63" stroke="#6b6560" strokeWidth="2"/>
        <rect x="84" y="57" width="14" height="4" rx="2" fill="#6b6560"/>
        {/* person on bike */}
        <circle cx="96" cy="54" r="6" fill={a3} stroke={a2} strokeWidth="1"/>
        {/* flowers alongside path */}
        <circle cx="30" cy="96" r="3" fill={a3}/>
        <circle cx="40" cy="94" r="2.5" fill={a3}/>
        <circle cx="155" cy="96" r="3" fill={a3}/>
        <circle cx="168" cy="94" r="2.5" fill={a3}/>
      </svg>
      {/* Bottom-right: tree + bench */}
      <svg width="160" height="100" viewBox="0 0 160 100" fill="none" className="absolute bottom-0 right-0 opacity-65" style={{transition:"all 0.5s"}}>
        <rect x="0" y="88" width="160" height="12" fill={ground}/>
        <rect x="90" y="52" width="5" height="36" rx="2" fill="#a09890"/>
        <ellipse cx="92" cy="44" rx="22" ry="18" fill={a1} opacity=".6"/>
        <ellipse cx="104" cy="50" rx="15" ry="12" fill={a1} opacity=".5"/>
        {/* bench */}
        <rect x="20" y="76" width="42" height="6" rx="2" fill={a2}/>
        <rect x="22" y="70" width="4" height="20" rx="1" fill={a2}/>
        <rect x="56" y="70" width="4" height="20" rx="1" fill={a2}/>
        <rect x="20" y="74" width="42" height="4" rx="1" fill={a2} opacity=".6"/>
      </svg>
    </>
  );

  /* ---- 3. CIVIC STREET (default) ---- */
  if (id === "civic_street" || id === "civic") return wrapper(
    <>
      {/* Top-left: tall office buildings */}
      <svg width="200" height="220" viewBox="0 0 200 220" fill="none" className="absolute top-0 left-0 opacity-70" style={{transition:"all 0.5s"}}>
        <rect x="0" y="198" width="200" height="22" fill={ground}/>
        {/* road marking */}
        <rect x="30" y="198" width="140" height="22" fill={a2} opacity=".12"/>
        <line x1="90" y1="198" x2="90" y2="220" stroke="white" strokeWidth="2" strokeDasharray="6,6" opacity=".5"/>
        {/* building 1 tall */}
        <rect x="8" y="50" width="42" height="150" rx="3" fill={sky} stroke={a1} strokeWidth="1.2"/>
        {[58,74,90,106,122,138,154,170].map((y, i) => (
          <g key={i}>
            <rect x="14" y={y} width="9" height="11" rx="1.5" fill={a1} opacity=".55"/>
            <rect x="29" y={y} width="9" height="11" rx="1.5" fill={a1} opacity=".55"/>
          </g>
        ))}
        <rect x="20" y="42" width="18" height="10" rx="2" fill={a2}/>
        <rect x="24" y="34" width="10" height="10" rx="1" fill={a2}/>
        {/* building 2 medium */}
        <rect x="58" y="90" width="36" height="110" rx="3" fill={ground} stroke={a2} strokeWidth="1.2"/>
        {[98,112,126,140,154,168].map((y, i) => (
          <g key={i}>
            <rect x="64" y={y} width="8" height="10" rx="1.5" fill={a2} opacity=".5"/>
            <rect x="78" y={y} width="8" height="10" rx="1.5" fill={a2} opacity=".5"/>
          </g>
        ))}
        {/* civic hall */}
        <rect x="104" y="128" width="52" height="72" rx="3" fill={a3} stroke={a3} strokeWidth="1.2"/>
        <polygon points="100,130 130,100 160,130" fill={a3}/>
        <rect x="118" y="154" width="24" height="46" rx="2" fill={a1} opacity=".3"/>
        {/* columns */}
        <rect x="108" y="132" width="5" height="70" rx="1" fill={a1} opacity=".3"/>
        <rect x="118" y="132" width="5" height="70" rx="1" fill={a1} opacity=".3"/>
        <rect x="143" y="132" width="5" height="70" rx="1" fill={a1} opacity=".3"/>
        <rect x="153" y="132" width="5" height="70" rx="1" fill={a1} opacity=".3"/>
        {/* flagpole */}
        <line x1="130" y1="82" x2="130" y2="102" stroke="#a09890" strokeWidth="1.5"/>
        <rect x="130" y="82" width="16" height="10" rx="1.5" fill={a3} stroke={a1} strokeWidth="1"/>
        {/* streetlight left */}
        <line x1="180" y1="220" x2="180" y2="150" stroke={a2} strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M180 150 Q180 138 168 138" stroke={a2} strokeWidth="2.5" fill="none"/>
        <ellipse cx="168" cy="138" rx="7" ry="4" fill={a3}/>
        <circle cx="168" cy="138" r="3" fill={a1} opacity=".5"/>
      </svg>
      {/* Top-right: sky + utility pole */}
      <svg width="200" height="150" viewBox="0 0 200 150" fill="none" className="absolute top-0 right-0 opacity-65" style={{transition:"all 0.5s"}}>
        {/* clouds */}
        <ellipse cx="80" cy="30" rx="32" ry="15" fill="white" opacity=".8"/>
        <ellipse cx="98" cy="22" rx="22" ry="14" fill="white" opacity=".85"/>
        <ellipse cx="62" cy="27" rx="16" ry="12" fill="white" opacity=".75"/>
        {/* utility pole */}
        <line x1="170" y1="150" x2="170" y2="40" stroke={a2} strokeWidth="3"/>
        <line x1="155" y1="60" x2="185" y2="60" stroke={a2} strokeWidth="2"/>
        <line x1="152" y1="72" x2="188" y2="72" stroke={a2} strokeWidth="2"/>
        <circle cx="158" cy="60" r="3" fill={a3}/>
        <circle cx="182" cy="60" r="3" fill={a3}/>
        <circle cx="155" cy="72" r="3" fill={a3}/>
        <circle cx="185" cy="72" r="3" fill={a3}/>
        {/* wires */}
        <path d="M0 80 Q85 70 170 72" stroke={a2} strokeWidth="1" fill="none" opacity=".5"/>
        <path d="M0 68 Q85 58 170 60" stroke={a2} strokeWidth="1" fill="none" opacity=".5"/>
      </svg>
      {/* Bottom-left: bus */}
      <svg width="210" height="120" viewBox="0 0 210 120" fill="none" className="absolute bottom-0 left-0 opacity-68" style={{transition:"all 0.5s"}}>
        <rect x="0" y="106" width="210" height="14" fill={ground}/>
        <line x1="0" y1="108" x2="210" y2="108" stroke="white" strokeWidth="1.5" strokeDasharray="10,8" opacity=".4"/>
        {/* bus body */}
        <rect x="15" y="64" width="140" height="40" rx="6" fill={a1}/>
        <rect x="15" y="64" width="140" height="10" rx="5" fill={a2} opacity=".4"/>
        {/* wheels */}
        <circle cx="45" cy="104" r="14" stroke="#555" strokeWidth="2" fill="#ddd"/>
        <circle cx="45" cy="104" r="6" fill="#555"/>
        <circle cx="125" cy="104" r="14" stroke="#555" strokeWidth="2" fill="#ddd"/>
        <circle cx="125" cy="104" r="6" fill="#555"/>
        {/* windows */}
        <rect x="22" y="70" width="16" height="14" rx="3" fill={sky} opacity=".8"/>
        <rect x="44" y="70" width="16" height="14" rx="3" fill={sky} opacity=".8"/>
        <rect x="66" y="70" width="16" height="14" rx="3" fill={sky} opacity=".8"/>
        <rect x="88" y="70" width="16" height="14" rx="3" fill={sky} opacity=".8"/>
        <rect x="110" y="70" width="16" height="14" rx="3" fill={sky} opacity=".8"/>
        {/* BBMP sign */}
        <rect x="20" y="86" width="32" height="12" rx="2" fill="white" opacity=".8"/>
        <text x="36" y="96" textAnchor="middle" fontSize="7" fill="#555" fontFamily="system-ui">BBMP</text>
        {/* front */}
        <rect x="147" y="68" width="8" height="20" rx="2" fill={sky} opacity=".6"/>
        <circle cx="151" cy="102" r="6" fill="#ccc" stroke="#555" strokeWidth="1.5"/>
      </svg>
      {/* Bottom-right: auto-rickshaw + sign */}
      <svg width="200" height="120" viewBox="0 0 200 120" fill="none" className="absolute bottom-0 right-0 opacity-68" style={{transition:"all 0.5s"}}>
        <rect x="0" y="106" width="200" height="14" fill={ground}/>
        {/* auto-rickshaw */}
        <rect x="30" y="70" width="110" height="34" rx="8" fill={a3} stroke={a3} strokeWidth="1.2"/>
        <rect x="30" y="70" width="110" height="8" rx="5" fill={a1} opacity=".5"/>
        <rect x="118" y="76" width="22" height="22" rx="4" fill={sky} stroke={a1} strokeWidth="1"/>
        <circle cx="58" cy="104" r="13" stroke="#555" strokeWidth="2" fill="#ddd"/>
        <circle cx="58" cy="104" r="5" fill="#555"/>
        <circle cx="128" cy="104" r="13" stroke="#555" strokeWidth="2" fill="#ddd"/>
        <circle cx="128" cy="104" r="5" fill="#555"/>
        <rect x="80" y="77" width="30" height="20" rx="3" fill={sky} stroke={a1} strokeWidth="1"/>
        <line x1="82" y1="70" x2="82" y2="58" stroke="#a09890" strokeWidth="1.5"/>
        <polygon points="82,58 94,63 82,68" fill={a3} stroke={a1} strokeWidth="1"/>
        {/* civic sign board */}
        <rect x="160" y="60" width="32" height="22" rx="3" fill="white" stroke={a1} strokeWidth="1"/>
        <text x="176" y="75" textAnchor="middle" fontSize="7" fill="#6b6560" fontFamily="system-ui">CIVIC</text>
        <text x="176" y="83" textAnchor="middle" fontSize="6" fill={a2} fontFamily="system-ui">CENTRE</text>
        <line x1="176" y1="82" x2="176" y2="106" stroke={a2} strokeWidth="1.5"/>
      </svg>
    </>
  );

  /* ---- 4. COASTAL ---- */
  if (id === "coastal") return wrapper(
    <>
      {/* Sea horizon + lighthouse — top section */}
      <svg width="100%" height="160" viewBox="0 0 800 160" preserveAspectRatio="none" fill="none"
        className="absolute top-0 left-0 opacity-55" style={{transition:"all 0.5s"}}>
        <rect x="0" y="80" width="800" height="80" fill={a1} opacity=".25"/>
        <path d="M0 82 Q200 70 400 80 Q600 90 800 78" stroke={a1} strokeWidth="1.5" fill="none" opacity=".6"/>
        <path d="M0 90 Q200 78 400 88 Q600 98 800 86" stroke={a1} strokeWidth="1" fill="none" opacity=".4"/>
      </svg>
      {/* Top-left: coastal houses + lighthouse */}
      <svg width="220" height="200" viewBox="0 0 220 200" fill="none" className="absolute top-0 left-0 opacity-72" style={{transition:"all 0.5s"}}>
        <rect x="0" y="178" width="220" height="22" fill={ground}/>
        {/* lighthouse */}
        <rect x="12" y="70" width="24" height="110" rx="3" fill="white" stroke={a1} strokeWidth="1.5"/>
        <rect x="8" y="68" width="32" height="8" rx="2" fill={a1}/>
        {/* lighthouse stripes */}
        <rect x="12" y="85" width="24" height="10" fill={a1} opacity=".4"/>
        <rect x="12" y="110" width="24" height="10" fill={a1} opacity=".4"/>
        <rect x="12" y="135" width="24" height="10" fill={a1} opacity=".4"/>
        {/* lighthouse light */}
        <ellipse cx="24" cy="62" rx="12" ry="8" fill={a3}/>
        <circle cx="24" cy="62" r="5" fill={a3} opacity=".9"/>
        {/* lighthouse door */}
        <rect x="18" y="164" width="12" height="18" rx="6" fill={a1} opacity=".5"/>
        {/* coastal house 1 */}
        <rect x="52" y="130" width="44" height="50" rx="3" fill={a3}/>
        <polygon points="48,132 74,108 100,132" fill={a2}/>
        <rect x="64" y="154" width="12" height="26" rx="2" fill={a1} opacity=".4"/>
        <rect x="54" y="140" width="10" height="9" rx="2" fill={sky} stroke={a2} strokeWidth="1"/>
        <rect x="82" y="140" width="10" height="9" rx="2" fill={sky} stroke={a2} strokeWidth="1"/>
        {/* coastal house 2 */}
        <rect x="106" y="138" width="40" height="42" rx="3" fill={a1} opacity=".6"/>
        <polygon points="102,140 126,116 150,140" fill={a2} opacity=".8"/>
        <rect x="116" y="158" width="12" height="22" rx="2" fill={a3} opacity=".5"/>
        {/* palm tree 1 */}
        <line x1="162" y1="178" x2="168" y2="132" stroke="#a09890" strokeWidth="4" strokeLinecap="round"/>
        <path d="M168,132 Q180,120 190,128" stroke={a1} strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M168,132 Q155,118 150,130" stroke={a1} strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M168,132 Q172,115 182,118" stroke={a1} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <path d="M168,132 Q160,115 154,120" stroke={a1} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        {/* waves on ground */}
        <path d="M0 180 Q30 175 60 180 Q90 185 120 180" stroke={a1} strokeWidth="1.5" fill="none" opacity=".5"/>
      </svg>
      {/* Top-right: boats + sky */}
      <svg width="220" height="160" viewBox="0 0 220 160" fill="none" className="absolute top-0 right-0 opacity-68" style={{transition:"all 0.5s"}}>
        {/* sky clouds */}
        <ellipse cx="60" cy="24" rx="28" ry="12" fill="white" opacity=".8"/>
        <ellipse cx="76" cy="18" rx="18" ry="11" fill="white" opacity=".85"/>
        <ellipse cx="44" cy="21" rx="14" ry="9" fill="white" opacity=".75"/>
        {/* sun glint on water */}
        <ellipse cx="170" cy="90" rx="30" ry="6" fill={a3} opacity=".3"/>
        {/* boat 1 */}
        <path d="M80 105 Q100 95 120 105 L115 118 L85 118 Z" fill={a3} stroke={a2} strokeWidth="1"/>
        <line x1="100" y1="96" x2="100" y2="75" stroke={a2} strokeWidth="1.5"/>
        <path d="M100,75 L118,88 L100,96 Z" fill={a2} opacity=".6"/>
        {/* boat 2 */}
        <path d="M145 112 Q162 104 178 112 L174 122 L149 122 Z" fill={a1} stroke={a2} strokeWidth="1"/>
        <line x1="161" y1="104" x2="161" y2="86" stroke={a2} strokeWidth="1.5"/>
        <path d="M161,86 L176,98 L161,104 Z" fill={a2} opacity=".5"/>
        {/* sea waves */}
        <path d="M0 130 Q55 122 110 130 Q165 138 220 130" stroke={a1} strokeWidth="1.5" fill="none" opacity=".5"/>
        <path d="M0 140 Q55 132 110 140 Q165 148 220 140" stroke={a1} strokeWidth="1" fill="none" opacity=".35"/>
      </svg>
      {/* Bottom-left: beach + palm */}
      <svg width="180" height="110" viewBox="0 0 180 110" fill="none" className="absolute bottom-0 left-0 opacity-68" style={{transition:"all 0.5s"}}>
        <rect x="0" y="98" width="180" height="12" fill={ground}/>
        {/* sand ripples */}
        <path d="M0 98 Q45 92 90 98 Q135 104 180 98" stroke={a3} strokeWidth="1.5" fill="none" opacity=".5"/>
        {/* palm tree */}
        <line x1="40" y1="98" x2="46" y2="58" stroke="#a09890" strokeWidth="4" strokeLinecap="round"/>
        <path d="M46,58 Q60,46 70,54" stroke={a1} strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M46,58 Q32,44 28,56" stroke={a1} strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M46,58 Q50,42 60,46" stroke={a1} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="54" cy="52" rx="5" ry="7" fill={a3} opacity=".7"/>
        {/* person on beach */}
        <circle cx="120" cy="82" r="7" fill={a2}/>
        <line x1="120" y1="89" x2="120" y2="98" stroke={a2} strokeWidth="2"/>
        <line x1="120" y1="93" x2="114" y2="99" stroke={a2} strokeWidth="1.5"/>
        <line x1="120" y1="93" x2="126" y2="99" stroke={a2} strokeWidth="1.5"/>
        <line x1="120" y1="91" x2="114" y2="86" stroke={a2} strokeWidth="1.5"/>
        <line x1="120" y1="91" x2="126" y2="86" stroke={a2} strokeWidth="1.5"/>
      </svg>
      {/* Bottom-right: more coastal houses */}
      <svg width="180" height="110" viewBox="0 0 180 110" fill="none" className="absolute bottom-0 right-0 opacity-65" style={{transition:"all 0.5s"}}>
        <rect x="0" y="98" width="180" height="12" fill={ground}/>
        <rect x="80" y="52" width="44" height="50" rx="3" fill={a3} opacity=".7"/>
        <polygon points="76,54 102,28 128,54" fill={a2}/>
        <rect x="92" y="76" width="14" height="26" rx="2" fill={a1} opacity=".4"/>
        <rect x="82" y="62" width="10" height="9" rx="2" fill={sky} stroke={a2} strokeWidth="1"/>
        <rect x="108" y="62" width="10" height="9" rx="2" fill={sky} stroke={a2} strokeWidth="1"/>
        {/* second palm */}
        <line x1="148" y1="98" x2="154" y2="62" stroke="#a09890" strokeWidth="3.5" strokeLinecap="round"/>
        <path d="M154,62 Q165,52 172,60" stroke={a1} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <path d="M154,62 Q142,50 138,60" stroke={a1} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      </svg>
    </>
  );

  /* ---- 5. EVENING ---- */
  /* id === "evening" */
  return wrapper(
    <>
      {/* Top-left: silhouette houses with warm windows */}
      <svg width="230" height="200" viewBox="0 0 230 200" fill="none" className="absolute top-0 left-0 opacity-72" style={{transition:"all 0.5s"}}>
        <rect x="0" y="178" width="230" height="22" fill={ground}/>
        {/* house silhouette 1 */}
        <rect x="8" y="128" width="44" height="52" rx="3" fill={a2} opacity=".55"/>
        <polygon points="4,130 30,104 56,130" fill={a2} opacity=".6"/>
        {/* warm glowing windows */}
        <rect x="14" y="138" width="12" height="10" rx="2" fill={a3} opacity=".85"/>
        <rect x="32" y="138" width="12" height="10" rx="2" fill={a3} opacity=".85"/>
        <rect x="22" y="158" width="14" height="22" rx="2" fill={a3} opacity=".5"/>
        {/* house silhouette 2 */}
        <rect x="58" y="138" width="40" height="42" rx="3" fill={a2} opacity=".5"/>
        <polygon points="54,140 78,116 102,140" fill={a2} opacity=".55"/>
        <rect x="64" y="148" width="11" height="9" rx="2" fill={a3} opacity=".8"/>
        <rect x="82" y="148" width="11" height="9" rx="2" fill={a3} opacity=".8"/>
        <rect x="70" y="162" width="14" height="18" rx="2" fill={a3} opacity=".45"/>
        {/* taller building */}
        <rect x="108" y="100" width="38" height="80" rx="3" fill={a2} opacity=".45"/>
        {[108,122,136,150].map((y, i) => (
          <g key={i}>
            <rect x="112" y={y} width="10" height="9" rx="2" fill={a3} opacity={i % 2 === 0 ? ".75" : ".4"}/>
            <rect x="128" y={y} width="10" height="9" rx="2" fill={a3} opacity={i % 2 === 1 ? ".75" : ".4"}/>
          </g>
        ))}
        {/* silhouette trees */}
        <rect x="155" y="148" width="5" height="32" rx="2" fill={a2} opacity=".6"/>
        <ellipse cx="157" cy="140" rx="20" ry="16" fill={a2} opacity=".5"/>
        <ellipse cx="165" cy="146" rx="14" ry="12" fill={a2} opacity=".45"/>
      </svg>
      {/* Top-right: crescent moon + stars */}
      <svg width="220" height="160" viewBox="0 0 220 160" fill="none" className="absolute top-0 right-0 opacity-72" style={{transition:"all 0.5s"}}>
        {/* crescent moon */}
        <circle cx="170" cy="38" r="26" fill={a3} opacity=".75"/>
        <circle cx="180" cy="32" r="22" fill={sky}/>
        {/* stars */}
        {[[50,20],[70,36],[90,18],[110,42],[130,24],[40,50],[145,15],[160,55],[20,32]].map(([x,y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.5 : 1.5} fill={a3} opacity=".7"/>
        ))}
        {/* glowing streetlight */}
        <line x1="185" y1="160" x2="185" y2="95" stroke={a2} strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M185 95 Q185 80 170 80" stroke={a2} strokeWidth="2.5" fill="none"/>
        <ellipse cx="170" cy="80" rx="9" ry="5" fill={a3} opacity=".9"/>
        <ellipse cx="170" cy="80" rx="18" ry="12" fill={a3} opacity=".2"/>
        <circle cx="170" cy="80" r="4" fill={a3}/>
        {/* second light glow */}
        <ellipse cx="170" cy="95" rx="14" ry="8" fill={a3} opacity=".15"/>
      </svg>
      {/* Bottom-left: glowing streetlight + silhouette figure */}
      <svg width="190" height="110" viewBox="0 0 190 110" fill="none" className="absolute bottom-0 left-0 opacity-70" style={{transition:"all 0.5s"}}>
        <rect x="0" y="98" width="190" height="12" fill={ground}/>
        {/* streetlight */}
        <line x1="30" y1="98" x2="30" y2="38" stroke={a2} strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M30 38 Q30 26 18 26" stroke={a2} strokeWidth="2.5" fill="none"/>
        <ellipse cx="18" cy="26" rx="8" ry="5" fill={a3} opacity=".9"/>
        <ellipse cx="18" cy="36" rx="15" ry="9" fill={a3} opacity=".18"/>
        {/* silhouette figure */}
        <circle cx="80" cy="74" r="8" fill={a2} opacity=".7"/>
        <line x1="80" y1="82" x2="80" y2="96" stroke={a2} strokeWidth="2.5" opacity=".7"/>
        <line x1="80" y1="87" x2="73" y2="94" stroke={a2} strokeWidth="2" opacity=".7"/>
        <line x1="80" y1="87" x2="87" y2="94" stroke={a2} strokeWidth="2" opacity=".7"/>
        <line x1="80" y1="96" x2="74" y2="106" stroke={a2} strokeWidth="2" opacity=".7"/>
        <line x1="80" y1="96" x2="86" y2="106" stroke={a2} strokeWidth="2" opacity=".7"/>
        {/* silhouette tree */}
        <rect x="140" y="58" width="5" height="40" rx="2" fill={a2} opacity=".6"/>
        <ellipse cx="142" cy="50" rx="22" ry="18" fill={a2} opacity=".5"/>
        <ellipse cx="152" cy="56" rx="16" ry="14" fill={a2} opacity=".45"/>
      </svg>
      {/* Bottom-right: more evening houses */}
      <svg width="190" height="110" viewBox="0 0 190 110" fill="none" className="absolute bottom-0 right-0 opacity-68" style={{transition:"all 0.5s"}}>
        <rect x="0" y="98" width="190" height="12" fill={ground}/>
        <rect x="100" y="52" width="44" height="50" rx="3" fill={a2} opacity=".5"/>
        <polygon points="96,54 122,28 148,54" fill={a2} opacity=".55"/>
        <rect x="106" y="62" width="12" height="10" rx="2" fill={a3} opacity=".8"/>
        <rect x="126" y="62" width="12" height="10" rx="2" fill={a3} opacity=".8"/>
        <rect x="112" y="76" width="14" height="22" rx="2" fill={a3} opacity=".5"/>
        {/* second streetlight */}
        <line x1="158" y1="98" x2="158" y2="50" stroke={a2} strokeWidth="2" strokeLinecap="round"/>
        <path d="M158 50 Q158 40 148 40" stroke={a2} strokeWidth="2" fill="none"/>
        <ellipse cx="148" cy="40" rx="7" ry="4" fill={a3} opacity=".85"/>
        <ellipse cx="148" cy="48" rx="12" ry="7" fill={a3} opacity=".15"/>
      </svg>
    </>
  );
}

function ServiceDeskSection({ categories, wards, deskTheme, setDeskTheme }) {
  const [view, setView] = useState("citizen"); // "citizen" | "officer"
  const theme = THEMES[deskTheme] ?? THEMES.civic;

  return (
    <div className="relative" style={{ minHeight: "calc(100vh - 120px)", transition: "background 0.4s" }}>

      {/* Illustrated urban scene behind the UI — theme-aware */}
      <ThemedEnvironment theme={theme} />

      {/* Actual page content — sits above illustrations */}
      <div className="relative z-10">
        <PageHeading
          title="Service Desk"
          subtitle="Submit and track civic grievances · Officer complaint management · Data Hub"
          icon={ClipboardList}
          accentColor={PASTELS.blue.text}
          accentBg={PASTELS.blue.bg}
        />

        {/* Tab switcher + Theme picker row */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 md:px-8 pt-5">
          <div className="flex gap-1">
            {[
              { id: "citizen", label: "Citizen Portal",  icon: Search },
              { id: "officer", label: "Officer Console", icon: UserCheck },
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

          {/* Theme selector — Feature 10 */}
          <ThemeSelector currentTheme={deskTheme} onThemeChange={setDeskTheme} />
        </div>

        {/* Citizen: centered narrow column. Officer: full-width grid. */}
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
   THEME SELECTOR  — Feature 10
========================================================= */

function ThemeSelector({ currentTheme, onThemeChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors border"
        style={{ background: "rgba(255,255,255,0.85)", color: "#6b6560", borderColor: "#e8e4dd" }}
        aria-label="Select visual theme"
      >
        <Palette size={13} />
        Theme: {THEMES[currentTheme]?.label ?? "Civic"}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-30 rounded-2xl border border-[#e8e4dd] bg-white shadow-lg overflow-hidden"
          style={{ minWidth: "240px" }}
        >
          <div className="px-4 py-3 border-b border-[#f0ede8]">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890]">ENVIRONMENT THEME</p>
            <p className="text-[11px] text-[#6b6560] mt-0.5">Changes decorative scene only</p>
          </div>
          {Object.entries(THEMES).map(([id, t]) => (
            <button
              key={id}
              onClick={() => { onThemeChange(id); setOpen(false); }}
              className="w-full text-left px-4 py-3 hover:bg-[#f5f3ef] transition-colors flex items-center gap-3 border-b border-[#f5f3ef] last:border-b-0"
            >
              <div
                className="h-7 w-7 rounded-lg border border-[#e8e4dd] shrink-0"
                style={{ background: `linear-gradient(135deg, ${t.sky} 50%, ${t.ground} 50%)` }}
              />
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${id === currentTheme ? "text-[#1a1917]" : "text-[#6b6560]"}`}>
                  {t.label}
                  {id === currentTheme && <span className="ml-2 text-[#10B981]">✓</span>}
                </p>
                <p className="text-[10px] text-[#a09890] truncate">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
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
   OFFICER CONSOLE  (with Data Hub tab — Feature 2)
========================================================= */

function OfficerConsole({ categories }) {
  const [consoleTab, setConsoleTab] = useState("tickets"); // "tickets" | "hub" | "import"
  const [tickets, setTickets]       = useState(null);
  const [filterStatus, setFilterStatus]   = useState("");
  const [filterCategory, setFilterCat]    = useState("");
  const [selected, setSelected]     = useState(null);
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
    <div className="space-y-5">

      {/* Console tab bar */}
      <div className="flex gap-1 flex-wrap">
        {[
          { id: "tickets", label: "Complaint Tickets", icon: ClipboardList },
          { id: "hub",     label: "Data Hub",          icon: Database },
          { id: "import",  label: "Load Dataset",      icon: Upload },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setConsoleTab(id)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors border"
            style={
              consoleTab === id
                ? { background: PASTELS.lavender.bg, color: PASTELS.lavender.strong, borderColor: PASTELS.lavender.border }
                : { background: "rgba(255,255,255,0.7)", color: "#6b6560", borderColor: "#e8e4dd" }
            }
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── COMPLAINT TICKETS TAB ── */}
      {consoleTab === "tickets" && (
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
      )} {/* end consoleTab === "tickets" */}

      {/* ── DATA HUB TAB — Feature 2 ── */}
      {consoleTab === "hub" && <DataHubPanel />}

      {/* ── IMPORT DATASET TAB — Feature 3 & 4 ── */}
      {consoleTab === "import" && <ImportWizard />}

    </div>
  );
}


/* =========================================================
   DATA HUB PANEL  — Feature 2
========================================================= */

function DataHubPanel() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadedDs, setLoadedDs] = useState(null);
  const [exporting, setExporting] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]   = useState("");

  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    Promise.all([
      fetch(`${DESK_API}/desk/hub/stats`, { signal: AbortSignal.timeout(10_000) }).then(r => r.json()).catch(() => null),
      fetch(`${DESK_API}/desk/hub/loaded-dataset`, { signal: AbortSignal.timeout(10_000) }).then(r => r.json()).catch(() => null),
    ]).then(([s, ds]) => {
      setStats(s);
      setLoadedDs(ds);
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = async (period, from, to) => {
    setExporting(period || "custom");
    try {
      let url = `${DESK_API}/desk/hub/export`;
      if (from || to) {
        const p = new URLSearchParams();
        if (from) p.set("date_from", from);
        if (to)   p.set("date_to", to);
        url += `?${p}`;
      } else {
        url += `?period=${period}`;
      }
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      const blob = await res.blob();
      const disp = res.headers.get("content-disposition") || "";
      const match = disp.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : "civicsense_export.csv";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    } finally {
      setExporting("");
    }
  };

  if (loading) return <p className="text-xs text-[#a09890] py-8 text-center">Loading hub data…</p>;

  return (
    <div className="space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "TOTAL RECORDS",    value: stats?.total_records ?? "—",  accent: "mint" },
          { label: "NEW TODAY",        value: stats?.new_today ?? "—",       accent: "blue" },
          { label: "THIS WEEK",        value: stats?.new_this_week ?? "—",   accent: "lavender" },
          { label: "LATEST RECORD",    value: stats?.latest_data_date
              ? new Date(stats.latest_data_date).toLocaleDateString("en-GB", { dateStyle: "medium" })
              : "—",
            accent: "butter" },
        ].map(({ label, value, accent }) => (
          <KpiCard key={label} icon={Database} label={label} value={String(value)} sub="" accent={accent} />
        ))}
      </div>

      {/* Export section */}
      <Card className="p-5 md:p-6">
        <CardHeader
          title="Export Operational Data"
          subtitle="Download current Service Desk records as a CivicSense canonical CSV"
          icon={Download}
          iconColor={PASTELS.mint.text}
          iconBg={PASTELS.mint.bg}
        />
        <div className="space-y-4">
          {/* Quick export buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Export Today",      period: "today" },
              { label: "Export This Week",  period: "week" },
              { label: "Export This Month", period: "month" },
              { label: "Export All Records",period: "all" },
            ].map(({ label, period }) => (
              <button key={period}
                onClick={() => exportCsv(period, null, null)}
                disabled={!!exporting}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold border transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: PASTELS.mint.bg, color: PASTELS.mint.strong, borderColor: PASTELS.mint.border }}
              >
                <Download size={12} />
                {exporting === period ? "Exporting…" : label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890] mb-2">CUSTOM DATE RANGE</p>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="text-[10px] text-[#a09890] block mb-1">From</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="bg-white border border-[#e8e4dd] rounded-xl px-3 py-2 text-xs text-[#1a1917] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-[#a09890] block mb-1">To</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="bg-white border border-[#e8e4dd] rounded-xl px-3 py-2 text-xs text-[#1a1917] outline-none" />
              </div>
              <button
                onClick={() => exportCsv(null, customFrom, customTo)}
                disabled={!!exporting || (!customFrom && !customTo)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold border transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: PASTELS.blue.bg, color: PASTELS.blue.strong, borderColor: PASTELS.blue.border }}
              >
                <Download size={12} />
                {exporting === "custom" ? "Exporting…" : "Export Range"}
              </button>
            </div>
          </div>

          {/* Schema reminder */}
          <div className="rounded-xl bg-[#f5f3ef] px-4 py-3">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-[#a09890] mb-1">EXPORTED SCHEMA</p>
            <p className="text-xs text-[#6b6560]">
              Complaint ID · Category · Sub Category · Grievance Date · Ward Name · Grievance Status · Staff Remarks · Staff Name
            </p>
          </div>
        </div>
      </Card>

      {/* Loaded dataset info */}
      {loadedDs?.loaded ? (
        <Card className="p-5">
          <CardHeader
            title="Loaded Dataset"
            subtitle={`Tag: ${loadedDs.dataset_tag}`}
            icon={FileText}
            iconColor={PASTELS.lavender.text}
            iconBg={PASTELS.lavender.bg}
          />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
            {[
              ["Records",    loadedDs.total_records],
              ["Categories", loadedDs.categories?.length ?? "—"],
              ["Wards",      loadedDs.wards?.length ?? "—"],
              ["Date From",  loadedDs.date_range?.from || "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-[#f5f3ef] px-3 py-2">
                <p className="text-[9px] font-semibold tracking-wide text-[#a09890] mb-0.5">{k.toUpperCase()}</p>
                <p className="text-[#1a1917] font-medium">{v}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div className="rounded-2xl border border-[#e8e4dd] bg-[#f5f3ef] px-5 py-4 text-xs text-[#a09890]">
          No external dataset currently loaded. Use the <strong className="text-[#1a1917]">Load Dataset</strong> tab to import a compatible CSV.
        </div>
      )}
    </div>
  );
}


/* =========================================================
   IMPORT WIZARD  — Feature 3 & 4
========================================================= */

function ImportWizard() {
  const fileRef = useRef(null);
  const [step, setStep]         = useState("upload");  // upload | validate | profile | importing | done
  const [file, setFile]         = useState(null);
  const [validation, setValid]  = useState(null);
  const [profile, setProfile]   = useState(null);
  const [mapping, setMapping]   = useState({});
  const [result, setResult]     = useState(null);
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState("");
  const [datasetTag, setTag]    = useState("imported_" + new Date().getFullYear());

  const reset = () => {
    setStep("upload"); setFile(null); setValid(null); setProfile(null);
    setMapping({}); setResult(null); setErr("");
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`${DESK_API}/desk/hub/validate`, { method: "POST", body: fd, signal: AbortSignal.timeout(30_000) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Validation failed");
      setValid(data);
      // Pre-populate mapping from suggestion
      setMapping(data.suggested_mapping ?? {});
      setStep("validate");
    } catch (e) {
      setErr(e.message);
      setStep("upload");
    } finally {
      setBusy(false);
    }
  };

  const handleProfile = async () => {
    if (!file || !validation) return;
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const mappingStr = encodeURIComponent(JSON.stringify(mapping));
      const res = await fetch(`${DESK_API}/desk/hub/profile?mapping=${mappingStr}`, { method: "POST", body: fd, signal: AbortSignal.timeout(30_000) });
      const data = await res.json();
      setProfile(data);
      setStep("profile");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setBusy(true);
    setStep("importing");
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const mappingStr = encodeURIComponent(JSON.stringify(mapping));
      const res = await fetch(
        `${DESK_API}/desk/hub/import?dataset_tag=${encodeURIComponent(datasetTag)}&mapping=${mappingStr}`,
        { method: "POST", body: fd, signal: AbortSignal.timeout(60_000) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Import failed");
      setResult(data);
      setStep("done");
    } catch (e) {
      setErr(e.message);
      setStep("profile");
    } finally {
      setBusy(false);
    }
  };

  // Canonical columns that must be mapped
  const REQUIRED_COLS  = ["Complaint ID", "Category", "Ward Name"];
  const OPTIONAL_COLS  = ["Sub Category", "Grievance Date", "Grievance Status", "Staff Remarks", "Staff Name"];

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Step 1 — Upload */}
      {(step === "upload" || step === "validate" || step === "profile" || step === "importing") && (
        <Card className="p-6">
          <CardHeader
            title="Load Dataset"
            subtitle="Import a compatible civic grievance CSV into CivicSense"
            icon={Upload}
            iconColor={PASTELS.blue.text}
            iconBg={PASTELS.blue.bg}
          />
          <div
            className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors hover:border-[#c4b5fd]"
            style={{ borderColor: file ? PASTELS.lavender.border : "#e8e4dd", background: file ? PASTELS.lavender.bg : "#f5f3ef" }}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={24} className="mx-auto mb-2 text-[#a09890]" />
            <p className="text-sm font-semibold text-[#1a1917]">
              {file ? file.name : "Click to select a CSV file"}
            </p>
            <p className="text-xs text-[#a09890] mt-1">
              Max 50 MB · CSV format only · Compatible civic grievance schema
            </p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </div>
          {busy && step === "upload" && <p className="text-xs text-[#a09890] mt-2 text-center">Validating…</p>}
          {err && <p className="mt-2 text-xs rounded-xl px-3 py-2" style={{ background: PASTELS.blush.bg, color: PASTELS.blush.strong }}>{err}</p>}
        </Card>
      )}

      {/* Step 2 — Validation + Column Mapping */}
      {step !== "upload" && step !== "done" && validation && (
        <Card className="p-6 space-y-4">
          <CardHeader title="Column Mapping" subtitle={`${validation.row_count} rows detected`} icon={FileText} iconColor={PASTELS.lavender.text} iconBg={PASTELS.lavender.bg} />

          {/* Auto-map status */}
          {validation.unmapped_required?.length > 0 ? (
            <div className="rounded-xl px-4 py-3 text-xs" style={{ background: PASTELS.blush.bg, color: PASTELS.blush.strong }}>
              <strong>Required columns not auto-detected:</strong> {validation.unmapped_required.join(", ")}
              <br />Please map them manually below.
            </div>
          ) : (
            <div className="rounded-xl px-4 py-3 text-xs" style={{ background: PASTELS.mint.bg, color: PASTELS.mint.strong }}>
              ✓ All required columns auto-detected. Review and adjust if needed.
            </div>
          )}

          {/* Mapping editor */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890]">COLUMN MAPPING</p>
            {[...REQUIRED_COLS, ...OPTIONAL_COLS].map((canonical) => (
              <div key={canonical} className="flex items-center gap-3 text-xs">
                <span
                  className="w-36 shrink-0 font-semibold"
                  style={{ color: REQUIRED_COLS.includes(canonical) ? PASTELS.lavender.strong : "#6b6560" }}
                >
                  {canonical}{REQUIRED_COLS.includes(canonical) ? " *" : ""}
                </span>
                <select
                  value={mapping[canonical] ?? ""}
                  onChange={e => setMapping(m => ({ ...m, [canonical]: e.target.value }))}
                  className="flex-1 appearance-none bg-white border border-[#e8e4dd] rounded-xl px-3 py-1.5 text-xs text-[#1a1917] outline-none"
                >
                  <option value="">(not mapped)</option>
                  {(validation.source_columns || []).map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleProfile} disabled={busy}
              className="rounded-xl px-5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: PASTELS.lavender.strong }}>
              {busy ? "Profiling…" : "Preview Dataset Profile"}
            </button>
            <button onClick={reset} className="rounded-xl px-4 py-2 text-xs font-semibold text-[#6b6560] border border-[#e8e4dd] hover:bg-[#f5f3ef] transition-colors">
              Start Over
            </button>
          </div>
          {err && <p className="text-xs rounded-xl px-3 py-2" style={{ background: PASTELS.blush.bg, color: PASTELS.blush.strong }}>{err}</p>}
        </Card>
      )}

      {/* Step 3 — Dataset Profile */}
      {(step === "profile" || step === "importing") && profile && (
        <Card className="p-6 space-y-4">
          <CardHeader
            title="Dataset Profile"
            subtitle="Review before importing"
            icon={BarChart3}
            iconColor={PASTELS.mint.text}
            iconBg={PASTELS.mint.bg}
          />

          <div
            className="rounded-xl px-4 py-3 text-xs font-semibold"
            style={{ background: profile.validation_status === "valid" ? PASTELS.mint.bg : PASTELS.blush.bg,
                     color: profile.validation_status === "valid" ? PASTELS.mint.strong : PASTELS.blush.strong }}
          >
            {profile.validation_status === "valid" ? "✓ Dataset validated" : "⚠ Validation issues found"}
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
            {[
              ["Records",      profile.row_count],
              ["Valid Rows",   profile.valid_rows],
              ["Categories",   profile.categories],
              ["Wards",        profile.wards],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-[#f5f3ef] px-3 py-2">
                <p className="text-[9px] font-semibold tracking-wide text-[#a09890] mb-0.5">{k.toUpperCase()}</p>
                <p className="text-lg font-bold text-[#1a1917]">{v}</p>
              </div>
            ))}
          </div>

          {profile.date_range && (
            <div className="rounded-xl bg-[#f5f3ef] px-4 py-2 text-xs">
              <span className="text-[#a09890] font-semibold">DATE RANGE </span>
              <span className="text-[#1a1917]">{profile.date_range.from} – {profile.date_range.to}</span>
            </div>
          )}

          {/* Status distribution */}
          {Object.keys(profile.status_distribution || {}).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890] mb-2">STATUS DISTRIBUTION</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(profile.status_distribution).map(([status, count]) => (
                  <span key={status} className="rounded-full px-3 py-1 text-[10px] font-semibold border"
                    style={{ background: PASTELS.lavender.bg, color: PASTELS.lavender.strong, borderColor: PASTELS.lavender.border }}>
                    {status}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing values */}
          {Object.entries(profile.missing_values || {}).some(([, v]) => v > 0) && (
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890] mb-2">MISSING VALUES</p>
              <div className="space-y-1">
                {Object.entries(profile.missing_values).filter(([, v]) => v > 0).map(([col, count]) => (
                  <div key={col} className="flex justify-between text-xs">
                    <span className="text-[#6b6560]">{col}</span>
                    <span className="text-[#d97706] font-semibold">{count} missing</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dataset tag + Import button */}
          <div className="space-y-3 border-t border-[#e8e4dd] pt-4">
            <div>
              <label className="text-[10px] font-semibold tracking-[0.14em] text-[#a09890] block mb-1">DATASET TAG</label>
              <input value={datasetTag} onChange={e => setTag(e.target.value)}
                className="bg-white border border-[#e8e4dd] rounded-xl px-3 py-2 text-sm text-[#1a1917] outline-none w-full max-w-xs" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleImport} disabled={busy || profile.valid_rows === 0}
                className="rounded-xl px-5 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: PASTELS.mint.strong }}>
                {step === "importing" ? "Importing…" : `Load into CivicSense (${profile.valid_rows} rows)`}
              </button>
              <button onClick={reset} className="rounded-xl px-4 py-2 text-xs font-semibold text-[#6b6560] border border-[#e8e4dd] hover:bg-[#f5f3ef] transition-colors">
                Cancel
              </button>
            </div>
          </div>
          {err && <p className="text-xs rounded-xl px-3 py-2" style={{ background: PASTELS.blush.bg, color: PASTELS.blush.strong }}>{err}</p>}
        </Card>
      )}

      {/* Step 4 — Import done */}
      {step === "done" && result && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: PASTELS.mint.bg }}>
              <CheckCircle2 size={18} style={{ color: PASTELS.mint.strong }} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1a1917]">Import complete</p>
              <p className="text-xs text-[#a09890]">Dataset tag: {result.dataset_tag}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {[
              { label: "IMPORTED",  value: result.imported,  accent: PASTELS.mint },
              { label: "SKIPPED",   value: result.skipped,   accent: PASTELS.butter },
              { label: "INVALID",   value: result.invalid,   accent: PASTELS.blush },
            ].map(({ label, value, accent }) => (
              <div key={label} className="rounded-xl px-3 py-2 border" style={{ background: accent.bg, borderColor: accent.border }}>
                <p className="text-[9px] font-semibold tracking-wide mb-0.5" style={{ color: accent.strong }}>{label}</p>
                <p className="text-lg font-bold" style={{ color: accent.strong }}>{value}</p>
              </div>
            ))}
          </div>
          {result.errors?.length > 0 && (
            <div className="rounded-xl bg-[#f5f3ef] px-4 py-3 text-xs text-[#6b6560]">
              <p className="font-semibold mb-1">Sample errors:</p>
              {result.errors.map((e, i) => <p key={i} className="text-[10px]">{e}</p>)}
            </div>
          )}
          <button onClick={reset}
            className="rounded-xl px-5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#1a1917" }}>
            Import another dataset
          </button>
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
