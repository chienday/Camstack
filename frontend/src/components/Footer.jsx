import { Github, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/20 dark:border-white/5 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span>© {new Date().getFullYear()} Camstack · Made with</span>
          <Heart className="h-3.5 w-3.5 text-pink-500 fill-pink-500" />
          <span>for smart classrooms</span>
        </div>
        <div className="flex items-center gap-4">
          <span>v1.0.0</span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition"
          >
            <Github className="h-3.5 w-3.5" /> GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
