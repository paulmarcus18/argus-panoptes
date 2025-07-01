import { Grid } from '@material-ui/core';
import { Header, Page, Content, HeaderLabel } from '@backstage/core-components';
import { DoraDashboard } from '../DoraDashboard';

/**
 * DashboardComponent is a Backstage page that serves as a container
 * for the DORA Metrics Dashboard. It sets up the overall page layout,
 * including the header and content area.
 */
export const DashboardComponent = () => (
  // The Page component is the root container for a Backstage page, providing a consistent theme.
  <Page themeId="tool">
    {/* The Header component displays the title, subtitle, and other metadata at the top of the page. */}
    <Header
      title="DORA Metrics Dashboard"
      subtitle="Monitor your DevOps performance metrics"
    >
      {/* HeaderLabels are used to display key-value pairs in the header. */}
      <HeaderLabel label="Owner" value="DevOps Team" />
      <HeaderLabel label="Lifecycle" value="Beta" />
    </Header>
    {/* The Content component is the main area where the page's content is rendered. */}
    <Content>
      {/* Grid container from Material-UI to structure the content. */}
      <Grid container spacing={3} direction="column">
        <Grid item>
          {/* The DoraDashboard component is rendered here as the primary content of the page. */}
          <DoraDashboard />
        </Grid>
      </Grid>
    </Content>
  </Page>
);
