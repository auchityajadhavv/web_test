import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import { DEMO_EVENT } from "../lib/openDemo";
import "./DemoModal.css";
import { useDialog } from "../hooks/useDialog";
import Turnstile from "./Turnstile";

// cheap env check so the marketing bundle never statically pulls in supabase-js
const backendConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  import.meta.env.VITE_TURNSTILE_SITE_KEY,
);

type Errors = Partial<Record<"name" | "venue" | "email" | "message", string>>;
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function DemoModal() {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<string | undefined>();
  const [form, setForm] = useState({
    name: "",
    venue: "",
    email: "",
    message: "",
    website: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const firstField = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDialog(dialogRef, open, close);
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const requestKey = useRef("");
  const submitted = useRef(false);
  const generation = useRef(0);
  const inFlight = useRef(false);

  // open on the shared event
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { plan?: string } | undefined;
      generation.current += 1;
      inFlight.current = false;
      setPlan(detail?.plan);
      setForm({ name: "", venue: "", email: "", message: "", website: "" });
      setErrors({});
      setStatus("idle");
      setSubmitError("");
      setToken("");
      requestKey.current = crypto.randomUUID();
      submitted.current = false;
      setOpen(true);
    };
    window.addEventListener(DEMO_EVENT, onOpen);
    return () => window.removeEventListener(DEMO_EVENT, onOpen);
  }, []);

  const validate = (): boolean => {
    const next: Errors = {};
    if (!form.name.trim()) next.name = "Tell us who to reach.";
    if (!form.venue.trim()) next.venue = "Which venue is this for?";
    if (!form.email.trim()) next.email = "We need an email to reply to.";
    else if (!emailOk(form.email))
      next.email = "That email doesn’t look right.";
    if (!form.message.trim())
      next.message = "Tell us what you would like help with.";
    setErrors(next);
    if (Object.keys(next).length)
      requestAnimationFrame(() =>
        dialogRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
    return Object.keys(next).length === 0;
  };

  const [submitError, setSubmitError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    const current = generation.current;
    setSubmitError("");
    if (!validate()) return;
    inFlight.current = true;
    setStatus("submitting");
    try {
      if (!backendConfigured)
        throw new Error(
          "Demo requests are not available yet. Please try again later.",
        );
      if (!token) throw new Error("Please complete verification first.");
      submitted.current = true;
      const { supabase } = await import("../lib/supabase");
      if (!supabase)
        throw new Error("Demo requests are temporarily unavailable.");
      const { data, error } = await supabase.functions.invoke("request-demo", {
        body: {
          ...form,
          plan: plan || "",
          requestKey: requestKey.current,
          token,
        },
      });
      if (current !== generation.current) return;
      if (error || data?.ok !== true)
        throw new Error(
          data?.error ||
            "We could not confirm your request. Please retry; your details are still here.",
        );
      setStatus("done");
    } catch (err) {
      if (current !== generation.current) return;
      setStatus("idle");
      setSubmitError(
        (err as Error).message || "Could not send. Please try again.",
      );
      setToken("");
      setAttempt((value) => value + 1);
    } finally {
      if (current === generation.current) inFlight.current = false;
    }
  };

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (submitted.current) {
        requestKey.current = crypto.randomUUID();
        submitted.current = false;
      }
      setForm((f) => ({ ...f, [k]: e.target.value }));
      if (errors[k as keyof Errors])
        setErrors((prev) => ({ ...prev, [k]: undefined }));
    };

  const contactLink = `mailto:revora.org.com@gmail.com?subject=${encodeURIComponent("REVORA demo request")}&body=${encodeURIComponent(`Name: ${form.name}\nVenue: ${form.venue}\nEmail: ${form.email}\nPlan: ${plan || "Not selected"}\n\nWhat I need:\n${form.message}`)}`;

  if (!open) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="dm__overlay"
      aria-label="Book a demo"
      onClick={close}
    >
      <div className="dm__card" onClick={(e) => e.stopPropagation()}>
        <button
          ref={closeRef}
          className="dm__close"
          aria-label="Close"
          onClick={() => setOpen(false)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {status === "done" ? (
          <div className="dm__done">
            <span className="dm__check" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path
                  d="M6 13.5 11 18l9-10"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h3 className="dm__doneTitle">
              Thanks, {form.name.split(" ")[0] || "there"}.
            </h3>
            <p className="dm__doneBody">
              Your demo request is in. We’ll contact you about a Revora demo
              {plan ? ` on the ${plan} plan` : ""}. Keep an eye on {form.email}.
            </p>
            <button
              className="btn btn-primary dm__doneBtn"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <span className="eyebrow dm__eyebrow">Book a demo</span>
            <h3 className="dm__title">Let’s find the right setup for you.</h3>
            <p className="dm__sub">
              Tell us where it’s going and we’ll take it from there. No cost, no
              commitment.
            </p>
            {plan && <span className="dm__plan mono">Plan · {plan}</span>}

            <form className="dm__form" onSubmit={submit} noValidate>
              <Field label="Your name" error={errors.name}>
                <input
                  ref={firstField}
                  maxLength={100}
                  value={form.name}
                  disabled={status === "submitting"}
                  onChange={set("name")}
                  autoComplete="name"
                  placeholder="Priya Sharma"
                />
              </Field>
              <Field label="Venue name" error={errors.venue}>
                <input
                  maxLength={160}
                  value={form.venue}
                  disabled={status === "submitting"}
                  onChange={set("venue")}
                  autoComplete="organization"
                  placeholder="Lumière Bistro"
                />
              </Field>
              <Field label="Email" error={errors.email}>
                <input
                  maxLength={254}
                  value={form.email}
                  disabled={status === "submitting"}
                  onChange={set("email")}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@venue.com"
                />
              </Field>
              <Field
                label="What would you like a demo for?"
                error={errors.message}
              >
                <textarea
                  maxLength={2000}
                  value={form.message}
                  disabled={status === "submitting"}
                  onChange={set("message")}
                  rows={2}
                  placeholder="Number of counters, timing, questions…"
                />
              </Field>

              <div className="dm__honeypot" aria-hidden="true">
                <label>
                  Website
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    disabled={status === "submitting"}
                    onChange={set("website")}
                  />
                </label>
              </div>
              {backendConfigured ? (
                <Turnstile onToken={setToken} attempt={attempt} />
              ) : (
                <p role="status">Demo requests will be available soon.</p>
              )}
              {submitError && (
                <p className="dm__error" role="alert">
                  {submitError}
                </p>
              )}
              <button
                className="btn btn-primary dm__submit"
                type="submit"
                disabled={
                  status === "submitting" || !backendConfigured || !token
                }
              >
                {status === "submitting" ? "Sending…" : "Request my demo"}
              </button>
              <a className="dm__fine" href={contactLink}>
                Email the team instead (opens your email app)
              </a>
              <p className="dm__fine mono">
                Your details and requirements will be emailed to our team to
                arrange your demo.
              </p>
            </form>
          </>
        )}
      </div>
    </dialog>,
    document.body,
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactElement;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <label className={`dm__field ${error ? "has-error" : ""}`} htmlFor={id}>
      <span className="dm__label">{label}</span>
      {cloneElement(
        children as ReactElement<{
          id: string;
          required: boolean;
          "aria-invalid": boolean;
          "aria-describedby"?: string;
        }>,
        {
          id,
          required: true,
          "aria-invalid": Boolean(error),
          "aria-describedby": error ? errorId : undefined,
        },
      )}
      {error && (
        <span id={errorId} className="dm__error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
