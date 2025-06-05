WITH _deployments AS (
    SELECT
        cdc.cicd_deployment_id AS deployment_id,
        MAX(cdc.finished_date) AS deployment_finished_date
    FROM
        cicd_deployment_commits cdc
        -- Assuming a join with repos if needed for project filtering
        -- JOIN repos ON cdc.repo_id = repos.id
    WHERE
        cdc.result = 'SUCCESS'
        AND cdc.environment = 'PRODUCTION'
    GROUP BY
        cdc.cicd_deployment_id
),

_incidents AS (
    SELECT
        i.id AS incident_id,
        i.created_date AS incident_created_date
    FROM
        issues i
    WHERE
        i.type = 'INCIDENT'
),

_deployments_with_incidents AS (
    SELECT
        d.deployment_id,
        d.deployment_finished_date,
        COUNT(i.incident_id) AS incident_count
    FROM
        _deployments d
        LEFT JOIN _incidents i
            ON UNIX_TIMESTAMP(i.incident_created_date) BETWEEN UNIX_TIMESTAMP(d.deployment_finished_date)
            AND UNIX_TIMESTAMP(d.deployment_finished_date) + 24 * 60 * 60 -- 24 hours in seconds
    GROUP BY
        d.deployment_id, d.deployment_finished_date
),

_change_failure_rate_per_month AS (
    SELECT
        DATE_FORMAT(dwi.deployment_finished_date, '%y/%m') AS month,
        SUM(CASE WHEN dwi.incident_count > 0 THEN 1 ELSE 0 END) / COUNT(*) AS change_failure_rate
    FROM
        _deployments_with_incidents dwi
    GROUP BY
        DATE_FORMAT(dwi.deployment_finished_date, '%y/%m')
)

SELECT
    cm.month,
    COALESCE(cfr.change_failure_rate, 0) AS change_failure_rate
FROM
    calendar_months cm
    LEFT JOIN _change_failure_rate_per_month cfr ON cm.month = cfr.month
WHERE
    cm.month_timestamp BETWEEN FROM_UNIXTIME(?) AND FROM_UNIXTIME(?)
ORDER BY
    cm.month;