import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';

const VEHICLE_COLORS = {
  car:        '#ef4444',
  electric:   '#06b6d4',
  bus:        '#f59e0b',
  motorcycle: '#f97316',
  bike:       '#22c55e',
  walk:       '#84cc16',
};
const ROLE_COLORS = ['#64748b', '#22c55e'];

const tooltipStyle = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 8,
  fontSize: 12,
};

export const Co2OverTime = ({ data }) => (
  <ChartCard title="CO₂ saved over time" subtitle="kg per day">
    {data.length === 0 ? <Empty /> : (
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
          <YAxis stroke="#64748b" fontSize={10} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="co2SavedKg" stroke="#22c55e" strokeWidth={2} name="CO₂ kg" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    )}
  </ChartCard>
);

export const RidesOverTime = ({ data }) => (
  <ChartCard title="Rides over time" subtitle="trips per day">
    {data.length === 0 ? <Empty /> : (
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
          <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="rides" stroke="#3b82f6" strokeWidth={2} name="Rides" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    )}
  </ChartCard>
);

export const TimeSavedBar = ({ data }) => (
  <ChartCard title="Time saved per month" subtitle="hours">
    {data.length === 0 ? <Empty /> : (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
          <YAxis stroke="#64748b" fontSize={10} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="timeSavedHours" fill="#a855f7" name="Hours saved" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )}
  </ChartCard>
);

export const CostSavedBar = ({ data }) => (
  <ChartCard title="Cost saved per month" subtitle="₹ INR">
    {data.length === 0 ? <Empty /> : (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
          <YAxis stroke="#64748b" fontSize={10} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => `₹${v}`} />
          <Bar dataKey="costSavedInr" fill="#f59e0b" name="₹ saved" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )}
  </ChartCard>
);

export const VehicleDistributionPie = ({ data }) => (
  <ChartCard title="Vehicles used" subtitle="trip count by mode">
    {data.length === 0 ? <Empty /> : (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="vehicleType"
               cx="50%" cy="50%" innerRadius={48} outerRadius={75}
               paddingAngle={2}>
            {data.map((d, i) => (
              <Cell key={i} fill={VEHICLE_COLORS[d.vehicleType] || '#64748b'} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    )}
  </ChartCard>
);

export const RoleSplitPie = ({ data }) => (
  <ChartCard title="Solo vs carpool" subtitle="ride mix">
    {data.every((d) => d.value === 0) ? <Empty /> : (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name"
               cx="50%" cy="50%" innerRadius={48} outerRadius={75}
               paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={ROLE_COLORS[i]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    )}
  </ChartCard>
);

const ChartCard = ({ title, subtitle, children }) => (
  <div className="rounded-2xl p-4 border aumo-border aumo-bg-surface">
    <div className="flex items-baseline justify-between mb-2">
      <h3 className="text-sm font-semibold aumo-text-primary">{title}</h3>
      {subtitle && <span className="text-xs aumo-text-subtle">{subtitle}</span>}
    </div>
    {children}
  </div>
);

const Empty = () => (
  <div className="text-center py-12 text-xs aumo-text-subtle">
    No data yet for this period.
  </div>
);
