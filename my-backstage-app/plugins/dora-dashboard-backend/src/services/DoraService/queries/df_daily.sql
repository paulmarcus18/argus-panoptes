WITH RECURSIVE calendar_days AS (
  SELECT DATE(?) AS day
  UNION ALL
  SELECT day + INTERVAL 1 DAY
  FROM calendar_days
  WHERE day + INTERVAL 1 DAY <= DATE(?)
),
_production_deployments AS (
  SELECT
    cdc.cicd_deployment_id,
    MAX(cdc.finished_date) AS deployment_finished_date
  FROM cicd_deployment_commits cdc
  JOIN project_mapping pm 
    ON cdc.cicd_scope_id = pm.row_id 
   AND pm.`table` = 'cicd_scopes'
  WHERE
    pm.project_name IN (?)
    AND cdc.result = 'SUCCESS'
    AND cdc.environment = 'PRODUCTION'
  GROUP BY cdc.cicd_deployment_id
  HAVING MAX(cdc.finished_date) BETWEEN (?) AND (?)
),
_daily_counts AS (
  SELECT 
    DATE(deployment_finished_date) AS day,
    COUNT(*) AS deployment_count
  FROM _production_deployments
  GROUP BY DATE(deployment_finished_date)
)

SELECT 
  DATE_FORMAT(cd.day, '%Y-%m-%d') AS data_key,
  COALESCE(dc.deployment_count, 0) AS data_value
FROM 
  calendar_days cd
LEFT JOIN _daily_counts dc ON cd.day = dc.day
ORDER BY cd.day;
