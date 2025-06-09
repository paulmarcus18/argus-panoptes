WITH RECURSIVE calendar_days AS (
  SELECT DATE(?) AS day
  UNION ALL
  SELECT day + INTERVAL 1 DAY
  FROM calendar_days
  WHERE day + INTERVAL 1 DAY <= DATE(?)
),
_pr_stats AS (
  SELECT DISTINCT
    pr.id,
    DATE_FORMAT(cdc.finished_date, '%Y-%m-%d') AS day,
    ppm.pr_cycle_time
  FROM pull_requests pr
  JOIN project_pr_metrics ppm ON ppm.id = pr.id
  JOIN project_mapping pm ON pr.base_repo_id = pm.row_id AND pm.`table` = 'repos'
  JOIN cicd_deployment_commits cdc ON ppm.deployment_commit_id = cdc.id
  WHERE
    pm.project_name IN (?) 
    AND pr.merged_date IS NOT NULL
    AND ppm.pr_cycle_time IS NOT NULL
    AND cdc.finished_date BETWEEN (?) AND (?)
),
_find_median_clt_each_day_ranks AS (
  SELECT *,
         PERCENT_RANK() OVER (PARTITION BY day ORDER BY pr_cycle_time) AS ranks
  FROM _pr_stats
),
_clt AS (
  SELECT 
    day,
    MAX(pr_cycle_time) AS median_change_lead_time
  FROM _find_median_clt_each_day_ranks
  WHERE ranks <= 0.5
  GROUP BY day
)

SELECT 
  DATE_FORMAT(cd.day, '%Y-%m-%d') AS data_key,
  CASE 
    WHEN _clt.median_change_lead_time IS NULL THEN 0
    ELSE _clt.median_change_lead_time / 60
  END AS data_value
FROM 
  calendar_days cd
LEFT JOIN _clt ON cd.day = _clt.day
ORDER BY cd.day;
