import { Knex } from 'knex';
import { SummaryPerRepo } from 'plugins/ai-plugin/utils/types';

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
    const rows = summaries
      .filter(s => s.summary && s.summary.trim() !== '') // Skip empty or whitespace-only summaries
      .map(s => ({
        system,
        repo_name: s.repoName,
        summary: s.summary,
        date,
      }));

    if (rows.length === 0) {
      return;
    }

    try {
      await this.db('ai_summaries')
        .insert(rows)
        .onConflict(['system', 'repo_name', 'date'])
        .merge(); // Or .ignore() if preferred
    } catch (error) {
      console.error('Failed to insert summaries:', error);
      throw error;
    }
  }
}
