# ============================================================
# CIVICSENSE
# 02 — EXPLORATORY DATA ANALYSIS
# ============================================================

import sys
from pathlib import Path

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns


# ============================================================
# 1. PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

CLEAN_DATA = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "bbmp_grievances_2025_cleaned.csv"
)

ASSETS_DIR = PROJECT_ROOT / "assets"
REPORTS_DIR = PROJECT_ROOT / "reports"

ASSETS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# 2. VISUALIZATION SETTINGS
# ============================================================

sns.set_theme(style="whitegrid")

plt.rcParams["figure.dpi"] = 120
plt.rcParams["savefig.dpi"] = 180


def save_chart(filename):
    """Save current matplotlib figure into assets."""
    path = ASSETS_DIR / filename
    plt.tight_layout()
    plt.savefig(path, bbox_inches="tight")
    plt.close()
    print(f"   ✓ {filename}")


# ============================================================
# 3. LOAD CLEAN DATA
# ============================================================

print("\n" + "=" * 75)
print("🏙️  CIVICSENSE — EXPLORATORY DATA ANALYSIS")
print("=" * 75)

print("\n📂 Loading cleaned dataset...")

if not CLEAN_DATA.exists():
    raise FileNotFoundError(
        f"Clean dataset not found:\n{CLEAN_DATA}"
    )

df = pd.read_csv(CLEAN_DATA)

df["grievance_date"] = pd.to_datetime(
    df["grievance_date"],
    errors="coerce"
)

print(f"✅ Loaded {len(df):,} records")


# ============================================================
# 4. BASIC DATA PROFILE
# ============================================================

print("\n" + "=" * 75)
print("📊 DATA PROFILE")
print("=" * 75)

print(f"Records       : {len(df):,}")
print(f"Columns       : {len(df.columns):,}")
print(f"Categories    : {df['category'].nunique():,}")
print(f"Subcategories : {df['sub_category'].nunique():,}")
print(f"Wards         : {df['ward_name'].nunique():,}")

print(
    f"Date range    : "
    f"{df['grievance_date'].min().date()} "
    f"→ "
    f"{df['grievance_date'].max().date()}"
)


# ============================================================
# 5. CATEGORY ANALYSIS
# ============================================================

print("\n" + "=" * 75)
print("1️⃣ CATEGORY ANALYSIS")
print("=" * 75)

category_summary = (
    df["category"]
    .value_counts()
    .rename_axis("category")
    .reset_index(name="complaints")
)

category_summary["share_percent"] = (
    category_summary["complaints"]
    / len(df)
    * 100
).round(2)

category_summary.to_csv(
    REPORTS_DIR / "category_summary.csv",
    index=False
)

print("\nTop 10 categories:")
print(
    category_summary.head(10)
    .to_string(index=False)
)


# ---- Chart ----

top_categories = category_summary.head(10)

plt.figure(figsize=(10, 6))

sns.barplot(
    data=top_categories.sort_values("complaints"),
    x="complaints",
    y="category"
)

plt.title("Top Civic Grievance Categories")
plt.xlabel("Number of Complaints")
plt.ylabel("Category")

save_chart("01_category_distribution.png")


# ============================================================
# 6. SUBCATEGORY ANALYSIS
# ============================================================

print("\n" + "=" * 75)
print("2️⃣ SUBCATEGORY ANALYSIS")
print("=" * 75)

subcategory_summary = (
    df["sub_category"]
    .value_counts()
    .rename_axis("sub_category")
    .reset_index(name="complaints")
)

subcategory_summary["share_percent"] = (
    subcategory_summary["complaints"]
    / len(df)
    * 100
).round(2)

subcategory_summary.to_csv(
    REPORTS_DIR / "subcategory_summary.csv",
    index=False
)

print("\nTop 15 subcategories:")
print(
    subcategory_summary.head(15)
    .to_string(index=False)
)


top_subcategories = subcategory_summary.head(10)

plt.figure(figsize=(11, 7))

sns.barplot(
    data=top_subcategories.sort_values("complaints"),
    x="complaints",
    y="sub_category"
)

plt.title("Top Civic Grievance Subcategories")
plt.xlabel("Number of Complaints")
plt.ylabel("Subcategory")

save_chart("02_subcategory_distribution.png")


# ============================================================
# 7. MONTHLY TREND
# ============================================================

print("\n" + "=" * 75)
print("3️⃣ TEMPORAL ANALYSIS")
print("=" * 75)

monthly_summary = (
    df.groupby(
        df["grievance_date"].dt.to_period("M")
    )
    .size()
    .reset_index(name="complaints")
)

monthly_summary["month"] = (
    monthly_summary["grievance_date"]
    .astype(str)
)

monthly_summary = monthly_summary[
    ["month", "complaints"]
]

monthly_summary.to_csv(
    REPORTS_DIR / "monthly_summary.csv",
    index=False
)

print("\nMonthly complaint volume:")
print(monthly_summary.to_string(index=False))


plt.figure(figsize=(12, 6))

sns.lineplot(
    data=monthly_summary,
    x="month",
    y="complaints",
    marker="o"
)

plt.title("Monthly Civic Grievance Volume")
plt.xlabel("Month")
plt.ylabel("Number of Complaints")
plt.xticks(rotation=45)

save_chart("03_monthly_trend.png")


# ============================================================
# 8. STATUS ANALYSIS
# ============================================================

print("\n" + "=" * 75)
print("4️⃣ STATUS ANALYSIS")
print("=" * 75)

status_summary = (
    df["grievance_status"]
    .value_counts()
    .rename_axis("status")
    .reset_index(name="complaints")
)

status_summary["share_percent"] = (
    status_summary["complaints"]
    / len(df)
    * 100
).round(2)

status_summary.to_csv(
    REPORTS_DIR / "status_summary.csv",
    index=False
)

print("\nStatus distribution:")
print(status_summary.to_string(index=False))


plt.figure(figsize=(9, 6))

sns.barplot(
    data=status_summary,
    x="complaints",
    y="status"
)

plt.title("Grievance Status Distribution")
plt.xlabel("Number of Complaints")
plt.ylabel("Status")

save_chart("04_status_distribution.png")


# ============================================================
# 9. WARD ANALYSIS
# ============================================================

print("\n" + "=" * 75)
print("5️⃣ WARD ANALYSIS")
print("=" * 75)

ward_summary = (
    df["ward_name"]
    .value_counts()
    .rename_axis("ward")
    .reset_index(name="complaints")
)

ward_summary["share_percent"] = (
    ward_summary["complaints"]
    / len(df)
    * 100
).round(2)

ward_summary.to_csv(
    REPORTS_DIR / "ward_summary.csv",
    index=False
)

print("\nTop 15 wards:")
print(
    ward_summary.head(15)
    .to_string(index=False)
)


top_wards = ward_summary.head(15)

plt.figure(figsize=(10, 8))

sns.barplot(
    data=top_wards.sort_values("complaints"),
    x="complaints",
    y="ward"
)

plt.title("Top Wards by Grievance Volume")
plt.xlabel("Number of Complaints")
plt.ylabel("Ward")

save_chart("05_ward_distribution.png")


# ============================================================
# 10. CATEGORY × STATUS ANALYSIS
# ============================================================

print("\n" + "=" * 75)
print("6️⃣ CATEGORY × STATUS ANALYSIS")
print("=" * 75)

category_status = pd.crosstab(
    df["category"],
    df["grievance_status"]
)

category_status["total"] = (
    category_status.sum(axis=1)
)

if "Closed" in category_status.columns:

    category_status["closed"] = (
        category_status["Closed"]
    )

else:

    category_status["closed"] = 0


category_status["non_closed"] = (
    category_status["total"]
    - category_status["closed"]
)

category_status["non_closed_rate_percent"] = (
    category_status["non_closed"]
    / category_status["total"]
    * 100
).round(2)

category_status = (
    category_status
    .sort_values(
        "non_closed_rate_percent",
        ascending=False
    )
)

category_status.to_csv(
    REPORTS_DIR / "category_status_summary.csv"
)

print("\nCategories with highest non-closed rates:")
print(
    category_status[
        [
            "total",
            "closed",
            "non_closed",
            "non_closed_rate_percent"
        ]
    ]
    .head(10)
    .to_string()
)


# ---- Plot top-volume categories ----

top_volume_categories = (
    category_status
    .sort_values("total", ascending=False)
    .head(10)
    .copy()
)

plt.figure(figsize=(10, 6))

sns.barplot(
    data=top_volume_categories.sort_values(
        "non_closed_rate_percent"
    ),
    x="non_closed_rate_percent",
    y=top_volume_categories.index
)

plt.title(
    "Non-Closed Complaint Rate — Top Volume Categories"
)

plt.xlabel("Non-Closed Rate (%)")
plt.ylabel("Category")

save_chart("06_unresolved_by_category.png")


# ============================================================
# 11. WARD × CATEGORY ANALYSIS
# ============================================================

print("\n" + "=" * 75)
print("7️⃣ WARD × CATEGORY ANALYSIS")
print("=" * 75)

ward_category = (
    df.groupby(
        ["ward_name", "category"]
    )
    .size()
    .reset_index(name="complaints")
    .sort_values(
        "complaints",
        ascending=False
    )
)

ward_category.to_csv(
    REPORTS_DIR / "top_ward_category_combinations.csv",
    index=False
)

print("\nTop ward-category combinations:")
print(
    ward_category.head(20)
    .to_string(index=False)
)


# ---- Heatmap for top wards/categories ----

top_ward_names = (
    df["ward_name"]
    .value_counts()
    .head(15)
    .index
)

top_category_names = (
    df["category"]
    .value_counts()
    .head(10)
    .index
)

heatmap_data = pd.crosstab(
    df["ward_name"],
    df["category"]
)

heatmap_data = heatmap_data.loc[
    heatmap_data.index.intersection(top_ward_names),
    heatmap_data.columns.intersection(top_category_names)
]

plt.figure(figsize=(14, 9))

sns.heatmap(
    heatmap_data,
    annot=False,
    cmap="Blues"
)

plt.title(
    "Ward × Civic Category Complaint Intensity"
)

plt.xlabel("Category")
plt.ylabel("Ward")

plt.xticks(rotation=45, ha="right")
plt.yticks(rotation=0)

save_chart("07_ward_category_heatmap.png")


# ============================================================
# 12. DAY-OF-WEEK ANALYSIS
# ============================================================

print("\n" + "=" * 75)
print("8️⃣ DAY-OF-WEEK ANALYSIS")
print("=" * 75)

day_order = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
]

day_summary = (
    df["day_of_week"]
    .value_counts()
    .reindex(day_order)
    .fillna(0)
    .reset_index()
)

day_summary.columns = [
    "day_of_week",
    "complaints"
]

print(day_summary.to_string(index=False))

plt.figure(figsize=(10, 5))

sns.barplot(
    data=day_summary,
    x="day_of_week",
    y="complaints"
)

plt.title("Grievance Volume by Day of Week")
plt.xlabel("Day")
plt.ylabel("Number of Complaints")

plt.xticks(rotation=30)

save_chart("08_day_of_week_distribution.png")


# ============================================================
# 13. KEY ANALYTICAL METRICS
# ============================================================

print("\n" + "=" * 75)
print("🧠 CIVICSENSE KEY METRICS")
print("=" * 75)

total = len(df)

top_category = category_summary.iloc[0]

top_subcategory = subcategory_summary.iloc[0]

top_ward = ward_summary.iloc[0]

closed_count = (
    df["grievance_status"]
    .eq("Closed")
    .sum()
)

closed_rate = (
    closed_count / total * 100
)

print(
    f"\n📌 Total grievances:"
    f" {total:,}"
)

print(
    f"📌 Top category:"
    f" {top_category['category']}"
    f" ({int(top_category['complaints']):,} complaints,"
    f" {top_category['share_percent']:.2f}%)"
)

print(
    f"📌 Top subcategory:"
    f" {top_subcategory['sub_category']}"
    f" ({int(top_subcategory['complaints']):,} complaints,"
    f" {top_subcategory['share_percent']:.2f}%)"
)

print(
    f"📌 Highest-volume ward:"
    f" {top_ward['ward']}"
    f" ({int(top_ward['complaints']):,} complaints)"
)

print(
    f"📌 Closed grievances:"
    f" {closed_count:,}"
)

print(
    f"📌 Closed rate:"
    f" {closed_rate:.2f}%"
)


# ============================================================
# 14. CONCENTRATION ANALYSIS
# ============================================================

print("\n" + "=" * 75)
print("🔥 CONCENTRATION ANALYSIS")
print("=" * 75)

top_2_share = (
    category_summary.head(2)["complaints"].sum()
    / total
    * 100
)

top_3_share = (
    category_summary.head(3)["complaints"].sum()
    / total
    * 100
)

top_5_share = (
    category_summary.head(5)["complaints"].sum()
    / total
    * 100
)

print(
    f"\nTop 2 categories share : {top_2_share:.2f}%"
)

print(
    f"Top 3 categories share : {top_3_share:.2f}%"
)

print(
    f"Top 5 categories share : {top_5_share:.2f}%"
)


# ============================================================
# 15. SAVE A MACHINE-READABLE INSIGHT SUMMARY
# ============================================================

insights = pd.DataFrame([
    {
        "metric": "total_grievances",
        "value": total
    },
    {
        "metric": "unique_categories",
        "value": df["category"].nunique()
    },
    {
        "metric": "unique_subcategories",
        "value": df["sub_category"].nunique()
    },
    {
        "metric": "unique_wards",
        "value": df["ward_name"].nunique()
    },
    {
        "metric": "closed_rate_percent",
        "value": round(closed_rate, 2)
    },
    {
        "metric": "top_category",
        "value": top_category["category"]
    },
    {
        "metric": "top_category_share_percent",
        "value": top_category["share_percent"]
    },
    {
        "metric": "top_subcategory",
        "value": top_subcategory["sub_category"]
    },
    {
        "metric": "top_subcategory_share_percent",
        "value": top_subcategory["share_percent"]
    },
    {
        "metric": "top_ward",
        "value": top_ward["ward"]
    },
    {
        "metric": "top_2_category_share_percent",
        "value": round(top_2_share, 2)
    },
    {
        "metric": "top_3_category_share_percent",
        "value": round(top_3_share, 2)
    },
    {
        "metric": "top_5_category_share_percent",
        "value": round(top_5_share, 2)
    }
])

insights.to_csv(
    REPORTS_DIR / "key_metrics.csv",
    index=False
)


# ============================================================
# FINAL
# ============================================================

print("\n" + "=" * 75)
print("✅ EDA COMPLETE")
print("=" * 75)

print("\n📁 Charts saved to:")
print(f"   {ASSETS_DIR}")

print("\n📁 Analytical reports saved to:")
print(f"   {REPORTS_DIR}")

print("\n🏙️ CIVICSENSE EDA ENGINE READY")
print("=" * 75)