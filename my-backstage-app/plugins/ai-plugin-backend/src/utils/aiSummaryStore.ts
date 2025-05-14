import { Knex } from 'knex';

export interface SummaryPerRepo {
  repoName: string;
  summary: string;
}

export class AISummaryStore {
  constructor(private readonly db: Knex) {}

  async getSummariesForToday(
    system: string,
    date: string,
  ): Promise<SummaryPerRepo[]> {
    const rows = await this.db('ai_summaries')
      .select('repo_name', 'summary')
      .where({ system, date });

    return rows.map(row => ({
      repoName: row.repo_name,
      summary: row.summary,
    }));
  }

  async getAllSummariesForDate(
    date: string,
  ): Promise<Record<string, SummaryPerRepo[]>> {
    const rows = await this.db('ai_summaries')
      .select('system', 'repo_name', 'summary')
      .where({ date });

    const result: Record<string, SummaryPerRepo[]> = {};
    for (const row of rows) {
      if (!result[row.system]) result[row.system] = [];
      result[row.system].push({
        repoName: row.repo_name,
        summary: row.summary,
      });
    }
    return result;
  }

  async saveSummaries(
    system: string,
    date: string,
    summaries: SummaryPerRepo[],
  ) {
    const rows = summaries.map(s => ({
      system,
      repo_name: s.repoName,
      summary: s.summary,
      date,
    }));

    await this.db.batchInsert('ai_summaries', rows);
  }
}
