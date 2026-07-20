"use client"
import { Montserrat } from "next/font/google"
import { createClient } from "@/lib/client"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import styles from "./LoginForm.module.css"
import { signInWithDevPassword } from "@/lib/auth/dev-login"

const montserrat = Montserrat({ weight: ["400","500","600","700","800"], subsets: ["latin"], display: "swap" })

const DEV_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === "true"

export default function LoginForm() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const urlError = searchParams.get("error")
    if (urlError) {
      setError(urlError)
      window.history.replaceState({}, "", "/")
    }
    if (window.location.hash) {
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [searchParams])

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className={`${styles.page} ${montserrat.className}`}>
      {/* ── Left: login form ── */}
      <div className={`${styles.leftPanel}`}>
        <div className={styles.formWrap}>
          <div className={styles.cardTop}>
            <div className={styles.cardLabel}>LOG IN</div>
            <h2 className={`${styles.cardTitle} hidden md:block`}>Access your account</h2>
          </div>

          <form noValidate className={styles.form}>
            {error && (
              <div className={styles.errorBanner} role="alert">
                <i className="ti ti-alert-circle" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              className={styles.gmailBtn}
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              {/* <FcGoogle size={20} /> */}
              {loading ? "Redirecting…" : "Log In with UP Mail"}
            </button>
          </form>

          {DEV_ENABLED && (
            <div style={{ marginTop: 24 }}>
              <div className={styles.orDivider} style={{ marginBottom: 16, fontSize: 12, letterSpacing: 2, color: "#BBBBBB" }}>
                DEV ONLY
              </div>
              <form action={signInWithDevPassword} className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="dev-email">Email</label>
                  <div className={styles.inputWrap}>
                    <i className="ti ti-mail" />
                    <input id="dev-email" name="email" type="email" className={styles.input} placeholder="role.test@up.edu.ph" />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="dev-password">Password</label>
                  <div className={styles.inputWrap}>
                    <i className="ti ti-lock" />
                    <input id="dev-password" name="password" type="password" className={styles.input} placeholder="Dev password" />
                  </div>
                </div>
                <button type="submit" className={styles.submitBtn}>
                  <i className="ti ti-login" />
                  Dev Sign In
                </button>
              </form>
            </div>
          )}

          <div className={styles.cardFooter}>
            <p>
              Unable to access account?{" "}
              <a
                href="mailto:nstp.upbaguio@up.edu.ph?subject=Access to UPB NSTP website&body=I am unable to access the NSTP website..."
                className={styles.footerLink}
              >
                Contact the NSTP Office
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* ── Right: brand panel ── */}
      <div className={styles.rightPanel}>
        <div className={`${styles.brandInner} rounded-none md:rounded-[5%] w-full md:w-auto lg:w-[94%]`}>

          <div className={styles.logoWrap}>
            <Image
              src="/nstp-logo.jpg"
              alt="NSTP UP Baguio Logo"
              width={200}
              height={200}
              className={styles.logo}
              priority
            />
          </div>
          <h1 className={styles.brandTitle}>
            Welcome to NSTP

            <br />
          </h1>
          <p className={styles.brandSub}>National Service Training Program</p>
          {/* <div className={`${styles.brandDivider} hidden md:block`} /> */}
          <p className={`${styles.brandCaption} hidden md:block`}>
            Develop civic consciousness and defense preparedness in UPB students through: 
            Civic Welfare Training Service, Literacy Traning Service, and Reserved Officers' Traning Corps
          </p>
        </div>
      </div>
    </div>
  )
}