import type * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      theme="light"
      richColors
      className="toaster group"
      icons={{
        success: null,
        info: null,
        warning: null,
        error: null,
        loading: null,
      }}
      style={
        {
          "--normal-bg": "#f8f4ea",
          "--normal-text": "#263139",
          "--normal-border": "#c7c0b2",
          "--success-bg": "#e1eee5",
          "--success-text": "#3a685a",
          "--success-border": "#5c8a78",
          "--error-bg": "#f5e2da",
          "--error-text": "#7c382a",
          "--error-border": "#ad624e",
          "--warning-bg": "#f3ecdc",
          "--warning-text": "#625941",
          "--warning-border": "#b08e5f",
          "--info-bg": "#e5edf0",
          "--info-text": "#263d49",
          "--info-border": "#77909a",
          "--border-radius": "0",
          fontFamily: "var(--font-family)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          title: "whitespace-pre-line",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
