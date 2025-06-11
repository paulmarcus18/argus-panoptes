-- Metric 3: Change failure rate per day
WITH RECURSIVE calendar_days AS (
  SELECT DATE(?) AS day
  UNION ALL
  SELECT day + INTERVAL 1 DAY
  FROM calendar_days
  WHERE day + INTERVAL 1 DAY <= DATE(?)
),
_deployments AS (
  SELECT
    cdc.cicd_deployment_id AS deployment_id,
    MAX(cdc.finished_date) AS deployment_finished_date
  FROM cicd_deployment_commits cdc
  JOIN project_mapping pm ON cdc.cicd_scope_id = pm.row_id
    AND pm.`table` = 'cicd_scopes'
  WHERE
    pm.project_name IN (?)
    AND cdc.result = 'SUCCESS'
    AND cdc.environment = 'PRODUCTION'
  GROUP BY cdc.cicd_deployment_id
  HAVING MAX(cdc.finished_date) BETWEEN ? AND ?
),
_failure_caused_by_deployments AS (
  SELECT
    d.deployment_id,
    d.deployment_finished_date,
    COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN d.deployment_id ELSE NULL END) AS has_incident
  FROM _deployments d
  LEFT JOIN project_incident_deployment_relationships pim ON d.deployment_id = pim.deployment_id
  LEFT JOIN incidents i ON pim.id = i.id
  GROUP BY d.deployment_id, d.deployment_finished_date
),
_change_failure_rate_per_day AS (
  SELECT
    DATE(deployment_finished_date) AS day,
    SUM(has_incident) / COUNT(deployment_id) AS change_failure_rate
  FROM _failure_caused_by_deployments
  GROUP BY DATE(deployment_finished_date)
)
SELECT
  DATE_FORMAT(cd.day, '%Y-%m-%d') AS data_key,
  COALESCE(cfr.change_failure_rate, 0) AS data_value
FROM calendar_days cd
LEFT JOIN _change_failure_rate_per_day cfr ON cd.day = cfr.day
ORDER BY cd.day;
