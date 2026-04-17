import Image from "next/image";
import Button from "jt-design-system/es/button";
import Icon from "@/components/icon";
import styles from "./about.module.css";

const VERSION = process.env.APP_VERSION || "dev";

export default function About() {
  return (
    <div className={styles.container}>
      <Image
        className={styles.logo}
        src="/images/logo.svg"
        alt="Logs logo"
        width={48}
        height={48}
      />
      <div className={styles.title}>Logs</div>
      <div className={styles.version}>v{VERSION}</div>
      <div className={styles.links}>
        <Button
          tag="a"
          variant="link"
          href="https://github.com/Jean-Tinland/logs"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon code="github" className={styles.icon} />
          GitHub repository
        </Button>
        <Button
          tag="a"
          variant="link"
          href="https://github.com/Jean-Tinland/logs/blob/main/CHANGELOG.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          Changelog
        </Button>
      </div>
    </div>
  );
}
