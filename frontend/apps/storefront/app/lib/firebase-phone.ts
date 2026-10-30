export interface FirebaseConfig {
  api_key: string;
  auth_domain: string;
  project_id: string;
  app_id: string;
  messaging_sender_id?: string;
}

export interface FirebaseConfirmationResult {
  confirm: (code: string) => Promise<{ idToken: string; phone: string }>;
  clear: () => void;
}

export async function loadFirebaseSdk(): Promise<any> {
  if (typeof window === "undefined") return null;

  const urls = [
    "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
  ];
  for (const url of urls) {
    if (document.querySelector(`script[src="${url}"]`)) continue;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Unable to load Google Firebase Authentication library. Please check your network connection."));
      document.head.appendChild(script);
    });
  }
  const firebase = (window as unknown as { firebase?: any }).firebase;
  if (!firebase) {
    throw new Error("Firebase SDK could not be initialized.");
  }
  return firebase;
}

export function formatE164Phone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  if (rawPhone.trim().startsWith("+")) {
    return `+${digits}`;
  }
  return digits.length > 10 ? `+${digits}` : `+91${digits}`;
}

export function humanizeFirebaseError(error: any): string {
  const code = error?.code || "";
  const msg = error?.message || "";
  if (code === "auth/unauthorized-domain") {
    return "This domain (retail.sirixo.com) is not authorized in Firebase. Please open Firebase Console > Authentication > Settings > Authorized Domains and add 'retail.sirixo.com'.";
  }
  if (code === "auth/invalid-phone-number") {
    return "The mobile number format is invalid. Please enter a valid 10-digit number.";
  }
  if (code === "auth/quota-exceeded") {
    return "Firebase SMS daily verification quota exceeded. Please check SMS usage in your Firebase Console.";
  }
  if (code === "auth/invalid-verification-code") {
    return "Incorrect 6-digit verification code. Please check your SMS and try again.";
  }
  if (code === "auth/code-expired") {
    return "The verification code has expired. Please request a new code.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many requests sent to this number. Please wait a few minutes before trying again.";
  }
  if (code === "auth/captcha-check-failed") {
    return "Google reCAPTCHA verification failed. Please refresh the page and try again.";
  }
  return msg || "An unexpected error occurred with Firebase Authentication.";
}

export async function sendFirebaseOtp(
  config: FirebaseConfig,
  phone: string,
  containerId: string,
  options?: { size?: "invisible" | "normal" }
): Promise<FirebaseConfirmationResult> {
  const firebase = await loadFirebaseSdk();

  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp({
      apiKey: config.api_key,
      authDomain: config.auth_domain,
      projectId: config.project_id,
      appId: config.app_id,
      messagingSenderId: config.messaging_sender_id ?? "",
    });
  }

  const e164 = formatE164Phone(phone);
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`reCAPTCHA container '#${containerId}' not found.`);
  }

  const win = window as any;
  if (win[`__recaptcha_${containerId}`]) {
    try {
      win[`__recaptcha_${containerId}`].clear();
    } catch {}
    win[`__recaptcha_${containerId}`] = null;
  }
  container.innerHTML = "";

  const verifier = new firebase.auth.RecaptchaVerifier(containerId, {
    size: options?.size ?? "invisible",
  });
  win[`__recaptcha_${containerId}`] = verifier;

  try {
    const confirmationResult = await firebase.auth().signInWithPhoneNumber(e164, verifier);
    return {
      confirm: async (code: string) => {
        const cred = await confirmationResult.confirm(code);
        const idToken = await cred.user.getIdToken();
        return { idToken, phone: e164 };
      },
      clear: () => {
        try {
          verifier.clear();
        } catch {}
      },
    };
  } catch (err) {
    try {
      verifier.clear();
    } catch {}
    throw err;
  }
}
