# ============================================================
# CIVICSENSE
# 04 — AI-READY INSIGHT ENGINE
# Evidence → Insight → Hypothesis → Recommendation
# ============================================================

from pathlib import Path
import pandas as pd
import numpy as np


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

REPORTS_DIR = PROJECT_ROOT / "reports"
ASSETS_DIR = PROJECT_ROOT / "assets"

REPORTS_DIR.mkdir(parents=True, exist_ok=True)
ASSETS_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# LOAD ANALYTICAL OUTPUTS
# ============================================================

metrics = pd.read_csv(
    REPORTS_DIR / "key_metrics.csv"
)

categories = pd.read_csv(
    REPORTS_DIR / "category_summary.csv"
)

wards = pd.read_csv(
    REPORTS_DIR / "ward_summary.csv"
)

category_status = pd.read_csv(
    REPORTS_DIR / "category_status_summary.csv"
)

forecast = pd.read_csv(
    REPORTS_DIR / "14_day_grievance_forecast.csv"
)

category_forecasts = pd.read_csv(
    REPORTS_DIR / "validated_category_forecasts.csv"
)


# ============================================================
# HELPER
# ============================================================

def get_metric(name):

    row = metrics[
        metrics["metric"] == name
    ]

    if row.empty:
        return None

    return row.iloc[0]["value"]


# ============================================================
# CORE METRICS
# ============================================================

total_grievances = int(
    get_metric("total_grievances")
)

closed_rate = float(
    get_metric("closed_rate_percent")
)

top_category = get_metric(
    "top_category"
)

top_category_share = float(
    get_metric(
        "top_category_share_percent"
    )
)

top_subcategory = get_metric(
    "top_subcategory"
)

top_subcategory_share = float(
    get_metric(
        "top_subcategory_share_percent"
    )
)

top_ward = get_metric(
    "top_ward"
)

top_2_share = float(
    get_metric(
        "top_2_category_share_percent"
    )
)

top_3_share = float(
    get_metric(
        "top_3_category_share_percent"
    )
)

top_5_share = float(
    get_metric(
        "top_5_category_share_percent"
    )
)


# ============================================================
# INSIGHT 1 — CATEGORY CONCENTRATION
# ============================================================

insight_1 = {
    "type": "Concentration",
    "observation": (
        f"{top_2_share:.2f}% of grievances "
        "come from the two highest-volume "
        "categories."
    ),
    "insight": (
        "Civic demand is highly concentrated "
        "in a small number of service domains."
    ),
    "hypothesis": (
        "Improving operational capacity in "
        "the highest-volume service domains "
        "could affect a substantial share "
        "of grievance demand."
    ),
    "recommendation": (
        "Prioritise operational monitoring "
        "and resource planning for the "
        "highest-volume service categories."
    ),
    "evidence": (
        "category_summary.csv + key_metrics.csv"
    )
}


# ============================================================
# INSIGHT 2 — ELECTRICAL
# ============================================================

insight_2 = {
    "type": "Service Demand",
    "observation": (
        f"{top_category} represents "
        f"{top_category_share:.2f}% of all "
        "recorded grievances."
    ),
    "insight": (
        f"{top_category} is the largest "
        "grievance category in the dataset."
    ),
    "hypothesis": (
        "The category may require greater "
        "operational attention because of "
        "its unusually high grievance volume."
    ),
    "recommendation": (
        "Monitor Electrical grievance volume "
        "separately and investigate its "
        "highest-concentration subcategories."
    ),
    "evidence": (
        "category_summary.csv"
    )
}


# ============================================================
# INSIGHT 3 — STREET LIGHT
# ============================================================

insight_3 = {
    "type": "Specific Issue",
    "observation": (
        f"{top_subcategory} accounts for "
        f"{top_subcategory_share:.2f}% of "
        "all grievances."
    ),
    "insight": (
        "A single civic issue accounts for "
        "a substantial share of total "
        "citizen complaints."
    ),
    "hypothesis": (
        "Recurring infrastructure issues "
        "may be generating repeated demand "
        "within the grievance system."
    ),
    "recommendation": (
        "Track this issue independently by "
        "ward and over time to identify "
        "persistent hotspots."
    ),
    "evidence": (
        "subcategory_summary.csv"
    )
}


# ============================================================
# INSIGHT 4 — GEOGRAPHIC DEMAND
# ============================================================

insight_4 = {
    "type": "Geographic Demand",
    "observation": (
        f"{top_ward} records the highest "
        "absolute grievance volume."
    ),
    "insight": (
        "The highest-volume ward should be "
        "examined alongside its complaint "
        "composition rather than volume alone."
    ),
    "hypothesis": (
        "Different wards may experience "
        "different dominant civic problems."
    ),
    "recommendation": (
        "Use ward-category analysis to "
        "identify the dominant issue profile "
        "of each ward."
    ),
    "evidence": (
        "ward_summary.csv + "
        "top_ward_category_combinations.csv"
    )
}


# ============================================================
# INSIGHT 5 — CLOSURE
# ============================================================

insight_5 = {
    "type": "Operational Performance",
    "observation": (
        f"{closed_rate:.2f}% of records are "
        "marked as Closed."
    ),
    "insight": (
        "The dataset shows a high recorded "
        "closure proportion, but closure "
        "status alone does not measure "
        "resolution quality or resolution time."
    ),
    "hypothesis": (
        "Some categories may have different "
        "operational outcomes despite similar "
        "closure proportions."
    ),
    "recommendation": (
        "Compare closure performance by "
        "category and ward while avoiding "
        "interpretation of closure as proof "
        "of service quality."
    ),
    "evidence": (
        "category_status_summary.csv"
    )
}


# ============================================================
# INSIGHT 6 — FORECAST
# ============================================================

forecast_total = int(
    forecast[
        "forecast_complaints"
    ].sum()
)

forecast_average = round(
    forecast[
        "forecast_complaints"
    ].mean()
)

insight_6 = {
    "type": "Predictive Intelligence",
    "observation": (
        f"The validated overall forecasting "
        f"model estimates approximately "
        f"{forecast_total:,} grievances over "
        "the next 14 days."
    ),
    "insight": (
        f"Expected daily grievance demand is "
        f"approximately {forecast_average:,} "
        "complaints according to the model."
    ),
    "hypothesis": (
        "Recent temporal patterns may provide "
        "useful information for short-term "
        "workload planning."
    ),
    "recommendation": (
        "Use the forecast as a planning signal "
        "rather than a guaranteed outcome, "
        "and review actual versus forecast "
        "volume as new data becomes available."
    ),
    "evidence": (
        "14_day_grievance_forecast.csv + "
        "predictive model evaluation"
    )
}


# ============================================================
# COMBINE INSIGHTS
# ============================================================

insights = pd.DataFrame([
    insight_1,
    insight_2,
    insight_3,
    insight_4,
    insight_5,
    insight_6
])


# ============================================================
# SAVE
# ============================================================

insights.to_csv(
    REPORTS_DIR
    / "civicsense_insight_engine.csv",
    index=False
)


# ============================================================
# HUMAN-READABLE REPORT
# ============================================================

report_path = (
    REPORTS_DIR
    / "civicsense_ai_insights.md"
)

with open(
    report_path,
    "w",
    encoding="utf-8"
) as file:

    file.write(
        "# CivicSense — AI-Ready Insight Report\n\n"
    )

    file.write(
        "## Evidence-Based Urban Intelligence\n\n"
    )

    for i, row in insights.iterrows():

        file.write(
            f"## Insight {i + 1}: "
            f"{row['type']}\n\n"
        )

        file.write(
            f"**Observation:** "
            f"{row['observation']}\n\n"
        )

        file.write(
            f"**Insight:** "
            f"{row['insight']}\n\n"
        )

        file.write(
            f"**Hypothesis:** "
            f"{row['hypothesis']}\n\n"
        )

        file.write(
            f"**Recommendation:** "
            f"{row['recommendation']}\n\n"
        )

        file.write(
            f"**Evidence:** "
            f"{row['evidence']}\n\n"
        )

        file.write(
            "---\n\n"
        )


# ============================================================
# FINAL OUTPUT
# ============================================================

print("\n" + "=" * 80)
print("🧠 CIVICSENSE — AI INSIGHT ENGINE")
print("=" * 80)

for i, row in insights.iterrows():

    print(
        f"\n{i + 1}. {row['type']}"
    )

    print(
        f"   Observation: "
        f"{row['observation']}"
    )

    print(
        f"   Insight: "
        f"{row['insight']}"
    )

    print(
        f"   Recommendation: "
        f"{row['recommendation']}"
    )


print("\n" + "=" * 80)
print("✅ AI INSIGHT ENGINE READY")
print("=" * 80)

print(
    "\nGenerated:"
)

print(
    " • reports/civicsense_insight_engine.csv"
)

print(
    " • reports/civicsense_ai_insights.md"
)