import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { StudentsAPI } from "@/services/api";

const emptyForm = {
  student_id: "",
  full_name: "",
  class: "",
  email: "",
  avatar_url: "",
};

export default function StudentsPage() {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const data = await StudentsAPI.list();
      setStudents(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(t("students.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s) => {
    setEditingId(s.student_id);
    setForm({
      student_id: s.student_id || "",
      full_name: s.full_name || "",
      class: s.class || s.class_name || "",
      email: s.email || "",
      avatar_url: s.avatar_url || "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.student_id || !form.full_name) {
      toast.error(`${t("students.studentId")} ${t("students.required")}`);
      return;
    }
    try {
      const payload = { ...form };
      if (!payload.email) delete payload.email;
      if (!payload.avatar_url) delete payload.avatar_url;
      if (!payload.class) delete payload.class;

      if (editingId) {
        await StudentsAPI.update(editingId, payload);
        toast.success(t("students.updated_success"));
      } else {
        await StudentsAPI.create(payload);
        toast.success(t("students.created_success"));
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("common.error"));
    }
  };

  const remove = async (s) => {
    if (!confirm(`${t("students.deleteStudent")} ${s.student_id}?`)) return;
    try {
      await StudentsAPI.remove(s.student_id);
      toast.success(t("students.deleted_success"));
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("common.error"));
    }
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.student_id?.toLowerCase().includes(q) ||
      s.full_name?.toLowerCase().includes(q) ||
      (s.class || s.class_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold gradient-text">{t("students.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("students.subtitle")}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> {t("students.addStudent")}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-fuchsia-500" />
            {t("students.allStudents")}
            <Badge variant="secondary">{filtered.length}</Badge>
          </CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("students.search")}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("students.studentId")}</TableHead>
                <TableHead>{t("students.fullName")}</TableHead>
                <TableHead>{t("students.class")}</TableHead>
                <TableHead>{t("students.email")}</TableHead>
                <TableHead className="text-right">{t("students.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t("common.loading")}
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t("students.noStudents")}
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                filtered.map((s, i) => (
                  <motion.tr
                    key={s._id || s.id || s.student_id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/60"
                  >
                    <TableCell className="font-mono font-semibold">
                      {s.student_id}
                    </TableCell>
                    <TableCell>{s.full_name}</TableCell>
                    <TableCell>
                      {s.class || s.class_name ? (
                        <Badge variant="outline">{s.class || s.class_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {s.email || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(s)}
                          aria-label={t("students.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove(s)}
                          aria-label={t("students.delete")}
                          className="text-rose-500 hover:text-rose-600"
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? t("students.editStudent") : t("students.addStudent")}
            </DialogTitle>
            <DialogDescription>
              {t("students.subtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">{t("students.studentId")} *</label>
              <Input
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                placeholder="SV001"
                disabled={!!editingId}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">{t("students.class")}</label>
              <Input
                value={form.class}
                onChange={(e) => setForm({ ...form, class: e.target.value })}
                placeholder="CNTT-K15"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">{t("students.fullName")} *</label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Nguyễn Văn A"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">{t("students.email")}</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="a@uni.edu"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">{t("students.avatar")}</label>
              <Input
                value={form.avatar_url}
                onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">{t("common.cancel")}</Button>
            </DialogClose>
            <Button onClick={save}>{editingId ? t("common.save") : t("common.delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
