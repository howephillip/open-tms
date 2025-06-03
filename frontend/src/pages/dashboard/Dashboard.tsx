// File: frontend/src/pages/dashboard/Dashboard.tsx
import React from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Paper, CircularProgress, Alert
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LabelList
} from 'recharts';
import { useQuery } from 'react-query';
import { dashboardAPI } from '../../services/api'; // Import your new API service

// Define interfaces for the data shapes expected from the backend
interface KPI {
  totalShipments: number;
  totalRevenue: number;
  grossProfit: number;
  averageMargin: number;
  totalCarriers?: number; // Optional for now
  totalShippers?: number; // Optional for now
}
interface TrendDataPoint { month: string; revenue: number; profit: number; }
interface StatusDistributionPoint { name: string; value: number; }


const PIE_CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF4560'];


const Dashboard: React.FC = () => {
  const { data: kpiResponse, isLoading: isLoadingKPIs, isError: isErrorKPIs, error: errorKPIs } = 
    useQuery('dashboardKPIs', dashboardAPI.getKPIs);
  const kpis: KPI | null = kpiResponse?.data?.data || null;

  const { data: trendsResponse, isLoading: isLoadingTrends, isError: isErrorTrends, error: errorTrends } =
    useQuery('dashboardRevenueProfitTrends', dashboardAPI.getRevenueProfitTrends);
  const revenueProfitData: TrendDataPoint[] = trendsResponse?.data?.data?.trends || [];

  const { data: statusDistResponse, isLoading: isLoadingStatusDist, isError: isErrorStatusDist, error: errorStatusDist } =
    useQuery('dashboardShipmentStatusDistribution', dashboardAPI.getShipmentStatusDistribution);
  const shipmentStatusData: StatusDistributionPoint[] = statusDistResponse?.data?.data?.distribution || [];

  // Example for top lanes, can be a separate query
  // const { data: topLanesResponse, isLoading: isLoadingTopLanes } = useQuery('dashboardTopLanes', dashboardAPI.getTopLanes);
  // const topLanes = topLanesResponse?.data?.data?.topLanes || [
  //   { lane: 'LA to NY', shipments: 24, revenue: 48000 }, // Mock data as fallback
  //   // ...
  // ];
  // For now, using static mock data for top lanes as backend endpoint not created yet
  const topLanesMock = [
    { lane: 'LA to NY', shipments: 24, revenue: 48000, profit: 6000 },
    { lane: 'Chicago to Miami', shipments: 18, revenue: 36000, profit: 5500 },
    { lane: 'Dallas to Seattle', shipments: 15, revenue: 30000, profit: 4000 },
    { lane: 'Atlanta to Denver', shipments: 12, revenue: 24000, profit: 3500 },
  ];


  if (isLoadingKPIs || isLoadingTrends || isLoadingStatusDist) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }

  // You might want to handle errors more gracefully or for each section individually
  if (isErrorKPIs || isErrorTrends || isErrorStatusDist) {
    return (
      <Box>
        {isErrorKPIs && <Alert severity="error">Error fetching KPIs: {(errorKPIs as any)?.message}</Alert>}
        {isErrorTrends && <Alert severity="error">Error fetching Revenue Trends: {(errorTrends as any)?.message}</Alert>}
        {isErrorStatusDist && <Alert severity="error">Error fetching Status Distribution: {(errorStatusDist as any)?.message}</Alert>}
      </Box>
    );
  }


  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard Overview</Typography>
      
      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Shipments</Typography>
              <Typography variant="h4">{kpis?.totalShipments?.toLocaleString() || 'N/A'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Revenue</Typography>
              <Typography variant="h4">${kpis?.totalRevenue?.toLocaleString() || 'N/A'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Gross Profit</Typography>
              <Typography variant="h4">${kpis?.grossProfit?.toLocaleString() || 'N/A'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Average Margin</Typography>
              <Typography variant="h4">{kpis?.averageMargin?.toFixed(1) || 'N/A'}%</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 350 }}>
            <Typography variant="h6" gutterBottom>Revenue & Profit Trends (Last 6 Months)</Typography>
            {revenueProfitData.length > 0 ? (
                <ResponsiveContainer width="100%" height="90%">
                <BarChart data={revenueProfitData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                    <Bar dataKey="profit" fill="#82ca9d" name="Profit" />
                </BarChart>
                </ResponsiveContainer>
            ) : (<Typography>No trend data available.</Typography>)}
          </Paper>
        </Grid>

        {/* Shipment Status */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 350 }}>
            <Typography variant="h6" gutterBottom>Shipment Status Distribution</Typography>
            {shipmentStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                    <Pie
                    data={shipmentStatusData}
                    cx="50%" cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name" // Important for tooltip
                    labelLine={false}
                    >
                    {shipmentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                    ))}
                    <LabelList dataKey="name" position="outside" offset={10} formatter={(name: string) => name.replace(/_/g, ' ').replace(/-/g,' ')} style={{textTransform: 'capitalize', fontSize: '0.8rem'}} />
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [`${value} shipments`, name.replace(/_/g, ' ').replace(/-/g,' ')]} />
                    <Legend formatter={(value) => value.replace(/_/g, ' ').replace(/-/g,' ')} wrapperStyle={{textTransform: 'capitalize'}}/>
                </PieChart>
                </ResponsiveContainer>
            ) : (<Typography>No status data available.</Typography>)}
          </Paper>
        </Grid>

        {/* Top Lanes (Using Mock Data for now) */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Top Performing Lanes (Sample)</Typography>
            <Grid container spacing={2}>
              {topLanesMock.map((lane, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" component="div">{lane.lane}</Typography>
                      <Typography color="textSecondary" sx={{fontSize: '0.8rem'}}>{lane.shipments} shipments</Typography>
                      <Typography variant="h6" color="primary">${lane.revenue.toLocaleString()}</Typography>
                      <Typography variant="body2" color="green" sx={{fontSize: '0.9rem'}}>Profit: ${lane.profit.toLocaleString()}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;