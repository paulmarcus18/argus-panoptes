WITH RECURSIVE calendar_weeks AS (
    SELECT
        STR_TO_DATE(CONCAT(YEARWEEK(FROM_UNIXTIME(?)), ' Sunday'), '%X%V %W') AS week_date
    UNION ALL
    SELECT
        DATE_ADD(week_date, INTERVAL 1 WEEK)
    FROM
        calendar_weeks
    WHERE
        week_date < FROM_UNIXTIME(?)
),

_deployments AS (
    SELECT
        cdc.cicd_deployment_id AS deployment_id,
        MAX(cdc.finished_date) AS deployment_finished_date
    FROM
        cicd_deployment_commits cdc
    WHERE
        (? = '' OR LOWER(cdc.repo_id) LIKE CONCAT('%/', LOWER(?)))
        AND cdc.result = 'SUCCESS'
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

_change_failure_rate_for_each_week AS (
    SELECT
        YEARWEEK(deployment_finished_date) AS week,
        SUM(CASE WHEN incident_count > 0 THEN 1 ELSE 0 END) / COUNT(*) AS change_failure_rate
    FROM
        _deployments_with_incidents
    GROUP BY
        YEARWEEK(deployment_finished_date)
)

SELECT
    YEARWEEK(cw.week_date) AS data_key,
    COALESCE(cfr.change_failure_rate, 0) AS data_value
FROM
    calendar_weeks cw
    LEFT JOIN _change_failure_rate_for_each_week cfr ON YEARWEEK(cw.week_date) = cfr.week
WHERE
    cw.week_date BETWEEN FROM_UNIXTIME(?) AND FROM_UNIXTIME(?)
ORDER BY
    cw.week_date DESC;