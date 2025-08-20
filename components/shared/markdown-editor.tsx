"use client";

import dynamic from "next/dynamic";
import { forwardRef, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
);

interface MarkdownEditorProps {
  value?: string;
  onChange?: (value?: string) => void;
  placeholder?: string;
  height?: number;
}

export const MarkdownEditor = forwardRef<HTMLDivElement, MarkdownEditorProps>(
  ({ value = "", onChange, placeholder, height = 300 }, ref) => {
    const { theme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted) {
      return (
        <div className="h-[300px] border rounded-md bg-muted animate-pulse" />
      );
    }

    const currentTheme = theme === "system" ? systemTheme : theme;
    const dataColorMode = currentTheme === "dark" ? "dark" : "light";

    return (
      <div ref={ref} data-color-mode={dataColorMode}>
        <MDEditor
          value={value}
          onChange={onChange}
          preview="live"
          height={height}
          textareaProps={{
            placeholder: placeholder || "Enter markdown content...",
          }}
        />
      </div>
    );
  }
);

MarkdownEditor.displayName = "MarkdownEditor";