import { t } from "../i18n/index.js";
import {
  signUpUser,
  signInUser,
  signOutUser,
  fetchCurrentProfile,
  type UserProfile,
} from "../lib/auth-service.js";
import { getSupabase } from "../lib/supabase.js";

export function createAuthPanel(onAuthChanged?: () => void): HTMLElement {
  const container = document.createElement("section");
  container.className = "auth-panel";

  let mode: "signin" | "signup" = "signin";
  let currentUserProfile: UserProfile | null = null;
  let isSubmitting = false;

  const statusBanner = document.createElement("div");
  statusBanner.className = "auth-status-banner";
  statusBanner.setAttribute("aria-live", "polite");
  statusBanner.style.display = "none";

  function setStatus(message: string, isError = false): void {
    statusBanner.textContent = message;
    statusBanner.className = `auth-status-banner ${isError ? "is-error" : "is-success"}`;
    statusBanner.style.display = "block";
  }

  function clearStatus(): void {
    statusBanner.textContent = "";
    statusBanner.style.display = "none";
  }

  // Check initial session
  const supabase = getSupabase();
  if (supabase) {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchCurrentProfile(session.user.id).then((profile) => {
          currentUserProfile = profile;
          render();
          onAuthChanged?.();
        });
      } else {
        render();
      }
    });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        currentUserProfile = await fetchCurrentProfile(session.user.id);
      } else {
        currentUserProfile = null;
      }
      render();
      onAuthChanged?.();
    });
  }

  function render(): void {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    container.appendChild(statusBanner);

    if (currentUserProfile) {
      // 1. Signed-in state
      const userCard = document.createElement("div");
      userCard.className = "auth-user-card";

      const welcomeText = document.createElement("span");
      welcomeText.className = "auth-welcome-text";
      welcomeText.textContent = t("auth.welcome", { name: currentUserProfile.display_name });

      const signOutBtn = document.createElement("button");
      signOutBtn.className = "auth-btn auth-signout-btn";
      signOutBtn.type = "button";
      signOutBtn.textContent = t("auth.signOut");

      signOutBtn.addEventListener("click", async () => {
        await signOutUser();
        currentUserProfile = null;
        setStatus("");
        clearStatus();
        render();
        onAuthChanged?.();
      });

      userCard.appendChild(welcomeText);
      userCard.appendChild(signOutBtn);
      container.appendChild(userCard);
      return;
    }

    // 2. Auth Form (Sign In / Sign Up)
    const form = document.createElement("form");
    form.className = "auth-form";
    form.setAttribute("novalidate", "true");

    const formTitle = document.createElement("h3");
    formTitle.className = "auth-form-title";
    formTitle.textContent = mode === "signin" ? t("auth.signIn") : t("auth.signUp");
    form.appendChild(formTitle);

    // Display Name input (Only for Sign Up)
    let displayNameInput: HTMLInputElement | null = null;
    if (mode === "signup") {
      const nameGroup = document.createElement("div");
      nameGroup.className = "form-group";

      const nameLabel = document.createElement("label");
      nameLabel.className = "form-label";
      nameLabel.textContent = t("auth.displayName");
      nameLabel.htmlFor = "auth-display-name";

      displayNameInput = document.createElement("input");
      displayNameInput.className = "form-input";
      displayNameInput.id = "auth-display-name";
      displayNameInput.type = "text";
      displayNameInput.required = true;
      displayNameInput.minLength = 3;
      displayNameInput.maxLength = 20;

      nameGroup.appendChild(nameLabel);
      nameGroup.appendChild(displayNameInput);
      form.appendChild(nameGroup);
    }

    // Email Input
    const emailGroup = document.createElement("div");
    emailGroup.className = "form-group";

    const emailLabel = document.createElement("label");
    emailLabel.className = "form-label";
    emailLabel.textContent = t("auth.email");
    emailLabel.htmlFor = "auth-email";

    const emailInput = document.createElement("input");
    emailInput.className = "form-input";
    emailInput.id = "auth-email";
    emailInput.type = "email";
    emailInput.required = true;

    emailGroup.appendChild(emailLabel);
    emailGroup.appendChild(emailInput);
    form.appendChild(emailGroup);

    // Password Input
    const passGroup = document.createElement("div");
    passGroup.className = "form-group";

    const passLabel = document.createElement("label");
    passLabel.className = "form-label";
    passLabel.textContent = t("auth.password");
    passLabel.htmlFor = "auth-password";

    const passInput = document.createElement("input");
    passInput.className = "form-input";
    passInput.id = "auth-password";
    passInput.type = "password";
    passInput.required = true;
    passInput.minLength = 8;

    passGroup.appendChild(passLabel);
    passGroup.appendChild(passInput);
    form.appendChild(passGroup);

    // Turnstile Verification token mock/input for local environment
    const turnstileNotice = document.createElement("div");
    turnstileNotice.className = "turnstile-badge";
    turnstileNotice.textContent = `🛡️ ${t("auth.turnstileNotice")}`;
    form.appendChild(turnstileNotice);

    // Submit Button
    const submitBtn = document.createElement("button");
    submitBtn.className = "auth-btn auth-submit-btn";
    submitBtn.type = "submit";
    submitBtn.textContent = isSubmitting
      ? t("auth.submitting")
      : mode === "signin"
        ? t("auth.signIn")
        : t("auth.signUp");
    form.appendChild(submitBtn);

    // Mode Toggle Link
    const switchBtn = document.createElement("button");
    switchBtn.className = "auth-switch-mode-btn";
    switchBtn.type = "button";
    switchBtn.textContent = mode === "signin" ? t("auth.switchToSignUp") : t("auth.switchToSignIn");

    switchBtn.addEventListener("click", () => {
      mode = mode === "signin" ? "signup" : "signin";
      clearStatus();
      render();
    });
    form.appendChild(switchBtn);

    // Form submit handler
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearStatus();

      const email = emailInput.value.trim();
      const password = passInput.value;
      const turnstileToken = "cf-turnstile-token-verified"; // Local / Turnstile pass token

      isSubmitting = true;
      submitBtn.textContent = t("auth.submitting");
      submitBtn.disabled = true;

      try {
        if (mode === "signup") {
          const displayName = displayNameInput?.value.trim() ?? "";
          const result = await signUpUser({
            email,
            password,
            displayName,
            locale: "vi",
            turnstileToken,
          });

          if (result.success) {
            setStatus(t(result.messageKey ?? "auth.verificationSent"));
          } else {
            setStatus(result.error ?? (result.messageKey ? t(result.messageKey) : "Error"), true);
          }
        } else {
          const result = await signInUser({
            email,
            password,
            turnstileToken,
          });

          if (result.success) {
            const user = (await supabase?.auth.getUser())?.data.user;
            if (user) {
              currentUserProfile = await fetchCurrentProfile(user.id);
            }
            render();
            onAuthChanged?.();
          } else {
            setStatus(result.error ?? (result.messageKey ? t(result.messageKey) : "Error"), true);
          }
        }
      } catch (err: unknown) {
        setStatus(err instanceof Error ? err.message : "Unexpected error", true);
      } finally {
        isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.textContent = mode === "signin" ? t("auth.signIn") : t("auth.signUp");
      }
    });

    container.appendChild(form);
  }

  render();
  return container;
}
