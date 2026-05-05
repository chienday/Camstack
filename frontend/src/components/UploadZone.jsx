import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { UploadCloud, File as FileIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "video/mp4": [".mp4"],
  "video/x-msvideo": [".avi"],
  "video/quicktime": [".mov"],
};

export default function UploadZone({ onFileSelected, onSubmit, loading, progress = 0 }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const onDrop = useCallback(
    (accepted) => {
      const f = accepted?.[0];
      if (!f) return;
      setFile(f);
      const url = URL.createObjectURL(f);
      setPreview({ url, type: f.type });
      onFileSelected?.(f);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    multiple: false,
    disabled: loading,
  });

  const clear = () => {
    setFile(null);
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    onFileSelected?.(null);
  };

  const isVideo = file?.type?.startsWith("video/");

  return (
    <div className="space-y-4">
      {!file && (
        <div
          {...getRootProps()}
          className={cn(
            "relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all",
            "glass hover:border-fuchsia-400",
            isDragActive ? "border-fuchsia-500 bg-fuchsia-500/10 scale-[1.01]" : "border-border"
          )}
        >
          <input {...getInputProps()} />
          <motion.div
            animate={{ y: isDragActive ? -4 : 0 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 grid place-items-center shadow-xl shadow-fuchsia-500/30">
              <UploadCloud className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-base font-semibold">
                {isDragActive ? t("upload.dragFiles") : t("upload.dragFiles")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("upload.supportedFormats")}
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {file && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center shrink-0">
                <FileIcon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={clear}
              disabled={loading}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {preview && (
            <div className="rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 max-h-80 grid place-items-center">
              {isVideo ? (
                <video
                  src={preview.url}
                  controls
                  className="w-full max-h-80 object-contain"
                />
              ) : (
                <img
                  src={preview.url}
                  alt="preview"
                  className="w-full max-h-80 object-contain"
                />
              )}
            </div>
          )}

          {loading && (
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-white/50 dark:bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-pink-500"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {t("upload.processing")} {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={() => onSubmit?.(file)}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t("upload.processing")}
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" /> {t("upload.uploading")}
              </>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
