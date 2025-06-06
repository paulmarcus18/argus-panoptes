-- Metric 4: Median time to restore service (MTTR)
WITH _incidents AS (
  SELECT
    DISTINCT i.id,
    DATE_FORMAT(i.resolution_date, '%y/%m') AS month,
    CAST(lead_time_minutes AS SIGNED) AS lead_time_minutes
  FROM incidents i
  JOIN project_mapping pm 
    ON i.scope_id = pm.row_id 
    AND pm.`table` = i.`table`
  WHERE
    pm.project_name IN (?)  -- Dynamically replaced
    AND i.lead_time_minutes IS NOT NULL
    AND i.resolution_date BETWEEN (?) AND (?)
),

_find_median_mttr_each_month_ranks AS (
  SELECT *,
    PERCENT_RANK() OVER (
      PARTITION BY month
      ORDER BY lead_time_minutes
    ) AS ranks
  FROM _incidents
),

_mttr AS (
  SELECT
    month,
    MAX(lead_time_minutes) AS median_time_to_resolve
  FROM _find_median_mttr_each_month_ranks
  WHERE ranks <= 0.5
  GROUP BY month
)

SELECT
  cm.month AS data_key,
  CASE 
    WHEN m.median_time_to_resolve IS NULL THEN 0
    ELSE m.median_time_to_resolve / 60
  END AS data_value
FROM calendar_months cm
LEFT JOIN _mttr m ON cm.month = m.month
WHERE cm.month_timestamp BETWEEN (?) AND (?);
