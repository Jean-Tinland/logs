"use client";

import * as React from "react";
import classNames from "classnames";
import Textarea from "jt-design-system/es/textarea";
import Button from "jt-design-system/es/button";
import * as API from "@/services/api";
import type { LogKind } from "@/types/log";
import styles from "./input-field.module.css";

type Props = {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onLogCreated: () => Promise<void>;
};

const INPUT_FOCUS_EVENT = "logs:input-focused";

export default function InputField({
  loading,
  setLoading,
  onLogCreated,
}: Props) {
  const [log, setLog] = React.useState("");
  const [kind, setKind] = React.useState<LogKind>("normal");

  const handleFocusCapture = React.useCallback(
    (event: React.FocusEvent<HTMLFormElement>) => {
      if (event.target instanceof HTMLTextAreaElement) {
        window.dispatchEvent(new Event(INPUT_FOCUS_EVENT));
      }
    },
    [],
  );

  React.useEffect(() => {
    scrollToPageBottom();
  }, []);

  const handleChange = (value: string) => {
    switch (true) {
      case value.startsWith("n: "):
        setKind("normal");
        setLog(value.slice(3));
        break;
      case value.startsWith("h: "):
        setKind("highlight");
        setLog(value.slice(3));
        break;
      case value.startsWith("w: "):
        setKind("warn");
        setLog(value.slice(3));
        break;
      case value.startsWith("d: "):
        setKind("danger");
        setLog(value.slice(3));
        break;
      default:
        setLog(value);
    }
  };

  const addLog = React.useCallback(
    async (kind: LogKind, content: string) => {
      setLoading(true);

      try {
        await API.createLog(kind, content);
        await onLogCreated();
      } finally {
        setLoading(false);
      }
    },
    [onLogCreated, setLoading],
  );

  const submit = React.useCallback(
    async (e?: React.FormEvent) => {
      if (loading || !log.trim()) {
        return;
      }

      e?.preventDefault();

      await addLog(kind, log);

      setLog("");
      setKind("normal");
      setTimeout(scrollToPageBottom, 180);
    },
    [addLog, kind, loading, log],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void submit();
    }
  };

  const classes = classNames(styles.field, {
    [styles[kind]]: kind,
  });

  return (
    <form
      className={styles.container}
      onSubmit={submit}
      onFocusCapture={handleFocusCapture}
    >
      <div className={styles.helper}>
        (n: normal, h: highlight, w: warn, d: danger) · submit: cmd/ctrl+enter ·
        nav: cmd/ctrl+up/down
      </div>
      <Textarea
        id="logs-input"
        data-log-input="true"
        className={classes}
        value={log}
        onValueChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <Button
        type="submit"
        className={styles.submit}
        disabled={loading || !log.trim()}
      >
        Add
      </Button>
    </form>
  );
}

function scrollToPageBottom() {
  window.scrollTo(0, document.body.scrollHeight + 1000);
}
