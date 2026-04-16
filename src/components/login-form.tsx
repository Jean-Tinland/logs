"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import Input from "jt-design-system/es/input";
import Button from "jt-design-system/es/button";
import { useSnackbar } from "jt-design-system/es/snackbar";
import { useAppContext } from "@/components/app-context";
import * as API from "@/services/api";
import * as Cookies from "@/services/cookies";
import styles from "./login-form.module.css";

const TOKEN_COOKIE_DAYS = 90;

export default function LoginForm() {
  const router = useRouter();
  const { setLoading } = useAppContext();
  const snackbar = useSnackbar();

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);
    const password = formData.get("password")?.toString() || "";

    try {
      setLoading(true);
      const { token } = await API.login(password);
      Cookies.set("token", token, TOKEN_COOKIE_DAYS);
      snackbar.show({ type: "success", message: "Logged in successfully" });
      router.push("/");
    } catch {
      snackbar.show({ type: "error", message: "Login error", filler: false });
      Cookies.remove("token");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submitForm}>
      <div className={styles.header}>
        <Image src="/images/logo.svg" width={40} height={40} alt="Logs logo" />
        <h1 className={styles.title}>Logs</h1>
      </div>
      <div className={styles.fields}>
        <Input name="password" type="password" label="Password" compact />
      </div>
      <div className={styles.footer}>
        <Button type="submit" className={styles.button}>
          Login
        </Button>
      </div>
    </form>
  );
}
