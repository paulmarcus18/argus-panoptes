import React from 'react';
import { render, screen } from '@testing-library/react';
import { ExampleComponent } from './ExampleComponent';

// Mock the dependent components to isolate the test
jest.mock('@backstage/core-components', () => ({
  InfoCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="info-card" data-title={title}>
      {children}
    </div>
  ),
  Header: ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
    <div data-testid="header" data-title={title} data-subtitle={subtitle}>
      {children}
    </div>
  ),
  HeaderLabel: ({ label, value }: { label: string; value: string }) => (
    <div data-testid="header-label" data-label={label} data-value={value} />
  ),
  Page: ({ themeId, children }: { themeId: string; children: React.ReactNode }) => (
    <div data-testid="page" data-theme-id={themeId}>
      {children}
    </div>
  ),
  Content: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="content">{children}</div>
  ),
  ContentHeader: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="content-header" data-title={title}>
      {children}
    </div>
  ),
  SupportButton: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="support-button">{children}</div>
  ),
}));

// Mock the ExampleFetchComponent
jest.mock('../ExampleFetchComponent', () => ({
  ExampleFetchComponent: () => <div data-testid="example-fetch-component" />,
}));

// Mock Material-UI components
jest.mock('@material-ui/core', () => ({
  Typography: ({ variant, children }: { variant: string; children: React.ReactNode }) => (
    <div data-testid="typography" data-variant={variant}>
      {children}
    </div>
  ),
  Grid: ({ 
    container, 
    item, 
    spacing, 
    direction, 
    children 
  }: { 
    container?: boolean; 
    item?: boolean;
    spacing?: number;
    direction?: string;
    children: React.ReactNode 
  }) => (
    <div 
      data-testid="grid" 
      data-container={container ? 'true' : 'false'} 
      data-item={item ? 'true' : 'false'}
      data-spacing={spacing}
      data-direction={direction}
    >
      {children}
    </div>
  ),
}));

describe('ExampleComponent', () => {
  it('should render the component structure correctly', () => {
    render(<ExampleComponent />);
    
    // Test the Page component
    const page = screen.getByTestId('page');
    expect(page).toHaveAttribute('data-theme-id', 'tool');
    
    // Test the Header component
    const header = screen.getByTestId('header');
    expect(header).toHaveAttribute('data-title', 'Welcome to ai-plugin!');
    expect(header).toHaveAttribute('data-subtitle', 'Optional subtitle');
    
    // Test HeaderLabels
    const headerLabels = screen.getAllByTestId('header-label');
    expect(headerLabels).toHaveLength(2);
    expect(headerLabels[0]).toHaveAttribute('data-label', 'Owner');
    expect(headerLabels[0]).toHaveAttribute('data-value', 'Team X');
    expect(headerLabels[1]).toHaveAttribute('data-label', 'Lifecycle');
    expect(headerLabels[1]).toHaveAttribute('data-value', 'Alpha');
    
    // Test ContentHeader
    const contentHeader = screen.getByTestId('content-header');
    expect(contentHeader).toHaveAttribute('data-title', 'Plugin title');
    
    // Test SupportButton
    const supportButton = screen.getByTestId('support-button');
    expect(supportButton).toHaveTextContent('A description of your plugin goes here.');
    
    // Test InfoCard
    const infoCard = screen.getByTestId('info-card');
    expect(infoCard).toHaveAttribute('data-title', 'Information card');
    
    // Test Typography
    const typography = screen.getByTestId('typography');
    expect(typography).toHaveAttribute('data-variant', 'body1');
    expect(typography).toHaveTextContent('All content should be wrapped in a card like this.');
    
    // Test that ExampleFetchComponent is rendered
    expect(screen.getByTestId('example-fetch-component')).toBeInTheDocument();
  });

  it('should render the grid structure correctly', () => {
    render(<ExampleComponent />);
    
    // Get all grid elements
    const grids = screen.getAllByTestId('grid');
    
    // Check the outer container Grid
    expect(grids[0]).toHaveAttribute('data-container', 'true');
    expect(grids[0]).toHaveAttribute('data-spacing', '3');
    expect(grids[0]).toHaveAttribute('data-direction', 'column');
    
    // Check there are two Grid items
    expect(grids[1]).toHaveAttribute('data-item', 'true');
    expect(grids[2]).toHaveAttribute('data-item', 'true');
  });

  it('matches snapshot', () => {
    const { container } = render(<ExampleComponent />);
    expect(container).toMatchSnapshot();
  });
});