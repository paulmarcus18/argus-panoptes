WITH _deployments AS (
  SELECT 
    DATE_FORMAT(deployment_finished_date, '%y/%m') AS month,
    COUNT(cicd_deployment_id) AS deployment_count
  FROM (
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
  ) _production_deployments
  GROUP BY month
)

SELECT 
  cm.month as data_key, 
  CASE 
    WHEN d.deployment_count IS NULL THEN 0 
    ELSE d.deployment_count 
  END AS `data_value`
FROM 
  calendar_months cm
LEFT JOIN _deployments d ON cm.month = d.month
WHERE cm.month_timestamp BETWEEN (?) AND (?);
