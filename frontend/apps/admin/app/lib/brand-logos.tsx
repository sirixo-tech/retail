import type { SVGProps } from "react";

/**
 * Official OpenAI Logo
 */
export function OpenAiLogo({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <title>OpenAI</title>
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6726a.79.79 0 0 0-.4021-.6908zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.009 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813l-.0048 6.7227zm1.145-2.039l3.0537-1.761 3.0537 1.761v3.5221l-3.0537 1.761-3.0537-1.761z" />
    </svg>
  );
}

/**
 * Official Google Gemini Emblem (Multimodal Gradient Star)
 */
export function GeminiLogo({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...props}>
      <title>Google Gemini</title>
      <path
        d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
        fill="#3186FF"
      />
      <path
        d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
        fill="url(#gemini-grad-green)"
      />
      <path
        d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
        fill="url(#gemini-grad-red)"
      />
      <path
        d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
        fill="url(#gemini-grad-yellow)"
      />
      <defs>
        <linearGradient id="gemini-grad-green" x1="7" y1="15.5" x2="11" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#08B962" />
          <stop offset="1" stopColor="#08B962" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gemini-grad-red" x1="8" y1="5.5" x2="11.5" y2="11" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F94543" />
          <stop offset="1" stopColor="#F94543" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gemini-grad-yellow" x1="3.5" y1="13.5" x2="17.5" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FABC12" />
          <stop offset="0.46" stopColor="#FABC12" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Official Anthropic Claude Logo (Terracotta Coral Starburst)
 */
export function AnthropicLogo({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="#D97757" className={className} {...props}>
      <title>Anthropic Claude</title>
      <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
    </svg>
  );
}

/**
 * Official Groq Logo (Bold lowercase 'g')
 */
export function GroqLogo({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="#F55036" className={className} {...props}>
      <title>Groq</title>
      <path d="M12.036 2c-3.853-.035-7 3-7.036 6.781-.035 3.782 3.055 6.872 6.908 6.907h2.42v-2.566h-2.292c-2.407.028-4.38-1.866-4.408-4.23-.029-2.362 1.901-4.298 4.308-4.326h.1c2.407 0 4.358 1.915 4.365 4.278v6.305c0 2.342-1.944 4.25-4.323 4.279a4.375 4.375 0 01-3.033-1.252l-1.851 1.818A7 7 0 0012.029 22h.092c3.803-.056 6.858-3.083 6.879-6.816v-6.5C18.907 4.963 15.817 2 12.036 2z" />
    </svg>
  );
}

/**
 * Official DeepSeek Logo (DeepSeek Dolphin/Whale)
 */
export function DeepSeekLogo({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="#0D53FF" className={className} {...props}>
      <title>DeepSeek</title>
      <path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" />
    </svg>
  );
}

/**
 * Official GS1 Global Office Logo (from Wikimedia Commons File:Logo_GS1.svg)
 */
export function Gs1Logo({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 72.74 61" className={className} {...props}>
      <title>GS1 Global Standards</title>
      <path
        fill="#002C6C"
        d="M71.74,37.557v-1.932h-3.574V20.939h-1.738l-4.735,1.932l0.483,2.125l3.671-1.449v12.077h-4.059v1.932H71.74z"
      />
      <path
        fill="#F26334"
        d="M59.567,29.634c0,15.748-12.85,28.5-28.693,28.5c-15.845,0-28.695-12.752-28.695-28.5c0.096-15.748,12.851-28.5,28.695-28.5C46.718,1.134,59.567,13.886,59.567,29.634z"
      />
      <path
        fill="#FFFFFF"
        d="M36.767,21.037c-4.25,0-7.44,3.478-7.44,8.212v0.193c0,4.926,2.997,8.212,7.343,8.212c2.415,0,4.252-0.967,5.41-1.838v-7.051h-5.507v1.739h3.574v4.154l-0.097,0.097c-0.869,0.579-2.027,0.965-3.187,0.965c-3.189,0-5.218-2.511-5.218-6.375v-0.096c0-3.575,2.126-6.28,5.121-6.28c1.739,0,2.802,0.579,3.671,1.352l1.258-1.641C40.147,21.52,38.699,21.037,36.767,21.037z"
      />
      <path
        fill="#FFFFFF"
        d="M45.172,35.432c1.643,1.447,3.574,2.125,5.604,2.125c3.092,0,5.119-1.837,5.119-4.542c0-2.221-1.158-3.477-4.346-4.636c-2.898-1.16-3.672-1.835-3.672-3.188c0-1.353,1.16-2.319,2.803-2.319c1.16,0,2.412,0.483,3.669,1.449l1.258-1.641c-1.353-1.16-2.996-1.74-4.831-1.74c-2.995,0-5.023,1.835-5.023,4.347c0,2.609,1.642,3.672,4.639,4.83c2.605,0.967,3.477,1.644,3.477,2.998c0,1.448-1.257,2.511-2.994,2.511c-1.933,0-3.381-0.967-4.348-1.836L45.172,35.432z"
      />
    </svg>
  );
}

/**
 * Official Open Food Facts Logo (from Open Food Facts official branding assets)
 */
export function OpenFoodFactsLogo({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} {...props}>
      <title>Open Food Facts</title>
      <rect width="48" height="48" rx="10" fill="#FF8714" />
      <rect x="7" y="10" width="3" height="28" rx="1.5" fill="#FFFFFF" />
      <rect x="12.5" y="10" width="2" height="28" rx="1" fill="#FFFFFF" />
      <rect x="17" y="10" width="4" height="28" rx="1.5" fill="#FFFFFF" />
      <rect x="23.5" y="10" width="2" height="28" rx="1" fill="#FFFFFF" />
      <rect x="28" y="10" width="3.5" height="28" rx="1.5" fill="#FFFFFF" />
      <rect x="34" y="10" width="2" height="28" rx="1" fill="#FFFFFF" />
      <rect x="38" y="10" width="3" height="28" rx="1.5" fill="#FFFFFF" />
      {/* Central Eye Scanner Lens */}
      <circle cx="24" cy="24" r="8.5" fill="#1C1917" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="24" cy="24" r="5" fill="#FFFFFF" />
      <circle cx="24.5" cy="23.5" r="3" fill="#FF8714" />
      <circle cx="25.5" cy="22.5" r="1" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * Official Open Beauty Facts Logo
 */
export function OpenBeautyFactsLogo({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} {...props}>
      <title>Open Beauty Facts</title>
      <rect width="48" height="48" rx="10" fill="#8B5CF6" />
      <rect x="7" y="10" width="3" height="28" rx="1.5" fill="#FFFFFF" />
      <rect x="12.5" y="10" width="2" height="28" rx="1" fill="#FFFFFF" />
      <rect x="17" y="10" width="4" height="28" rx="1.5" fill="#FFFFFF" />
      <rect x="23.5" y="10" width="2" height="28" rx="1" fill="#FFFFFF" />
      <rect x="28" y="10" width="3.5" height="28" rx="1.5" fill="#FFFFFF" />
      <rect x="34" y="10" width="2" height="28" rx="1" fill="#FFFFFF" />
      <rect x="38" y="10" width="3" height="28" rx="1.5" fill="#FFFFFF" />
      {/* Cosmetic Drop Lens */}
      <circle cx="24" cy="24" r="8.5" fill="#1C1917" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="24" cy="24" r="5" fill="#FFFFFF" />
      <path d="M24 20C22.2 22.5 21 24.2 21 25.4C21 27.1 22.3 28.5 24 28.5C25.7 28.5 27 27.1 27 25.4C27 24.2 25.8 22.5 24 20Z" fill="#8B5CF6" />
    </svg>
  );
}

/**
 * Official Open Pet Food Facts Logo
 */
export function OpenPetFoodFactsLogo({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} {...props}>
      <title>Open Pet Food Facts</title>
      <rect width="48" height="48" rx="10" fill="#10B981" />
      <rect x="7" y="10" width="3" height="28" rx="1.5" fill="#FFFFFF" />
      <rect x="12.5" y="10" width="2" height="28" rx="1" fill="#FFFFFF" />
      <rect x="17" y="10" width="4" height="28" rx="1.5" fill="#FFFFFF" />
      <rect x="23.5" y="10" width="2" height="28" rx="1" fill="#FFFFFF" />
      <rect x="28" y="10" width="3.5" height="28" rx="1.5" fill="#FFFFFF" />
      <rect x="34" y="10" width="2" height="28" rx="1" fill="#FFFFFF" />
      <rect x="38" y="10" width="3" height="28" rx="1.5" fill="#FFFFFF" />
      {/* Pet Paw Emblem */}
      <circle cx="24" cy="24" r="8.5" fill="#1C1917" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="24" cy="24" r="5" fill="#FFFFFF" />
      <circle cx="24" cy="26" r="2.2" fill="#047857" />
      <circle cx="21.5" cy="22.5" r="1.1" fill="#047857" />
      <circle cx="23.2" cy="21.2" r="1.1" fill="#047857" />
      <circle cx="25.2" cy="21.2" r="1.1" fill="#047857" />
      <circle cx="26.8" cy="22.5" r="1.1" fill="#047857" />
    </svg>
  );
}

/**
 * Official Open Products Facts Logo
 */
export function OpenProductsFactsLogo({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} {...props}>
      <title>Open Products Facts</title>
      <rect width="48" height="48" rx="10" fill="#2563EB" />
      <rect x="7" y="10" width="3" height="28" rx="1.5" fill="#FFFFFF" />
      <rect x="12.5" y="10" width="2" height="28" rx="1" fill="#FFFFFF" />
      <rect x="17" y="10" width="4" height="28" rx="1.5" fill="#FFFFFF" />
      <rect x="23.5" y="10" width="2" height="28" rx="1" fill="#FFFFFF" />
      <rect x="28" y="10" width="3.5" height="28" rx="1.5" fill="#FFFFFF" />
      <rect x="34" y="10" width="2" height="28" rx="1" fill="#FFFFFF" />
      <rect x="38" y="10" width="3" height="28" rx="1.5" fill="#FFFFFF" />
      {/* Merch Cube Lens */}
      <circle cx="24" cy="24" r="8.5" fill="#1C1917" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="24" cy="24" r="5" fill="#FFFFFF" />
      <rect x="20.5" y="20.5" width="7" height="7" rx="1.5" fill="#1E40AF" />
      <path d="M20.5 22.5L24 24.5L27.5 22.5" stroke="white" strokeWidth="1" />
      <path d="M24 24.5V27.5" stroke="white" strokeWidth="1" />
    </svg>
  );
}

/**
 * Official Wikidata Logo (from Wikimedia Commons File:Wikidata-logo.svg)
 */
export function WikidataLogo({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 1050 590" className={className} {...props}>
      <title>Wikidata</title>
      <path d="m 120,545 h 30 V 45 H 120 V 545 z m 60,0 h 90 V 45 H 180 V 545 z M 300,45 V 545 h 90 V 45 h -90 z" fill="#990000" />
      <path d="m 840,545 h 30 V 45 H 840 V 545 z M 900,45 V 545 h 30 V 45 H 900 z M 420,545 h 30 V 45 H 420 V 545 z M 480,45 V 545 h 30 V 45 h -30 z" fill="#339966" />
      <path d="m 540,545 h 90 V 45 h -90 V 545 z m 120,0 h 30 V 45 H 660 V 545 z M 720,45 V 545 h 90 V 45 H 720 z" fill="#006699" />
    </svg>
  );
}

/**
 * Official UPCitemdb Logo
 */
export function UpcItemDbLogo({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} {...props}>
      <title>UPCitemdb</title>
      <rect width="48" height="48" rx="10" fill="#1E3A8A" />
      <path d="M10 16V10H16M32 10H38V16M10 32V38H16M38 32V38H32" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="14" y="15" width="2" height="18" fill="white" />
      <rect x="18" y="15" width="3.5" height="18" fill="white" />
      <rect x="23.5" y="15" width="1.5" height="18" fill="white" />
      <rect x="27" y="15" width="3" height="18" fill="white" />
      <rect x="32" y="15" width="2" height="18" fill="white" />
      <line x1="8" y1="24" x2="40" y2="24" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Official Enterprise Barcode Gateway Logo
 */
export function BarcodeLookupLogo({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} {...props}>
      <title>Enterprise Barcode Gateway</title>
      <rect width="48" height="48" rx="10" fill="#0F172A" />
      <rect x="11" y="13" width="2.5" height="22" fill="#38BDF8" />
      <rect x="16" y="13" width="1.5" height="22" fill="#38BDF8" />
      <rect x="20" y="13" width="4" height="22" fill="#38BDF8" />
      <rect x="26.5" y="13" width="2" height="22" fill="#38BDF8" />
      <rect x="31" y="13" width="3.5" height="22" fill="#38BDF8" />
      <circle cx="34" cy="33" r="7.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
      <path d="M31.5 33L33.5 35L36.5 31" stroke="#0F172A" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * SelfX Platform Core Intelligence Logo
 */
export function SelfxLogo({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} {...props}>
      <title>SelfX Intelligence</title>
      <rect width="32" height="32" rx="8" fill="#0F172A" />
      <path
        d="M16 6L9 9.5V16.5C9 21.5 12 25 16 26.5C20 25 23 21.5 23 16.5V9.5L16 6Z"
        fill="#10B981"
      />
      <path
        d="M13.5 16.5L15.5 18.5L19 14"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
