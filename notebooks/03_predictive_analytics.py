# ============================================================
# CIVICSENSE
# 03 — PREDICTIVE ANALYTICS V2
# Time-Series Grievance Volume Forecasting
# ============================================================

from pathlib import Path

import numpy as np
import pandas as pd
import joblib

from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.inspection import permutation_importance
from sklearn.model_selection import TimeSeriesSplit


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

REPORTS_DIR = PROJECT_ROOT / "reports"
MODELS_DIR = PROJECT_ROOT / "models"

REPORTS_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# 2. LOAD DATA
# ============================================================

print("\n" + "=" * 75)
print("🔮 CIVICSENSE — PREDICTIVE ANALYTICS V2")
print("=" * 75)

df = pd.read_csv(CLEAN_DATA)

df["grievance_date"] = pd.to_datetime(
    df["grievance_date"],
    errors="coerce"
)

df = df.dropna(
    subset=["grievance_date"]
).copy()

print(f"\nRecords loaded: {len(df):,}")


# ============================================================
# 3. DAILY GRIEVANCE SERIES
# ============================================================

daily = (
    df.groupby(
        df["grievance_date"].dt.floor("D")
    )
    .size()
    .rename("complaints")
)

full_dates = pd.date_range(
    daily.index.min(),
    daily.index.max(),
    freq="D"
)

daily = (
    daily
    .reindex(full_dates, fill_value=0)
    .rename_axis("date")
    .reset_index()
)

print(
    f"Date range: "
    f"{daily['date'].min().date()} → "
    f"{daily['date'].max().date()}"
)

print(f"Daily observations: {len(daily)}")


# ============================================================
# 4. FEATURE ENGINEERING
# ============================================================

def create_features(series):

    features = pd.DataFrame(
        index=series.index
    )

    # Trend
    features["trend"] = np.arange(
        len(series)
    )

    # Weekly seasonality
    dow = series.index.dayofweek

    features["dow_sin"] = np.sin(
        2 * np.pi * dow / 7
    )

    features["dow_cos"] = np.cos(
        2 * np.pi * dow / 7
    )

    # Annual seasonality
    day_of_year = (
        series.index.dayofyear
    )

    features["doy_sin"] = np.sin(
        2 * np.pi * day_of_year / 365
    )

    features["doy_cos"] = np.cos(
        2 * np.pi * day_of_year / 365
    )

    # Lag features
    for lag in [
        1,
        2,
        3,
        7,
        14,
        21,
        28
    ]:

        features[f"lag_{lag}"] = (
            series.shift(lag)
        )

    # Rolling historical averages
    for window in [
        7,
        14,
        28
    ]:

        features[f"rolling_{window}"] = (
            series
            .shift(1)
            .rolling(window)
            .mean()
        )

    return features


series = (
    daily
    .set_index("date")["complaints"]
)

X = create_features(series)

data = X.copy()

data["target"] = series

data = data.dropna()

print(
    f"\nUsable modelling observations: "
    f"{len(data)}"
)


# ============================================================
# 5. FINAL HOLDOUT TEST SET
# ============================================================

split_index = int(
    len(data) * 0.80
)

train = data.iloc[
    :split_index
].copy()

test = data.iloc[
    split_index:
].copy()

FEATURES = [
    column
    for column in data.columns
    if column != "target"
]

X_train = train[FEATURES]
y_train = train["target"]

X_test = test[FEATURES]
y_test = test["target"]


# ============================================================
# 6. BASELINE — 7 DAY SEASONAL NAIVE
# ============================================================

baseline_predictions = test["lag_7"]

baseline_mae = mean_absolute_error(
    y_test,
    baseline_predictions
)

baseline_rmse = np.sqrt(
    mean_squared_error(
        y_test,
        baseline_predictions
    )
)

baseline_r2 = r2_score(
    y_test,
    baseline_predictions
)


# ============================================================
# 7. HISTOGRAM GRADIENT BOOSTING
# ============================================================

model = HistGradientBoostingRegressor(
    learning_rate=0.05,
    max_iter=300,
    max_leaf_nodes=8,
    min_samples_leaf=5,
    l2_regularization=5,
    random_state=42
)

model.fit(
    X_train,
    y_train
)

predictions = model.predict(
    X_test
)

predictions = np.maximum(
    predictions,
    0
)


# ============================================================
# 8. EVALUATION
# ============================================================

mae = mean_absolute_error(
    y_test,
    predictions
)

rmse = np.sqrt(
    mean_squared_error(
        y_test,
        predictions
    )
)

r2 = r2_score(
    y_test,
    predictions
)

improvement = (
    (baseline_mae - mae)
    / baseline_mae
    * 100
)


print("\n" + "=" * 75)
print("📈 MODEL PERFORMANCE")
print("=" * 75)

print(
    f"\n7-Day Baseline MAE : "
    f"{baseline_mae:.2f}"
)

print(
    f"Model MAE          : "
    f"{mae:.2f}"
)

print(
    f"\n7-Day Baseline RMSE: "
    f"{baseline_rmse:.2f}"
)

print(
    f"Model RMSE         : "
    f"{rmse:.2f}"
)

print(
    f"\nBaseline R²        : "
    f"{baseline_r2:.4f}"
)

print(
    f"Model R²           : "
    f"{r2:.4f}"
)

print(
    f"\nMAE improvement    : "
    f"{improvement:.2f}%"
)


if mae < baseline_mae:

    print(
        "\n✅ MODEL BEATS THE BASELINE"
    )

else:

    print(
        "\n⚠️ MODEL DOES NOT BEAT BASELINE"
    )


# ============================================================
# 9. TIME-SERIES CROSS VALIDATION
# ============================================================

print("\n" + "=" * 75)
print("🔁 TIME-SERIES CROSS-VALIDATION")
print("=" * 75)

tscv = TimeSeriesSplit(
    n_splits=4
)

cv_results = []

for fold, (train_idx, val_idx) in enumerate(
    tscv.split(data),
    start=1
):

    X_cv_train = data.iloc[
        train_idx
    ][FEATURES]

    y_cv_train = data.iloc[
        train_idx
    ]["target"]

    X_cv_val = data.iloc[
        val_idx
    ][FEATURES]

    y_cv_val = data.iloc[
        val_idx
    ]["target"]

    cv_model = HistGradientBoostingRegressor(
        learning_rate=0.05,
        max_iter=300,
        max_leaf_nodes=8,
        min_samples_leaf=5,
        l2_regularization=5,
        random_state=42
    )

    cv_model.fit(
        X_cv_train,
        y_cv_train
    )

    cv_prediction = cv_model.predict(
        X_cv_val
    )

    cv_mae = mean_absolute_error(
        y_cv_val,
        cv_prediction
    )

    cv_rmse = np.sqrt(
        mean_squared_error(
            y_cv_val,
            cv_prediction
        )
    )

    cv_results.append({
        "fold": fold,
        "mae": cv_mae,
        "rmse": cv_rmse
    })

    print(
        f"Fold {fold}: "
        f"MAE={cv_mae:.2f}, "
        f"RMSE={cv_rmse:.2f}"
    )


cv_results_df = pd.DataFrame(
    cv_results
)

cv_results_df.to_csv(
    REPORTS_DIR
    / "time_series_cross_validation.csv",
    index=False
)

print(
    f"\nAverage CV MAE: "
    f"{cv_results_df['mae'].mean():.2f}"
)

print(
    f"Average CV RMSE: "
    f"{cv_results_df['rmse'].mean():.2f}"
)


# ============================================================
# 10. TEST PREDICTIONS
# ============================================================

evaluation = test[
    ["target"]
].copy()

evaluation = evaluation.rename(
    columns={
        "target": "actual_complaints"
    }
)

evaluation["predicted_complaints"] = (
    predictions.round(0).astype(int)
)

evaluation["absolute_error"] = (
    abs(
        evaluation["actual_complaints"]
        - evaluation["predicted_complaints"]
    )
)

evaluation.to_csv(
    REPORTS_DIR
    / "daily_forecast_test_results.csv"
)


# ============================================================
# 11. FEATURE IMPORTANCE
# ============================================================

permutation = permutation_importance(
    model,
    X_test,
    y_test,
    n_repeats=10,
    random_state=42,
    scoring="neg_mean_absolute_error"
)

importance = pd.DataFrame({
    "feature": FEATURES,
    "importance": permutation.importances_mean
})

importance = importance.sort_values(
    "importance",
    ascending=False
)

importance.to_csv(
    REPORTS_DIR
    / "forecast_feature_importance.csv",
    index=False
)

print("\n🧠 Most informative features:")

print(
    importance.head(10)
    .to_string(index=False)
)


# ============================================================
# 12. RETRAIN MODEL ON ALL AVAILABLE DATA
# ============================================================

final_model = HistGradientBoostingRegressor(
    learning_rate=0.05,
    max_iter=300,
    max_leaf_nodes=8,
    min_samples_leaf=5,
    l2_regularization=5,
    random_state=42
)

final_model.fit(
    data[FEATURES],
    data["target"]
)


# ============================================================
# 13. RECURSIVE 14-DAY FORECAST
# ============================================================

history = series.copy()

forecast_rows = []

for _ in range(14):

    next_date = (
        history.index.max()
        + pd.Timedelta(days=1)
    )

    temp_series = history.copy()

    temp_series.loc[
        next_date
    ] = np.nan

    feature_frame = create_features(
        temp_series
    )

    next_features = (
        feature_frame
        .loc[[next_date]]
        [FEATURES]
    )

    prediction = final_model.predict(
        next_features
    )[0]

    prediction = max(
        0,
        prediction
    )

    forecast_rows.append({
        "date": next_date,
        "forecast_complaints": round(
            prediction
        )
    })

    history.loc[
        next_date
    ] = prediction


forecast = pd.DataFrame(
    forecast_rows
)

forecast.to_csv(
    REPORTS_DIR
    / "14_day_grievance_forecast.csv",
    index=False
)


# ============================================================
# 14. FORECAST SUMMARY
# ============================================================

print("\n" + "=" * 75)
print("🔮 NEXT 14-DAY GRIEVANCE FORECAST")
print("=" * 75)

print(
    forecast.to_string(
        index=False
    )
)

print(
    f"\nExpected total complaints: "
    f"{forecast['forecast_complaints'].sum():,.0f}"
)

print(
    f"Expected daily average: "
    f"{forecast['forecast_complaints'].mean():,.0f}"
)


# ============================================================
# 15. SAVE MODEL
# ============================================================

model_path = (
    MODELS_DIR
    / "civicsense_grievance_forecaster_v2.joblib"
)

joblib.dump(
    final_model,
    model_path
)

print(
    f"\n💾 Model saved:"
    f"\n{model_path}"
)


# ============================================================
# FINAL
# ============================================================

print("\n" + "=" * 75)
print("✅ PREDICTIVE ANALYTICS V2 COMPLETE")
print("=" * 75)

print(
    "\nGenerated:"
)

print(
    " • daily_forecast_test_results.csv"
)

print(
    " • time_series_cross_validation.csv"
)

print(
    " • forecast_feature_importance.csv"
)

print(
    " • 14_day_grievance_forecast.csv"
)

print(
    " • civicsense_grievance_forecaster_v2.joblib"
)

print(
    "\n🏙️ CIVICSENSE PREDICTIVE ENGINE V2 READY"
)