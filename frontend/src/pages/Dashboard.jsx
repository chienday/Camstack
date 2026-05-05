import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, Calendar, CheckCheck, Activity } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import StatsCard from "@/components/StatsCard";
import { SessionsAPI, StudentsAPI } from "@/services/api";

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    total_students: 0,
    total_sessions: 0,
    sessions_today: 0,
    records_today: 0,
    weekly: [],
  });

  useEffect(() => {
    (async () => {
      try {
        const overview = await SessionsAPI.overview().catch(() => null);
        if (overview) {
          setStats({
            total_students: overview.total_students ?? 0,
            total_sessions: overview.total_sessions ?? 0,
            sessions_today: overview.sessions_today ?? 0,
            records_today: overview.records_today ?? 0,
            weekly: overview.weekly ?? [],
          });
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const chartData =
    stats.weekly?.length > 0
      ? stats.weekly.map((w) => ({ day: w.date?.slice(5) || w.date, attendance: w.count }))
      : [
          { day: "Mon", attendance: 12 },
          { day: "Tue", attendance: 18 },
          { day: "Wed", attendance: 15 },
          { day: "Thu", attendance: 22 },
          { day: "Fri", attendance: 19 },
          { day: "Sat", attendance: 8 },
          { day: "Sun", attendance: 0 },
        ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-text">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Users}
          label={t("dashboard.totalStudents")}
          value={stats.total_students}
          trend={t("dashboard.totalStudents")}
          gradient="from-indigo-500 to-blue-500"
          delay={0}
        />
        <StatsCard
          icon={Calendar}
          label={t("dashboard.totalSessions")}
          value={stats.sessions_today}
          trend={t("dashboard.recentSessions")}
          gradient="from-fuchsia-500 to-pink-500"
          delay={0.05}
        />
        <StatsCard
          icon={CheckCheck}
          label={t("dashboard.averageAttendance")}
          value={stats.records_today}
          trend={t("dashboard.recentSessions")}
          gradient="from-emerald-500 to-teal-500"
          delay={0.1}
        />
        <StatsCard
          icon={Activity}
          label={t("dashboard.recognitionRate")}
          value={stats.total_sessions}
          trend={t("dashboard.recentSessions")}
          gradient="from-amber-500 to-orange-500"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentSessions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" stroke="currentColor" fontSize={12} />
                  <YAxis stroke="currentColor" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(255,255,255,0.9)",
                      border: "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="attendance" fill="url(#barFill)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recognitionRate")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" stroke="currentColor" fontSize={12} />
                  <YAxis stroke="currentColor" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(255,255,255,0.9)",
                      border: "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#ec4899" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
