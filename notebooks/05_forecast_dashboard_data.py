import os
import json
import pandas as pd

OUT = "dashboard/public/data"
os.makedirs(OUT, exist_ok=True)

print("🔮 Building CivicSense forecast intelligence layer...")


# ---------------------------------------------------------
# Model evaluation
# ---------------------------------------------------------

evaluation = {
    "model": "HistGradientBoostingRegressor",
    "baseline": "7-day seasonal-naive",
    "baseline_mae": 202.93,
    "model_mae": 181.42,
    "baseline_rmse": 248.97,
    "model_rmse": 224.21,
    "mae_improvement_percent": 10.60,
    "model_r2": -0.0831,
    "baseline_r2": -0.3354,
    "interpretation": (
        "The model improves error over the seasonal-naive baseline, "
        "but the negative R² indicates that predictive performance "
        "remains limited. Forecasts should therefore be treated as "
        "planning signals rather than guaranteed outcomes."
    ),
}


with open(
    f"{OUT}/forecast_evaluation.json",
    "w",
    encoding="utf-8",
) as file:
    json.dump(
        evaluation,
        file,
        indent=2,
    )


# ---------------------------------------------------------
# 14-day forecast
# ---------------------------------------------------------

forecast_dates = [
    "2025-06-20",
    "2025-06-21",
    "2025-06-22",
    "2025-06-23",
    "2025-06-24",
    "2025-06-25",
    "2025-06-26",
    "2025-06-27",
    "2025-06-28",
    "2025-06-29",
    "2025-06-30",
    "2025-07-01",
    "2025-07-02",
    "2025-07-03",
]

forecast_values = [
    1247,
    1265,
    881,
    1128,
    1103,
    1089,
    1102,
    1136,
    1109,
    1070,
    1225,
    1204,
    1225,
    1194,
]


forecast_df = pd.DataFrame({
    "date": forecast_dates,
    "forecast": forecast_values,
})


forecast_df["date"] = pd.to_datetime(
    forecast_df["date"]
).dt.strftime("%d %b")


forecast_df.to_json(
    f"{OUT}/forecast_dashboard.json",
    orient="records",
)


# ---------------------------------------------------------
# Summary
# ---------------------------------------------------------

summary = {
    "horizon_days": len(forecast_values),
    "forecast_total": int(sum(forecast_values)),
    "forecast_average": round(
        sum(forecast_values) /
        len(forecast_values)
    ),
    "minimum": int(min(forecast_values)),
    "maximum": int(max(forecast_values)),
}


with open(
    f"{OUT}/forecast_summary.json",
    "w",
    encoding="utf-8",
) as file:
    json.dump(
        summary,
        file,
        indent=2,
    )


print()
print("✅ FORECAST INTELLIGENCE READY")
print()
print("Generated:")
print("  • forecast_evaluation.json")
print("  • forecast_dashboard.json")
print("  • forecast_summary.json")
print()
print(
    f"14-day forecast total: {summary['forecast_total']:,}"
)
print(
    f"Average daily forecast: {summary['forecast_average']:,}"
)
print(
    f"Model MAE improvement: "
    f"{evaluation['mae_improvement_percent']}%"
)
print()
print("🚀 Forecast layer ready for React.")