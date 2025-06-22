import { doraDashboardPlugin, DoraDashboardPage } from './plugin';

describe('dora-dashboard plugin', () => {
  it('should be defined', () => {
    expect(doraDashboardPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    expect(doraDashboardPlugin.getId()).toBe('dora-dashboard');
  });

  it('should provide a routable extension component', () => {
    expect(DoraDashboardPage).toBeDefined();
    expect(typeof DoraDashboardPage).toBe('function');
  });
});
