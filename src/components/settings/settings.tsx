import Dialog from "jt-design-system/es/dialog";
import Tabs from "jt-design-system/es/tabs";
import Icon from "@/components/icon";
import Preferences from "./preferences";
import Export from "./export";
import About from "./about";
import styles from "./settings.module.css";

type Props = {
  opened: boolean;
  close: () => void;
};

export default function Settings({ opened, close }: Props) {
  return (
    <Dialog
      className={styles.dialog}
      isOpened={opened}
      close={close}
      closeButtonVariant="transparent"
      closeOnBackdropClick={false}
    >
      <div className={styles.inner}>
        <div className={styles.title}>Settings</div>
        <div className={styles.content}>
          <Tabs
            className={styles.tabs}
            tabs={[
              {
                label: (
                  <>
                    <Icon code="tune" className={styles.tabIcon} />
                    Preferences
                  </>
                ),
                value: "preferences",
                content: <Preferences />,
              },
              {
                label: (
                  <>
                    <Icon code="download" className={styles.tabIcon} />
                    Export
                  </>
                ),
                value: "export",
                content: <Export />,
              },
              {
                label: (
                  <>
                    <Icon code="question" className={styles.tabIcon} />
                    About
                  </>
                ),
                value: "about",
                content: <About />,
              },
            ]}
            defaultValue="preferences"
          />
        </div>
      </div>
    </Dialog>
  );
}
