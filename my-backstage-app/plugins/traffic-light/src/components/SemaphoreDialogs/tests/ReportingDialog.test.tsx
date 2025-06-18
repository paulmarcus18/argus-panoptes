import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from '@material-ui/core/styles';
import { createTheme } from '@material-ui/core/styles';
import { TestApiRegistry } from '@backstage/test-utils';
import { techInsightsApiRef } from '@backstage/plugin-tech-insights';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { ApiProvider } from '@backstage/core-app-api';
import { ReportingSemaphoreDialog } from '../ReportingDialog';
import { ReportingUtils } from '../../../utils/reportingUtils';
import { determineSemaphoreColor } from '../../utils';
import { Entity } from '@backstage/catalog-model';

jest.mock('../../../utils/reportingUtils');
jest.mock('../../utils');
jest.mock('../BaseSemaphoreDialogs', () => ({
  BaseSemaphoreDialog: ({
    open,
    onClose,
    title,
    data,
    isLoading,
    renderMetrics,
  }: any) => (
    <div data-testid="base-semaphore-dialog">
      <div data-testid="dialog-title">{title}</div>
      <div data-testid="dialog-open">{open.toString()}</div>
      <div data-testid="dialog-loading">{isLoading.toString()}</div>
      <div data-testid="dialog-color">{data.color}</div>
      <div data-testid="dialog-summary">{data.summary}</div>
      {renderMetrics && (
        <div data-testid="rendered-metrics">{renderMetrics()}</div>
      )}
      <button data-testid="close-button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

const mockTechInsightsApi = { getFacts: jest.fn(), getChecks: jest.fn() };
const mockCatalogApi = { getEntityByRef: jest.fn() };
const mockReportingUtils = {
  getReportingPipelineFacts: jest.fn(),
  getReportingPipelineChecks: jest.fn(),
};

const MockedReportingUtils = ReportingUtils as jest.MockedClass<
  typeof ReportingUtils
>;
const mockedDetermineColor = determineSemaphoreColor as jest.MockedFunction<
  typeof determineSemaphoreColor
>;

const mockEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'test-service', namespace: 'default' },
  spec: { type: 'service' },
};

const theme = createTheme();
const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const apis = TestApiRegistry.from(
    [techInsightsApiRef, mockTechInsightsApi],
    [catalogApiRef, mockCatalogApi],
  );
  return (
    <ApiProvider apis={apis}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ApiProvider>
  );
};

describe('ReportingSemaphoreDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockedReportingUtils.mockImplementation(() => mockReportingUtils as any);
    mockReportingUtils.getReportingPipelineFacts.mockResolvedValue({
      successfulRuns: 5,
      failedRuns: 5,
    });
    mockReportingUtils.getReportingPipelineChecks.mockResolvedValue({
      successRateCheck: false,
    });
    mockedDetermineColor.mockReturnValue({
      color: 'red',
      reason: 'Too many failures',
    });
  });

  it('renders closed dialog correctly', () => {
    render(
      <Wrapper>
        <ReportingSemaphoreDialog open={false} onClose={jest.fn()} />
      </Wrapper>,
    );
    expect(screen.getByTestId('dialog-open')).toHaveTextContent('false');
    expect(screen.getByTestId('dialog-title')).toHaveTextContent(
      'Reporting Pipeline Insights',
    );
  });

  it('loads and displays metrics', async () => {
    const onClose = jest.fn();
    await act(async () => {
      render(
        <Wrapper>
          <ReportingSemaphoreDialog
            open={true}
            onClose={onClose}
            entities={[mockEntity]}
          />
        </Wrapper>,
      );
    });

    await waitFor(() => {
      expect(mockReportingUtils.getReportingPipelineFacts).toHaveBeenCalled();
      expect(mockReportingUtils.getReportingPipelineChecks).toHaveBeenCalled();
    });

    expect(screen.getByTestId('dialog-color')).toHaveTextContent('red');
    expect(screen.getByTestId('dialog-summary')).toHaveTextContent(
      'Too many failures',
    );
    expect(screen.getByTestId('dialog-loading')).toHaveTextContent('false');
  });

  it('handles API error gracefully', async () => {
    mockReportingUtils.getReportingPipelineFacts.mockRejectedValue(
      new Error('API error'),
    );

    await act(async () => {
      render(
        <Wrapper>
          <ReportingSemaphoreDialog
            open={true}
            onClose={jest.fn()}
            entities={[mockEntity]}
          />
        </Wrapper>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('dialog-summary')).toHaveTextContent(
        'Failed to load metrics.',
      );
    });
  });

  it('does not fetch if dialog is closed', () => {
    render(
      <Wrapper>
        <ReportingSemaphoreDialog
          open={false}
          onClose={jest.fn()}
          entities={[mockEntity]}
        />
      </Wrapper>,
    );
    expect(mockReportingUtils.getReportingPipelineFacts).not.toHaveBeenCalled();
  });

  it('invokes onClose when close button is clicked', async () => {
    const onClose = jest.fn();

    await act(async () => {
      render(
        <Wrapper>
          <ReportingSemaphoreDialog
            open={true}
            onClose={onClose}
            entities={[mockEntity]}
          />
        </Wrapper>,
      );
    });

    screen.getByTestId('close-button').click();
    expect(onClose).toHaveBeenCalled();
  });
});
