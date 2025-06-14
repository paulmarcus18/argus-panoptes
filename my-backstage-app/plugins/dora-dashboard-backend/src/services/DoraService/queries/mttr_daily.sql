-- Metric 4: Median time to restore service (MTTR) per day
WITH RECURSIVE calendar_days AS (
  SELECT DATE(?) AS day
  UNION ALL
  SELECT day + INTERVAL 1 DAY
  FROM calendar_days
  WHERE day + INTERVAL 1 DAY <= DATE(?)
),
_incidents AS (
  SELECT
    DISTINCT i.id,
    DATE_FORMAT(i.resolution_date, '%Y-%m-%d') AS day,
    CAST(i.lead_time_minutes AS SIGNED) AS lead_time_minutes
  FROM incidents i
  JOIN project_mapping pm 
    ON i.scope_id = pm.row_id 
    AND pm.`table` = i.`table`
  WHERE
    pm.project_name IN (?)  -- Replace dynamically for testing
    AND i.lead_time_minutes IS NOT NULL
    AND i.resolution_date BETWEEN ? AND ?
),
_find_median_mttr_each_day_ranks AS (
  SELECT *,
    PERCENT_RANK() OVER (
      PARTITION BY day
      ORDER BY lead_time_minutes
    ) AS ranks
  FROM _incidents
),
_mttr AS (
  SELECT
    day,
    MAX(lead_time_minutes) AS median_time_to_resolve
  FROM _find_median_mttr_each_day_ranks
  WHERE ranks <= 0.5
  GROUP BY day
)

SELECT
  DATE_FORMAT(cd.day, '%Y-%m-%d') AS data_key,
  CASE 
    WHEN m.median_time_to_resolve IS NULL THEN 0
    ELSE m.median_time_to_resolve / 60
  END AS data_value
FROM calendar_days cd
LEFT JOIN _mttr m ON cd.day = m.day
ORDER BY cd.day;
