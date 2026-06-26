import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtDayShort } from "../lib/format";

const BRAND = "#4f46e5";
const PALETTE = ["#4f46e5", "#22c55e", "#f59e0b", "#ec4899", "#0ea5e9", "#8b5cf6", "#14b8a6"];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #ebedf0",
  boxShadow: "0 8px 24px -6px rgba(16,24,40,0.12)",
  fontSize: 12,
};

export function AreaTrend({ data }: { data: { day: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.25} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          tickFormatter={fmtDayShort}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => fmtDayShort(String(l))} />
        <Area
          type="monotone"
          dataKey="count"
          stroke={BRAND}
          strokeWidth={2}
          fill="url(#trendFill)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarList({ data }: { data: { name: string; count: number }[] }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 42)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data }: { data: { name: string; count: number }[] }) {
  if (!data.length) return <Empty />;
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="50%" height={160}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            innerRadius={42}
            outerRadius={70}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-sm text-gray-600">
            <span
              className="dot"
              style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
            />
            <span className="flex-1 truncate">{d.name}</span>
            <span className="font-semibold text-gray-900">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty() {
  return (
    <div className="grid h-32 place-items-center text-sm text-gray-400">No data yet</div>
  );
}
