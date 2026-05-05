import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  Download,
  Eye,
  Filter,
  History as HistoryIcon,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SessionsAPI } from "@/services/api";
import { formatDateTime } from "@/lib/utils";

export default function HistoryPage() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [classFilter, setClassFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await SessionsAPI.list();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (
        classFilter &&
        !(s.class || "").toLowerCase().includes(classFilter.toLowerCase())
      )
        return false;
      if (dateFilter && s.start_time) {
        const d = new Date(s.start_time).toISOString().slice(0, 10);
        if (d !== dateFilter) return false;
      }
      return true;
    });
  }, [sessions, classFilter, dateFilter]);

  const openDetails = async (s) => {
    setSelected(s);
    setRecordsLoading(true);
    try {
      const data = await SessionsAPI.records(s._id || s.id);
      setRecords(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(t("common.error"));
    } finally {
      setRecordsLoading(false);
    }
  };

  const exportExcel = (s) => {
    const id = s._id || s.id;
    window.open(SessionsAPI.exportExcelUrl(id), "_blank");
  };

  const deleteSession = async (s) => {
    setDeleting(true);
    try {
      const id = s._id || s.id;
      await SessionsAPI.delete(id);
      setSessions(sessions.filter((x) => (x._id || x.id) !== id));
      setDeleteConfirm(null);
      toast.success(t("common.delete") + " thành công!");
    } catch (e) {
      console.error(e);
      toast.error(
        e?.response?.data?.detail || e?.message || t("common.error")
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">{t("history.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("history.subtitle")}
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Filter className="h-3 w-3" /> {t("students.class")}
            </label>
            <Input
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              placeholder="e.g., CNTT-K15"
              className="mt-1"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {t("history.date")}
            </label>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setClassFilter("");
              setDateFilter("");
            }}
          >
            {t("common.close")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-fuchsia-500" />
            {t("history.title")}
            <Badge variant="secondary">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("history.sessionId")}</TableHead>
                <TableHead>{t("students.class")}</TableHead>
                <TableHead>{t("history.date")} (Start)</TableHead>
                <TableHead>{t("history.date")} (End)</TableHead>
                <TableHead>{t("history.detections")}</TableHead>
                <TableHead className="text-right">{t("students.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t("common.loading")}
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t("history.noHistory")}
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                filtered.map((s, i) => (
                  <motion.tr
                    key={s._id || s.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/60"
                  >
                    <TableCell className="font-medium">
                      {s.session_name}
                    </TableCell>
                    <TableCell>
                      {s.class ? <Badge variant="outline">{s.class}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDateTime(s.start_time)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.end_time ? (
                        formatDateTime(s.end_time)
                      ) : (
                        <Badge variant="warning">{t("common.loading")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">
                        {s.attended_count || 0}
                        {s.total_students ? ` / ${s.total_students}` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openDetails(s)}
                          aria-label={t("students.edit")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => exportExcel(s)}
                          aria-label={t("common.noData")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteConfirm(s)}
                          className="hover:text-red-500"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.session_name}</DialogTitle>
            <DialogDescription>
              {selected?.class ? `${t("students.class")}: ${selected.class} · ` : ""}
              {selected?.start_time ? formatDateTime(selected.start_time) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("history.sessionId")}</TableHead>
                  <TableHead>{t("students.fullName")}</TableHead>
                  <TableHead>{t("history.date")}</TableHead>
                  <TableHead>{t("common.noData")}</TableHead>
                  <TableHead>{t("students.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordsLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      {t("common.loading")}
                    </TableCell>
                  </TableRow>
                )}
                {!recordsLoading && records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      {t("common.noData")}
                    </TableCell>
                  </TableRow>
                )}
                {!recordsLoading &&
                  records.map((r) => (
                    <TableRow key={r._id || r.id}>
                      <TableCell className="font-mono">{r.student_id}</TableCell>
                      <TableCell>{r.student_name}</TableCell>
                      <TableCell className="text-xs">
                        {formatDateTime(r.check_in_time)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.confidence >= 0.85 ? "success" : "warning"}
                        >
                          {(r.confidence * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.method}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => selected && exportExcel(selected)}>
              <Download className="h-4 w-4" /> {t("common.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa lịch sử điểm danh?</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa buổi <strong>{deleteConfirm?.session_name}</strong>? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-6">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteSession(deleteConfirm)}
              disabled={deleting}
            >
              {deleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

