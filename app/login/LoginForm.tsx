"use client"
import { createClient } from "@/lib/client"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import styles from "./LoginForm.module.css"
import { upsertAppUser } from "@/lib/auth-actions"

type Role = "student" | "facilitator" | "admin" | null

interface FieldState {
  value: string
  touched: boolean
  valid: boolean
}

function detectRole(username: string): Role {
  const lower = username.toLowerCase()
  if (lower.startsWith("admin")) return "admin"
  if (lower.startsWith("fac") || lower.includes("@faculty"))
    return "facilitator"
  if (lower.match(/^\d{9}$/)) return "student"
  if (lower.includes("@up.edu.ph")) return "student"
  return null
}

const ROLE_META: Record<
  NonNullable<Role>,
  { label: string; icon: string; color: string }
> = {
  student: { label: "Student", icon: "ti-user", color: "#2D6A4F" },
  facilitator: { label: "Facilitator", icon: "ti-users", color: "#7B1113" },
  admin: { label: "Administrator", icon: "ti-settings", color: "#5C0B18" },
}

export default function LoginForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [username, setUsername] = useState<FieldState>({
    value: "",
    touched: false,
    valid: false,
  })
  const [password, setPassword] = useState<FieldState>({
    value: "",
    touched: false,
    valid: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detectedRole, setDetectedRole] = useState<Role>(null)

  // read google oauth errors
  useEffect(() => {
    const urlError = searchParams.get("error")
    if (urlError  === "Database error saving new user") {
      setError("Only UP mail (@up.edu.ph) accounts are allowed.");
    } else {
      setError(urlError)
    }
  }, [searchParams])

  const handleUsernameChange = (val: string) => {
    setDetectedRole(val.trim() ? detectRole(val) : null)
    setUsername({ value: val, touched: true, valid: val.trim().length >= 3 })
    setError(null)
  }

  const handlePasswordChange = (val: string) => {
    setPassword({ value: val, touched: true, valid: val.length >= 8 })
    setError(null)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account'
        }
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.valid || !password.valid) {
      setUsername((prev) => ({ ...prev, touched: true }))
      setPassword((prev) => ({ ...prev, touched: true }))
      return
    }
    setLoading(true)
    setError(null)

    try {
      const email = username.value.trim()

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password.value,
      })
      if (error) {
        setError("Incorrect email or password.")
        setLoading(false)
        return
      }

      // check domain
      if (!data.user?.email?.endsWith("@up.edu.ph")) {
        await supabase.auth.signOut()
        setError("Only UP email accounts are allowed.")
        setLoading(false)
        return
      }

      await upsertAppUser()

      if (detectedRole === "admin") router.push("/admin/dashboard")
      else if (detectedRole === "facilitator")
        router.push("/facilitator/dashboard")
      else router.push("/student/dashboard")
    } catch {
      setError("Unable to connect. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // const usernameError = username.touched && !username.valid
  // const passwordError = password.touched && !password.valid
  // const roleInfo = detectedRole ? ROLE_META[detectedRole] : null

  return (
    <div className={styles.page}>
      {/* ── Left: login form ── */}
      <div className={styles.leftPanel}>
        <div className={styles.formWrap}>
          <div className={styles.cardTop}>
            <div className={styles.cardLabel}>LOG IN</div>
            <h2 className={styles.cardTitle}>Access your account</h2>
          </div>

          {/* {roleInfo && (
            <div className={styles.roleBadge} style={{ color: roleInfo.color }}>
              <i className={`ti ${roleInfo.icon}`} />
              <span>
                Detected as <strong>{roleInfo.label}</strong>
              </span>
            </div>
          )} */}

          <form onSubmit={handleSubmit} noValidate className={styles.form}>
            {/* <div className={styles.field}>
              <label className={styles.label} htmlFor="username">
                Username or student number
              </label>
              <div
                className={[
                  styles.inputWrap,
                  usernameError ? styles.stateError : "",
                  username.touched && username.valid ? styles.stateValid : "",
                ].join(" ")}
              >
                <i className="ti ti-user-circle" />
                <input
                  id="username"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. 202312345 or username"
                  value={username.value}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                />
                {username.touched && username.valid && (
                  <i className={`ti ti-circle-check ${styles.validIcon}`} />
                )}
              </div>
              <span
                className={[
                  styles.hint,
                  usernameError ? styles.hintError : "",
                  username.touched && username.valid ? styles.hintValid : "",
                ].join(" ")}
              >
                {usernameError
                  ? "Must be at least 3 characters."
                  : username.touched && username.valid
                  ? "Verified"
                  : "UP student number, email, or system username."}
              </span>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                Password
              </label>
              <div
                className={[
                  styles.inputWrap,
                  passwordError ? styles.stateError : "",
                  password.touched && password.valid ? styles.stateValid : "",
                ].join(" ")}
              >
                <i className="ti ti-lock" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={styles.input}
                  placeholder="Minimum 8 characters"
                  value={password.value}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
                >
                  <i
                    className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`}
                  />
                </button>
              </div>
              <span
                className={[
                  styles.hint,
                  passwordError ? styles.hintError : "",
                  password.touched && password.valid ? styles.hintValid : "",
                ].join(" ")}
              >
                {passwordError
                  ? "Password must be at least 8 characters."
                  : password.touched && password.valid
                  ? "Verified"
                  : "Your CRS or system-assigned password."}
              </span>
            </div> */}

            {error && (
              <div className={styles.errorBanner} role="alert">
                <i className="ti ti-alert-circle" />
                <span>{error}</span>
              </div>
            )}

            {/* <div className={styles.forgotRow}>
              <a href="/forgot-password" className={styles.forgotLink}>
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} /> Signing in…
                </>
              ) : (
                <>
                  <i className="ti ti-login" /> Sign in
                </>
              )}
            </button> */}

            {/* <div className={styles.orDivider}>or</div> */}

            <button
              type="button"
              className={styles.gmailBtn}
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <i className="ti ti-brand-gmail" />
              Log-in with UP Mail
            </button>
          </form>

          <div className={styles.cardFooter}>
            <p>
              Unable to access account?{" "}
              <a href="mailto:nstp.upbaguio@up.edu.ph?subject=Access to UPB NSTP website&body=I am unable to access the NSTP website..." className={styles.footerLink}>
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
