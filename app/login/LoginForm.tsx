"use client"
import { createClient } from "@/lib/client"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import styles from "./LoginForm.module.css"

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
    <div className={styles.page}>
      {/* ── Left: login form ── */}
      <div className={styles.leftPanel}>
        <div className={styles.formWrap}>
          <div className={styles.cardTop}>
            <div className={styles.cardLabel}>LOG IN</div>
            <h2 className={styles.cardTitle}>Access your account</h2>
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
              <i className="ti ti-brand-gmail" />
              {loading ? "Redirecting…" : "Log in with UP Mail"}
            </button>
          </form>

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
        <div className={styles.brandInner}>
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
            Welcome to
            <br />
            <em>NSTP</em>
          </h1>
          <p className={styles.brandSub}>National Service Training Program</p>
          <div className={styles.brandDivider} />
          <p className={styles.brandCaption}>
            Coordinating student service hours, facilitator forms, and community
            outreach — all in one place.
          </p>
        </div>
      </div>
    </div>
  )
}
