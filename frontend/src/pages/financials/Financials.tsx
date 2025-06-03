import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Mock data - replace with API calls
const monthlyProfitData = [
  { month: 'Jan', revenue: 65000, cost: 50000, profit: 15000 },
  { month: 'Feb', revenue: 78000, cost: 60000, profit: 18000 },
  { month: 'Mar', revenue: 82000, cost: 62000, profit: 20000 },
  { month: 'Apr', revenue: 95000, cost: 70000, profit: 25000 },
  { month: 'May', revenue: 88000, cost: 65000, profit: 23000 },
  { month: 'Jun', revenue: 102000, cost: 75000, profit: 27000 },
];

const profitByLaneData = [
  { lane: 'LAX-JFK', profit: 120000, margin: 0.15 },
  { lane: 'ORD-MIA', profit: 95000, margin: 0.18 },
  { lane: 'DFW-SEA', profit: 80000, margin: 0.12 },
  { lane: 'ATL-DEN', profit: 70000, margin: 0.20 },
];

const Financials: React.FC = () => {
  const [timePeriod, setTimePeriod] = React.useState('last6months');
  // const [reportType, setReportType] = React.useState('profitability');

  const handleTimePeriodChange = (event: SelectChangeEvent) => {
    setTimePeriod(event.target.value as string);
    // TODO: Fetch data based on new time period
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Financial Overview
      </Typography>

      <FormControl sx={{ mb: 3, minWidth: 200 }}>
        <InputLabel id="time-period-select-label">Time Period</InputLabel>
        <Select
          labelId="time-period-select-label"
          id="time-period-select"
          value={timePeriod}
          label="Time Period"
          onChange={handleTimePeriodChange}
        >
          <MenuItem value="last30days">Last 30 Days</MenuItem>
          <MenuItem value="last3months">Last 3 Months</MenuItem>
          <MenuItem value="last6months">Last 6 Months</MenuItem>
          <MenuItem value="ytd">Year to Date</MenuItem>
        </Select>
      </FormControl>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Monthly Revenue & Profit
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={monthlyProfitData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                <Bar dataKey="profit" fill="#82ca9d" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
           <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Top Profitable Lanes (by Profit)
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={profitByLaneData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis dataKey="lane" type="category" width={80} />
                <Tooltip formatter={(value: number, name: string) => name === 'margin' ? `${(value * 100).toFixed(1)}%` : `$${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="profit" fill="#ffc658" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Add more financial widgets/reports here */}
        {/* e.g., Accounts Receivable, Accounts Payable, Cash Flow Summary */}

      </Grid>
    </Box>
  );
};

export default Financials;