import os
import json
import pandas as pd

RAW = "data/processed/bbmp_grievances_2025_cleaned.csv"
OUT = "dashboard/public/data"

os.makedirs(OUT, exist_ok=True)

df = pd.read_csv(RAW)

print("🏙️ Building CivicSense dashboard intelligence layer...")
print(f"Rows loaded: {len(df):,}")


# ---------------------------------------------------------
# Helper: locate columns safely
# ---------------------------------------------------------

def find_column(possible_names):
    for name in possible_names:
        if name in df.columns:
            return name

    lowered = {str(c).lower().strip(): c for c in df.columns}

    for name in possible_names:
        key = name.lower().strip()

        if key in lowered:
            return lowered[key]

    raise ValueError(
        f"Could not find any of these columns: {possible_names}\n"
        f"Available columns: {list(df.columns)}"
    )


category_col = find_column([
    "category",
    "Category",
    "Grievance Category"
])


subcategory_col = find_column([
    "sub_category",
    "Sub Category",
    "Subcategory",
    "Grievance Sub Category"
])

date_col = find_column([
    "grievance_date",
    "Grievance Date",
    "Date"
])

ward_col = find_column([
    "ward_name",
    "Ward Name",
    "Ward"

])

status_col = find_column([
    "grievance_status",

    "Grievance Status",
    "Status"
])


# ---------------------------------------------------------
# Clean analytical fields
# ---------------------------------------------------------

df[date_col] = pd.to_datetime(
    df[date_col],
    errors="coerce"
)

df = df.dropna(subset=[date_col])

df["month"] = df[date_col].dt.strftime("%b")
df["month_num"] = df[date_col].dt.month

df["category_clean"] = (
    df[category_col]
    .fillna("Unknown")
    .astype(str)
    .str.strip()
)

df["subcategory_clean"] = (
    df[subcategory_col]
    .fillna("Unknown")
    .astype(str)
    .str.strip()
)

df["ward_clean"] = (
    df[ward_col]
    .fillna("Unknown")
    .astype(str)
    .str.strip()
)

df["status_clean"] = (
    df[status_col]
    .fillna("Unknown")
    .astype(str)
    .str.strip()
)


# ---------------------------------------------------------
# 1. Category → Subcategory
# ---------------------------------------------------------

category_subcategory = (
    df.groupby(
        ["category_clean", "subcategory_clean"],
        dropna=False
    )
    .size()
    .reset_index(name="count")
    .sort_values(
        ["category_clean", "count"],
        ascending=[True, False]
    )
)

category_subcategory.columns = [
    "category",
    "subcategory",
    "count"
]

category_subcategory.to_json(
    f"{OUT}/category_subcategory.json",
    orient="records"
)


# ---------------------------------------------------------
# 2. Category → Ward
# ---------------------------------------------------------

category_ward = (
    df.groupby(
        ["category_clean", "ward_clean"],
        dropna=False
    )
    .size()
    .reset_index(name="count")
    .sort_values(
        ["category_clean", "count"],
        ascending=[True, False]
    )
)

category_ward.columns = [
    "category",
    "ward",
    "count"
]

category_ward.to_json(
    f"{OUT}/category_ward.json",
    orient="records"
)


# ---------------------------------------------------------
# 3. Category → Month
# ---------------------------------------------------------

category_month = (
    df.groupby(
        ["category_clean", "month_num", "month"],
        dropna=False
    )
    .size()
    .reset_index(name="count")
    .sort_values(
        ["category_clean", "month_num"]
    )
)

category_month.columns = [
    "category",
    "month_num",
    "month",
    "count"
]

category_month.to_json(
    f"{OUT}/category_month.json",
    orient="records"
)


# ---------------------------------------------------------
# 4. Ward → Category
# ---------------------------------------------------------

ward_category = (
    df.groupby(
        ["ward_clean", "category_clean"],
        dropna=False
    )
    .size()
    .reset_index(name="count")
    .sort_values(
        ["ward_clean", "count"],
        ascending=[True, False]
    )
)

ward_category.columns = [
    "ward",
    "category",
    "count"
]

ward_category.to_json(
    f"{OUT}/ward_category.json",
    orient="records"
)


# ---------------------------------------------------------
# 5. Category → Status
# ---------------------------------------------------------

category_status = (
    df.groupby(
        ["category_clean", "status_clean"],
        dropna=False
    )
    .size()
    .reset_index(name="count")
    .sort_values(
        ["category_clean", "count"],
        ascending=[True, False]
    )
)

category_status.columns = [
    "category",
    "status",
    "count"
]

category_status.to_json(
    f"{OUT}/category_status.json",
    orient="records"
)


# ---------------------------------------------------------
# 6. Overall month data
# ---------------------------------------------------------

monthly = (
    df.groupby(
        ["month_num", "month"],
        dropna=False
    )
    .size()
    .reset_index(name="count")
    .sort_values("month_num")
)

monthly.to_json(
    f"{OUT}/monthly_detailed.json",
    orient="records"
)


# ---------------------------------------------------------
# 7. Dashboard metadata
# ---------------------------------------------------------

metadata = {
    "total_records": int(len(df)),
    "categories": int(df["category_clean"].nunique()),
    "subcategories": int(df["subcategory_clean"].nunique()),
    "wards": int(df["ward_clean"].nunique()),
    "statuses": int(df["status_clean"].nunique()),
    "date_min": str(df[date_col].min().date()),
    "date_max": str(df[date_col].max().date()),
}

with open(
    f"{OUT}/dashboard_metadata.json",
    "w",
    encoding="utf-8"
) as f:
    json.dump(metadata, f, indent=2)


print()
print("✅ DASHBOARD INTELLIGENCE LAYER READY")
print()
print("Generated:")
print("  • category_subcategory.json")
print("  • category_ward.json")
print("  • category_month.json")
print("  • ward_category.json")
print("  • category_status.json")
print("  • monthly_detailed.json")
print("  • dashboard_metadata.json")
print()
print("🚀 CivicSense now has drill-down data.")