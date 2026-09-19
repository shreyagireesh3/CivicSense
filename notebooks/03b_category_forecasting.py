# ============================================================
# CIVICSENSE
# 03B — CATEGORY-LEVEL PREDICTIVE ANALYTICS
# ============================================================

from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


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

print("\n" + "=" * 80)
print("🏙️ CIVICSENSE — CATEGORY FORECASTING")
print("=" * 80)

df = pd.read_csv(CLEAN_DATA)

df["grievance_date"] = pd.to_datetime(
    df["grievance_date"],
    errors="coerce"
)

df = df.dropna(
    subset=["grievance_date", "category"]
).copy()

print(f"\nRecords loaded: {len(df):,}")


# ============================================================
# 3. SELECT TOP 5 CATEGORIES
# ============================================================

top_categories = (
    df["category"]
    .value_counts()
    .head(5)
    .index
    .tolist()
)

print("\n🎯 Categories selected for forecasting:")

for i, category in enumerate(
    top_categories,
    start=1
):
    count = (
        df["category"]
        .eq(category)
        .sum()
    )

    print(
        f"{i}. {category} "
        f"→ {count:,} complaints"
    )


# ============================================================
# 4. FEATURE ENGINEERING FUNCTION
# ============================================================

def create_features(series):

    features = pd.DataFrame(
        index=series.index
    )

    # Long-term trend
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

    # Rolling averages
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


# ============================================================
# 5. STORAGE
# ============================================================

all_results = []
all_forecasts = []


# ============================================================
# 6. TRAIN ONE MODEL PER CATEGORY
# ============================================================

for category in top_categories:

    print("\n" + "-" * 80)
    print(f"📊 CATEGORY: {category}")
    print("-" * 80)

    # --------------------------------------------------------
    # Filter category
    # --------------------------------------------------------

    category_df = df[
        df["category"] == category
    ].copy()

    # --------------------------------------------------------
    # Daily complaint volume
    # --------------------------------------------------------

    daily = (
        category_df
        .groupby(
            category_df[
                "grievance_date"
            ].dt.floor("D")
        )
        .size()
    )

    # Fill missing dates with zero
    full_dates = pd.date_range(
        daily.index.min(),
        daily.index.max(),
        freq="D"
    )

    daily = (
        daily
        .reindex(
            full_dates,
            fill_value=0
        )
        .rename_axis("date")
    )

    series = daily.astype(float)

    # --------------------------------------------------------
    # Create features
    # --------------------------------------------------------

    X = create_features(series)

    data = X.copy()

    data["target"] = series

    data = data.dropna()

    FEATURES = [
        column
        for column in data.columns
        if column != "target"
    ]

    # --------------------------------------------------------
    # Chronological split
    # --------------------------------------------------------

    split_index = int(
        len(data) * 0.80
    )

    train = data.iloc[
        :split_index
    ]

    test = data.iloc[
        split_index:
    ]

    X_train = train[FEATURES]
    y_train = train["target"]

    X_test = test[FEATURES]
    y_test = test["target"]

    # --------------------------------------------------------
    # 7-DAY BASELINE
    # --------------------------------------------------------

    baseline_predictions = (
        test["lag_7"]
    )

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

    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # EVALUATION
    # --------------------------------------------------------

    model_mae = mean_absolute_error(
        y_test,
        predictions
    )

    model_rmse = np.sqrt(
        mean_squared_error(
            y_test,
            predictions
        )
    )

    model_r2 = r2_score(
        y_test,
        predictions
    )

    improvement = (
        (baseline_mae - model_mae)
        / baseline_mae
        * 100
    )

    beats_baseline = (
        model_mae < baseline_mae
    )

    print(
        f"\nBaseline MAE : "
        f"{baseline_mae:.2f}"
    )

    print(
        f"Model MAE    : "
        f"{model_mae:.2f}"
    )

    print(
        f"\nBaseline RMSE: "
        f"{baseline_rmse:.2f}"
    )

    print(
        f"Model RMSE   : "
        f"{model_rmse:.2f}"
    )

    print(
        f"\nModel R²     : "
        f"{model_r2:.4f}"
    )

    print(
        f"MAE change   : "
        f"{improvement:.2f}%"
    )

    if beats_baseline:

        print(
            "✅ MODEL BEATS BASELINE"
        )

    else:

        print(
            "⚠️ MODEL DOES NOT BEAT BASELINE"
        )

    # --------------------------------------------------------
    # Store evaluation
    # --------------------------------------------------------

    all_results.append({
        "category": category,
        "observations": len(data),
        "baseline_mae": round(
            baseline_mae,
            2
        ),
        "model_mae": round(
            model_mae,
            2
        ),
        "baseline_rmse": round(
            baseline_rmse,
            2
        ),
        "model_rmse": round(
            model_rmse,
            2
        ),
        "model_r2": round(
            model_r2,
            4
        ),
        "mae_improvement_percent": round(
            improvement,
            2
        ),
        "beats_baseline": beats_baseline
    })

    # --------------------------------------------------------
    # Save model only if it beats baseline
    # --------------------------------------------------------

    safe_name = (
        category
        .lower()
        .replace(" ", "_")
        .replace("(", "")
        .replace(")", "")
        .replace("/", "_")
    )

    if beats_baseline:

        model_path = (
            MODELS_DIR
            / f"forecast_{safe_name}.joblib"
        )

        import joblib

        joblib.dump(
            model,
            model_path
        )

        print(
            f"💾 Model saved: "
            f"{model_path.name}"
        )

        # ----------------------------------------------------
        # Retrain on all category data
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # Recursive 14-day forecast
        # ----------------------------------------------------

        history = series.copy()

        category_forecast = []

        for _ in range(14):

            next_date = (
                history.index.max()
                + pd.Timedelta(days=1)
            )

            temp_series = history.copy()

            temp_series.loc[
                next_date
            ] = np.nan

            feature_frame = (
                create_features(
                    temp_series
                )
            )

            next_features = (
                feature_frame
                .loc[[next_date]]
                [FEATURES]
            )

            prediction = (
                final_model
                .predict(
                    next_features
                )[0]
            )

            prediction = max(
                0,
                prediction
            )

            category_forecast.append({
                "category": category,
                "date": next_date,
                "forecast_complaints": round(
                    prediction
                )
            })

            history.loc[
                next_date
            ] = prediction

        all_forecasts.extend(
            category_forecast
        )


# ============================================================
# 7. SAVE MODEL COMPARISON
# ============================================================

results_df = pd.DataFrame(
    all_results
)

results_df.to_csv(
    REPORTS_DIR
    / "category_forecast_model_comparison.csv",
    index=False
)


# ============================================================
# 8. SAVE VALIDATED FORECASTS
# ============================================================

forecast_df = pd.DataFrame(
    all_forecasts
)

forecast_df.to_csv(
    REPORTS_DIR
    / "validated_category_forecasts.csv",
    index=False
)


# ============================================================
# 9. FINAL SUMMARY
# ============================================================

print("\n" + "=" * 80)
print("📈 CATEGORY MODEL COMPARISON")
print("=" * 80)

print(
    results_df.to_string(
        index=False
    )
)


validated = results_df[
    results_df["beats_baseline"] == True
]

print("\n" + "=" * 80)
print("🏆 VALIDATED CATEGORY FORECASTS")
print("=" * 80)

print(
    f"\nModels beating baseline: "
    f"{len(validated)} / "
    f"{len(results_df)}"
)


if not forecast_df.empty:

    print(
        "\nForecasted demand over next 14 days:"
    )

    forecast_summary = (
        forecast_df
        .groupby("category")[
            "forecast_complaints"
        ]
        .sum()
        .sort_values(
            ascending=False
        )
    )

    print(
        forecast_summary.to_string()
    )

else:

    print(
        "\n⚠️ No category model beat "
        "the baseline."
    )


print("\n" + "=" * 80)
print("✅ CATEGORY FORECASTING COMPLETE")
print("=" * 80)

print(
    "\nGenerated:"
)

print(
    " • category_forecast_model_comparison.csv"
)

print(
    " • validated_category_forecasts.csv"
)

print(
    "\n🏙️ CIVICSENSE CATEGORY PREDICTIVE LAYER READY"
)