# CivicSense — AI-Ready Insight Report

## Evidence-Based Urban Intelligence

## Insight 1: Concentration

**Observation:** 63.23% of grievances come from the two highest-volume categories.

**Insight:** Civic demand is highly concentrated in a small number of service domains.

**Hypothesis:** Improving operational capacity in the highest-volume service domains could affect a substantial share of grievance demand.

**Recommendation:** Prioritise operational monitoring and resource planning for the highest-volume service categories.

**Evidence:** category_summary.csv + key_metrics.csv

---

## Insight 2: Service Demand

**Observation:** Electrical represents 33.19% of all recorded grievances.

**Insight:** Electrical is the largest grievance category in the dataset.

**Hypothesis:** The category may require greater operational attention because of its unusually high grievance volume.

**Recommendation:** Monitor Electrical grievance volume separately and investigate its highest-concentration subcategories.

**Evidence:** category_summary.csv

---

## Insight 3: Specific Issue

**Observation:** Street Light Not Working accounts for 31.38% of all grievances.

**Insight:** A single civic issue accounts for a substantial share of total citizen complaints.

**Hypothesis:** Recurring infrastructure issues may be generating repeated demand within the grievance system.

**Recommendation:** Track this issue independently by ward and over time to identify persistent hotspots.

**Evidence:** subcategory_summary.csv

---

## Insight 4: Geographic Demand

**Observation:** Horamavu records the highest absolute grievance volume.

**Insight:** The highest-volume ward should be examined alongside its complaint composition rather than volume alone.

**Hypothesis:** Different wards may experience different dominant civic problems.

**Recommendation:** Use ward-category analysis to identify the dominant issue profile of each ward.

**Evidence:** ward_summary.csv + top_ward_category_combinations.csv

---

## Insight 5: Operational Performance

**Observation:** 86.17% of records are marked as Closed.

**Insight:** The dataset shows a high recorded closure proportion, but closure status alone does not measure resolution quality or resolution time.

**Hypothesis:** Some categories may have different operational outcomes despite similar closure proportions.

**Recommendation:** Compare closure performance by category and ward while avoiding interpretation of closure as proof of service quality.

**Evidence:** category_status_summary.csv

---

## Insight 6: Predictive Intelligence

**Observation:** The validated overall forecasting model estimates approximately 15,978 grievances over the next 14 days.

**Insight:** Expected daily grievance demand is approximately 1,141 complaints according to the model.

**Hypothesis:** Recent temporal patterns may provide useful information for short-term workload planning.

**Recommendation:** Use the forecast as a planning signal rather than a guaranteed outcome, and review actual versus forecast volume as new data becomes available.

**Evidence:** 14_day_grievance_forecast.csv + predictive model evaluation

---

