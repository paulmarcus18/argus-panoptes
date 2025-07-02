with _deployments as (
  SELECT
    cdc.cicd_deployment_id as deployment_id,
    max(cdc.finished_date) as deployment_finished_date
  FROM
    cicd_deployment_commits cdc
    JOIN project_mapping pm on cdc.cicd_scope_id = pm.row_id
    and pm.`table` = 'cicd_scopes'
  WHERE
    pm.project_name IN (?)
    and cdc.result = 'SUCCESS'
    and cdc.environment = 'PRODUCTION'
  GROUP BY
    1
  HAVING
    max(cdc.finished_date) BETWEEN (?) AND (?)
),
_failure_caused_by_deployments as (
  SELECT
    d.deployment_id,
    d.deployment_finished_date,
    count(
      distinct case
        when i.id is not null then d.deployment_id
        else null
      end
    ) as has_incident
  FROM
    _deployments d
    left join project_incident_deployment_relationships pim on d.deployment_id = pim.deployment_id
    left join incidents i on pim.id = i.id
  GROUP BY
    1,
    2
),
_change_failure_rate_for_each_month as (
  SELECT
    date_format(deployment_finished_date, '%y/%m') as month,
    case
      when count(deployment_id) is null then null
      else sum(has_incident) / count(deployment_id)
    end as change_failure_rate
  FROM
    _failure_caused_by_deployments
  GROUP BY
    1
)
SELECT
  cm.month as data_key,
  cfr.change_failure_rate as data_value
FROM
  calendar_months cm
  LEFT JOIN _change_failure_rate_for_each_month cfr on cm.month = cfr.month
WHERE
  cm.month_timestamp BETWEEN (?) AND (?)