WITH RECURSIVE calendar_weeks AS (
    SELECT
        DATE_FORMAT(FROM_UNIXTIME(?), '%Y-%m-%d') AS week_date
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
        YEARWEEK(deployment_finished_date) AS week,
        COUNT(cicd_deployment_id) AS deployment_count
    FROM
        (
            SELECT
                cdc.cicd_deployment_id,
                MAX(cdc.finished_date) AS deployment_finished_date
            FROM
                cicd_deployment_commits cdc
                JOIN repos ON cdc.repo_id = repos.id
            WHERE
                (
                    ? = ''
                    OR LOWER(repos.name) LIKE CONCAT('%/', LOWER(?))
                )
                AND cdc.result = 'SUCCESS'
                AND cdc.environment = 'PRODUCTION'
            GROUP BY
                cdc.cicd_deployment_id
        ) _production_deployments
    GROUP BY
        YEARWEEK(deployment_finished_date)
),
count AS (
    SELECT
        YEARWEEK(cw.week_date) AS data_key,
        COALESCE(d.deployment_count, 0) AS data_value
    FROM
        calendar_weeks cw
        LEFT JOIN _deployments d ON YEARWEEK(cw.week_date) = d.week
)
SELECT * FROM count
ORDER BY data_key DESC;