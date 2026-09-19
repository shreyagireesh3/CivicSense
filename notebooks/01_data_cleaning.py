"""
CivicSense — data quality audit and cleaning pipeline.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd


# ------------------------------------------------------------
# 1. PROJECT PATHS
# ------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DATA = PROJECT_ROOT / "data" / "raw" / "bbmp_grievances_2025_raw.csv"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
REPORTS_DIR = PROJECT_ROOT / "reports"

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


# ------------------------------------------------------------
# 2. LOAD DATA
# ------------------------------------------------------------

print("\n" + "=" * 70)
print("🏙️  CIVICSENSE — DATA QUALITY & CLEANING PIPELINE")
print("=" * 70)
print("\n📂 Loading dataset...")
print(f"Path: {RAW_DATA}")

if not RAW_DATA.exists():
	raise FileNotFoundError(f"\n❌ Dataset not found:\n{RAW_DATA}")

df = pd.read_csv(RAW_DATA)
print("✅ Dataset loaded successfully")


# ------------------------------------------------------------
# 3. INITIAL DATA AUDIT
# ------------------------------------------------------------

print("\n" + "=" * 70)
print("📊 INITIAL DATA AUDIT")
print("=" * 70)
print(f"\nRows       : {len(df):,}")
print(f"Columns    : {len(df.columns)}")
print(f"Duplicates : {df.duplicated().sum():,}")


# ------------------------------------------------------------
# 4. STANDARDIZE COLUMN NAMES
# ------------------------------------------------------------

df.columns = (
	df.columns.str.strip().str.lower().str.replace(r"\s+", "_", regex=True)
)

print("\n📋 Columns:")
for column in df.columns:
	print(f"   • {column}")


# ------------------------------------------------------------
# 5–9. TYPES, MISSING VALUES, DUPLICATES, AND TEXT CLEANING
# ------------------------------------------------------------

print("\n🔤 Original Data Types:")
print(df.dtypes)

missing_before = pd.DataFrame({
	"column": df.columns,
	"missing_count": df.isna().sum().values,
})
missing_before["missing_percentage"] = (
	missing_before["missing_count"] / len(df) * 100
).round(2)
print("\n❓ Missing Values — Before Cleaning")
print(missing_before.to_string(index=False))

duplicates_before = df.duplicated().sum()
if duplicates_before > 0:
	df = df.drop_duplicates().copy()
print(f"\n🔁 Duplicate records removed: {duplicates_before:,}")

text_columns = [
	"category", "sub_category", "ward_name", "grievance_status",
	"staff_remarks", "staff_name",
]
for column in text_columns:
	if column in df.columns:
		df[column] = df[column].astype("string").str.strip()

fill_values = {
	"category": "Unknown", "sub_category": "Unknown", "ward_name": "Unknown",
	"grievance_status": "Unknown", "staff_remarks": "No Remarks",
	"staff_name": "Unassigned",
}
for column, value in fill_values.items():
	if column in df.columns:
		df[column] = df[column].fillna(value)


# ------------------------------------------------------------
# 10–13. DATES AND FEATURES
# ------------------------------------------------------------

if "grievance_date" not in df.columns:
	raise KeyError("Required column missing: grievance_date")
df["grievance_date"] = pd.to_datetime(df["grievance_date"], errors="coerce")
print(f"\n📅 Invalid dates: {df['grievance_date'].isna().sum():,}")

df["year"] = df["grievance_date"].dt.year
df["month"] = df["grievance_date"].dt.month
df["month_name"] = df["grievance_date"].dt.month_name()
df["quarter"] = "Q" + df["grievance_date"].dt.quarter.astype("string")
df["day_of_week"] = df["grievance_date"].dt.day_name()
df["week"] = df["grievance_date"].dt.isocalendar().week.astype("Int64")

status_clean = df["grievance_status"].astype("string").str.strip().str.lower()
df["is_closed"] = (status_clean == "closed").astype(int)
df["is_reopened"] = (status_clean == "reopen").astype(int)
df["is_open"] = (status_clean != "closed").astype(int)

if "complaint_id" not in df.columns:
	raise KeyError("Required column missing: complaint_id")
df["category_complaint_count"] = df.groupby("category")["complaint_id"].transform("count")
df["ward_complaint_count"] = df.groupby("ward_name")["complaint_id"].transform("count")
df["ward_category_count"] = df.groupby(["ward_name", "category"])["complaint_id"].transform("count")


# ------------------------------------------------------------
# 14–17. REPORTS AND OUTPUT
# ------------------------------------------------------------

missing_after = pd.DataFrame({
	"column": df.columns,
	"missing_count": df.isna().sum().values,
})
missing_after["missing_percentage"] = (
	missing_after["missing_count"] / len(df) * 100
).round(2)

data_dictionary = pd.DataFrame({
	"column": df.columns,
	"data_type": [str(df[column].dtype) for column in df.columns],
	"non_null_count": [df[column].notna().sum() for column in df.columns],
	"unique_values": [df[column].nunique() for column in df.columns],
})

clean_file = PROCESSED_DIR / "bbmp_grievances_2025_cleaned.csv"
df.to_csv(clean_file, index=False)
missing_before.to_csv(REPORTS_DIR / "missing_values_before.csv", index=False)
missing_after.to_csv(REPORTS_DIR / "missing_values_after.csv", index=False)
data_dictionary.to_csv(REPORTS_DIR / "data_dictionary.csv", index=False)

print("\n" + "=" * 70)
print("✅ CLEANING COMPLETE")
print("=" * 70)
print(f"\nFinal rows       : {len(df):,}")
print(f"Final columns    : {len(df.columns)}")
print(f"Duplicate rows   : {df.duplicated().sum():,}")
print(f"Clean dataset    : {clean_file}")
print("\n📁 Generated files:")
print("   • data/processed/bbmp_grievances_2025_cleaned.csv")
print("   • reports/missing_values_before.csv")
print("   • reports/missing_values_after.csv")
print("   • reports/data_dictionary.csv")
print("\n" + "=" * 70)
print("🏙️  CIVICSENSE DATA FOUNDATION READY")
print("=" * 70)
