import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import UploadZone from "@/components/UploadZone";
import ResultDisplay from "@/components/ResultDisplay";
import { DetectionAPI } from "@/services/api";

export default function UploadPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [mediaType, setMediaType] = useState("image");

  const handleSubmit = async (f) => {
    if (!f) return;
    const isVideo = f.type.startsWith("video/");
    setMediaType(isVideo ? "video" : "image");
    setLoading(true);
    setProgress(0);
    setResult(null);

    try {
      const onProgress = (evt) => {
        if (evt.total) {
          const pct = Math.round((evt.loaded * 100) / evt.total);
          // cap upload progress to 70%; processing fills the rest virtually
          setProgress(Math.min(70, pct));
        }
      };

      const data = isVideo
        ? await DetectionAPI.video(f, onProgress)
        : await DetectionAPI.image(f, onProgress);

      setProgress(100);
      setResult(data);
      toast.success(
        `${t("upload.uploadSuccess")} - ${data?.detections?.length ?? 0} ${t("common.noData")}`
      );
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.detail ||
          err?.message ||
          t("upload.uploadFailed")
      );
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">{t("upload.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("upload.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <UploadZone
            onFileSelected={setFile}
            onSubmit={handleSubmit}
            loading={loading}
            progress={progress}
          />
        </div>
        <div>
          <ResultDisplay result={result} loading={loading} mediaType={mediaType} />
        </div>
      </div>
    </div>
  );
}
