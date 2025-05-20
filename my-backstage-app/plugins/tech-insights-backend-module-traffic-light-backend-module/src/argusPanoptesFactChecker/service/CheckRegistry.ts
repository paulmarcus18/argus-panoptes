import { ConflictError, NotFoundError } from '@backstage/errors';
import { TechInsightCheckRegistry } from '@backstage-community/plugin-tech-insights-node';
import { Check } from '@backstage-community/plugin-tech-insights-common';

export class DefaultCheckRegistry<CheckType extends Check>
  implements TechInsightCheckRegistry<CheckType>
{
  private readonly checks = new Map<string, CheckType>();

  constructor(checks: CheckType[]) {
    checks.forEach(check => {
      this.register(check);
    });
  }

  async register(check: CheckType): Promise<CheckType> {
    if (this.checks.has(check.id)) {
      throw new ConflictError(
        `Tech insight check with id ${check.id} has already been registered`,
      );
    }
    this.checks.set(check.id, check);
    return check;
  }

  async get(checkId: string): Promise<CheckType> {
    const check = this.checks.get(checkId);
    if (!check) {
      throw new NotFoundError(
        `Tech insight check with id '${checkId}' is not registered.`,
      );
    }
    return check;
  }
  async getAll(checks: string[]): Promise<CheckType[]> {
    return Promise.all(checks.map(checkId => this.get(checkId)));
  }

  async list(): Promise<CheckType[]> {
    return [...this.checks.values()];
  }
}
