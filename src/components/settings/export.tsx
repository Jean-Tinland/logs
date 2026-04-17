import Button from "jt-design-system/es/button";
import Icon from "@/components/icon";
import styles from "./export.module.css";

const EXPORT_HREF = "/api/logs/export";

export default function Export() {
  return (
    <div className={styles.container}>
      <div className={styles.title}>Export logs</div>
      <div className={styles.description}>
        Download all stored logs as a JSON export from the API endpoint.
      </div>
      <Button
        tag="a"
        href={EXPORT_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.button}
      >
        <Icon code="download" className={styles.icon} />
        Download JSON export
      </Button>
    </div>
  );
}
