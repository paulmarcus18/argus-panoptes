import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Typography, Box } from '@mui/material';

type MetricChartProps = {
  title: string;
  data: { label: string; value: number }[];
};

export const MetricChart = ({ title, data }: MetricChartProps) => (
  <Box sx={{ padding: 2, backgroundColor: '#1e1e1e', borderRadius: 2 }}>
    <Typography variant="h6" color="secondary" sx={{ mb: 2 }}>
      {title}
    </Typography>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#00e5ff" />
      </BarChart>
    </ResponsiveContainer>
  </Box>
);
