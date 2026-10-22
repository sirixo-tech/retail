"use client";

import { Badge, Button } from "@selfx/ui";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Activity,
  Eye,
  EyeOff,
  Cpu,
  CheckCheck
} from "lucide-react";
import {
  GeminiLogo,
  OpenAiLogo,
  AnthropicLogo,
  GroqLogo,
  DeepSeekLogo
} from "../../lib/brand-logos";

interface AiProviderConfig {
  id: string;
  name: string;
  description: string;
  configured: boolean;
  masked_key: string;
  model: string;
  available_models: string[];
}

interface AiSettingsResponse {
  active_provider: string;
  providers: AiProviderConfig[];
  gemini_api_key: string;
  openai_api_key: string;
  anthropic_api_key: string;
  groq_api_key: string;
  gemini_model: string;
  openai_model: string;
  anthropic_model: string;
  groq_model: string;
  custom_endpoint: string;
  temperature: number;
  max_tokens: number;
  system_prompt_prefix: string;
  monthly_token_budget: number;
  tokens_used_this_month: number;
  per_tenant_daily_limit: number;
  fallback_to_local_rag: boolean;
}

export default function AiSettingsPage() {
  const [settings, setSettings] = useState<AiSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form field states
  const [activeProvider, setActiveProvider] = useState<string>("gemini");
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [deepseekKey, setDeepseekKey] = useState("");
  
  const [geminiModel, setGeminiModel] = useState("gemini-1.5-flash");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [anthropicModel, setAnthropicModel] = useState("claude-3-5-sonnet-20241022");
  const [groqModel, setGroqModel] = useState("llama-3.3-70b-versatile");
  const [deepseekModel, setDeepseekModel] = useState("deepseek-chat");

  const [customEndpoint, setCustomEndpoint] = useState("");
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [tokenBudget, setTokenBudget] = useState(10000000);
  const [tenantDailyLimit, setTenantDailyLimit] = useState(500);
  const [fallbackToLocal, setFallbackToLocal] = useState(true);

  // Key visibility toggles
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Test connection state
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latency_ms?: number }>>({});

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: AiSettingsResponse }>("/api/v1/platform/ai/settings");
      const d = res.data;
      setSettings(d);
      setActiveProvider(d.active_provider === "local_rag" ? "gemini" : (d.active_provider || "gemini"));
      setGeminiKey(d.gemini_api_key);
      setOpenaiKey(d.openai_api_key);
      setAnthropicKey(d.anthropic_api_key);
      setGroqKey(d.groq_api_key);
      setGeminiModel(d.gemini_model || "gemini-1.5-flash");
      setOpenaiModel(d.openai_model || "gpt-4o-mini");
      setAnthropicModel(d.anthropic_model || "claude-3-5-sonnet-20241022");
      setGroqModel(d.groq_model || "llama-3.3-70b-versatile");
      setCustomEndpoint(d.custom_endpoint || "");
      setTemperature(d.temperature);
      setMaxTokens(d.max_tokens);
      setSystemPrompt(d.system_prompt_prefix);
      setTokenBudget(d.monthly_token_budget);
      setTenantDailyLimit(d.per_tenant_daily_limit);
      setFallbackToLocal(d.fallback_to_local_rag);
    } catch (err: any) {
      setError(err?.error?.message ?? "Failed to load AI gateway settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        active_provider: activeProvider,
        gemini_api_key: geminiKey,
        openai_api_key: openaiKey,
        anthropic_api_key: anthropicKey,
        groq_api_key: groqKey,
        gemini_model: geminiModel,
        openai_model: openaiModel,
        anthropic_model: anthropicModel,
        groq_model: groqModel,
        custom_endpoint: customEndpoint,
        temperature,
        max_tokens: maxTokens,
        system_prompt_prefix: systemPrompt,
        monthly_token_budget: tokenBudget,
        per_tenant_daily_limit: tenantDailyLimit,
        fallback_to_local_rag: fallbackToLocal,
      };

      await api("/api/v1/platform/ai/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setSuccess("AI Gateway routing, credentials, and governance rules updated successfully.");
      await loadSettings();
    } catch (err: any) {
      setError(err?.error?.message ?? "Failed to save AI settings");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection(providerId: string, model: string, keyVal: string) {
    setTestingProvider(providerId);
    try {
      const res = await api<{ data: { success: boolean; message: string; latency_ms: number } }>(
        "/api/v1/platform/ai/test",
        {
          method: "POST",
          body: JSON.stringify({
            provider: providerId,
            api_key: keyVal,
            model,
          }),
        }
      );
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: true,
          message: res.data.message,
          latency_ms: res.data.latency_ms,
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: false,
          message: err?.error?.message ?? "Connection handshake failed.",
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">AI &amp; LLM Gateway Management</h1>
          <p className="text-xs text-muted mt-1">
            Centralized multi-model orchestration. Manage API keys, model routing, token quotas, and local RAG fallbacks across Console and Storefront.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void loadSettings()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs shadow-xs"
          >
            <CheckCheck className="h-4 w-4" /> {saving ? "Saving..." : "Save AI Gateway Settings"}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main 2-Column AI Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: LLM Provider Cards (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" /> Supported LLM Engines &amp; Credentials
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Configure upstream AI studio keys. Platform routing directs all Tenant Admin and Storefront shopper requests to the selected engine.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* 1. Google Gemini Card */}
              <ModelProviderCard
                id="gemini"
                name="Google Gemini"
                category="Multimodal Reasoning • High Speed"
                description="Google AI Studio Gemini 1.5 Flash and Pro with 1M+ token context window and structured JSON support."
                logo={GeminiLogo}
                isActive={activeProvider === "gemini"}
                onSelectActive={() => setActiveProvider("gemini")}
                onDeactivate={() => setActiveProvider("")}
                keyVal={geminiKey}
                onKeyChange={setGeminiKey}
                modelVal={geminiModel}
                onModelChange={setGeminiModel}
                availableModels={[
                  { id: "gemini-1.5-flash", label: "gemini-1.5-flash (1M Context • Fast & Efficient)" },
                  { id: "gemini-1.5-pro", label: "gemini-1.5-pro (2M Context • Complex Reasoning)" },
                  { id: "gemini-2.0-flash-exp", label: "gemini-2.0-flash-exp (Experimental Preview)" },
                ]}
                showKey={showKeys["gemini"]}
                onToggleShowKey={() => setShowKeys((prev) => ({ ...prev, gemini: !prev.gemini }))}
                isTesting={testingProvider === "gemini"}
                testResult={testResults["gemini"]}
                onTest={() => void testConnection("gemini", geminiModel, geminiKey)}
              />

              {/* 2. OpenAI Card */}
              <ModelProviderCard
                id="openai"
                name="OpenAI (ChatGPT)"
                category="Frontier GPT-4o • Enterprise Accuracy"
                description="OpenAI flagship reasoning models optimized for catalog attribute inference and natural customer support."
                logo={OpenAiLogo}
                isActive={activeProvider === "openai"}
                onSelectActive={() => setActiveProvider("openai")}
                onDeactivate={() => setActiveProvider("")}
                keyVal={openaiKey}
                onKeyChange={setOpenaiKey}
                modelVal={openaiModel}
                onModelChange={setOpenaiModel}
                availableModels={[
                  { id: "gpt-4o-mini", label: "gpt-4o-mini (128k Context • Recommended)" },
                  { id: "gpt-4o", label: "gpt-4o (128k Context • Frontier Performance)" },
                  { id: "o1-mini", label: "o1-mini (STEM & Mathematical Reasoning)" },
                ]}
                showKey={showKeys["openai"]}
                onToggleShowKey={() => setShowKeys((prev) => ({ ...prev, openai: !prev.openai }))}
                isTesting={testingProvider === "openai"}
                testResult={testResults["openai"]}
                onTest={() => void testConnection("openai", openaiModel, openaiKey)}
              />

              {/* 3. Anthropic Claude Card */}
              <ModelProviderCard
                id="anthropic"
                name="Anthropic Claude"
                category="Long-Context Nuance • Strict Safety"
                description="Claude 3.5 Sonnet and Haiku with industry-leading context retention, document understanding, and code logic."
                logo={AnthropicLogo}
                isActive={activeProvider === "anthropic"}
                onSelectActive={() => setActiveProvider("anthropic")}
                onDeactivate={() => setActiveProvider("")}
                keyVal={anthropicKey}
                onKeyChange={setAnthropicKey}
                modelVal={anthropicModel}
                onModelChange={setAnthropicModel}
                availableModels={[
                  { id: "claude-3-5-sonnet-20241022", label: "claude-3-5-sonnet (200k Context • Best in Class)" },
                  { id: "claude-3-5-haiku-20241022", label: "claude-3-5-haiku (200k Context • Ultra-Fast)" },
                  { id: "claude-3-opus-20240229", label: "claude-3-opus (Deep Nuance & Research)" },
                ]}
                showKey={showKeys["anthropic"]}
                onToggleShowKey={() => setShowKeys((prev) => ({ ...prev, anthropic: !prev.anthropic }))}
                isTesting={testingProvider === "anthropic"}
                testResult={testResults["anthropic"]}
                onTest={() => void testConnection("anthropic", anthropicModel, anthropicKey)}
              />

              {/* 4. Groq LPU Card */}
              <ModelProviderCard
                id="groq"
                name="Groq LPU Fast Inference"
                category="Sub-Second Latency • 500+ Tokens/Sec"
                description="Hardware-accelerated Language Processing Units running open-weights Llama 3.3 and Mixtral at wire speed."
                logo={GroqLogo}
                isActive={activeProvider === "groq"}
                onSelectActive={() => setActiveProvider("groq")}
                onDeactivate={() => setActiveProvider("")}
                keyVal={groqKey}
                onKeyChange={setGroqKey}
                modelVal={groqModel}
                onModelChange={setGroqModel}
                availableModels={[
                  { id: "llama-3.3-70b-versatile", label: "llama-3.3-70b-versatile (128k Context • Fast)" },
                  { id: "llama-3.1-8b-instant", label: "llama-3.1-8b-instant (Ultra-Low Latency)" },
                  { id: "mixtral-8x7b-32768", label: "mixtral-8x7b-32768 (MoE Architecture)" },
                ]}
                showKey={showKeys["groq"]}
                onToggleShowKey={() => setShowKeys((prev) => ({ ...prev, groq: !prev.groq }))}
                isTesting={testingProvider === "groq"}
                testResult={testResults["groq"]}
                onTest={() => void testConnection("groq", groqModel, groqKey)}
              />

              {/* 5. DeepSeek Card */}
              <ModelProviderCard
                id="deepseek"
                name="DeepSeek AI"
                category="Open Architecture • High Efficiency"
                description="DeepSeek V3 and R1 reasoning architecture delivering cost-efficient reasoning and math problem solving."
                logo={DeepSeekLogo}
                isActive={activeProvider === "deepseek"}
                onSelectActive={() => setActiveProvider("deepseek")}
                onDeactivate={() => setActiveProvider("")}
                keyVal={deepseekKey}
                onKeyChange={setDeepseekKey}
                modelVal={deepseekModel}
                onModelChange={setDeepseekModel}
                availableModels={[
                  { id: "deepseek-chat", label: "deepseek-chat (V3 General Reasoning)" },
                  { id: "deepseek-reasoner", label: "deepseek-reasoner (R1 Chain of Thought)" },
                ]}
                showKey={showKeys["deepseek"]}
                onToggleShowKey={() => setShowKeys((prev) => ({ ...prev, deepseek: !prev.deepseek }))}
                isTesting={testingProvider === "deepseek"}
                testResult={testResults["deepseek"]}
                onTest={() => void testConnection("deepseek", deepseekModel, deepseekKey)}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Governance, Quotas & Hyperparameters (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Token Governance Card */}
          <div className="rounded-xl border border-line bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <Sliders className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Token Governance &amp; Quotas</h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Monthly Platform Token Budget
              </label>
              <input
                type="number"
                value={tokenBudget}
                onChange={(e) => setTokenBudget(parseInt(e.target.value) || 0)}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-mono outline-none focus:border-primary"
              />
              <span className="text-[11px] text-muted mt-1 block">
                Total token budget shared across all platform tenants per month.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Daily Limit per Tenant (Requests)
              </label>
              <input
                type="number"
                value={tenantDailyLimit}
                onChange={(e) => setTenantDailyLimit(parseInt(e.target.value) || 0)}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-mono outline-none focus:border-primary"
              />
              <span className="text-[11px] text-muted mt-1 block">
                Maximum queries an individual store tenant can execute per 24 hours.
              </span>
            </div>

            <div className="pt-2 border-t border-line/60">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fallbackToLocal}
                  onChange={(e) => setFallbackToLocal(e.target.checked)}
                  className="rounded mt-0.5 accent-primary"
                />
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Zero-Downtime Local Fallback
                  </span>
                  <span className="text-[11px] text-muted leading-relaxed block mt-0.5">
                    Fallback to SelfX built-in RAG if upstream cloud provider experiences an outage or quota limit.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Model Hyperparameters Card */}
          <div className="rounded-xl border border-line bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Inference Hyperparameters</h3>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-muted">Sampling Temperature</span>
                <span className="font-semibold font-mono text-foreground">{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-muted mt-0.5">
                <span>0.0 (Deterministic)</span>
                <span>0.5 (Balanced)</span>
                <span>1.0 (Creative)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-muted">Max Response Tokens</span>
                <span className="font-semibold font-mono text-foreground">{maxTokens}</span>
              </div>
              <input
                type="range"
                min="200"
                max="4000"
                step="100"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Custom Endpoint URL (Azure / Self-Hosted)
              </label>
              <input
                type="text"
                placeholder="https://api.openai.azure.com/v1"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-mono outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Global System Prompt Prefix
              </label>
              <textarea
                rows={3}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enterprise instructions injected to all AI chat sessions..."
                className="w-full rounded-xl border border-line bg-surface p-3 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MODEL PROVIDER CARD COMPONENT
// -------------------------------------------------------------
function ModelProviderCard({
  id,
  name,
  category,
  description,
  logo: Logo,
  isActive,
  onSelectActive,
  onDeactivate,
  keyVal,
  onKeyChange,
  modelVal,
  onModelChange,
  availableModels,
  showKey,
  onToggleShowKey,
  isTesting,
  testResult,
  onTest,
}: {
  id: string;
  name: string;
  category: string;
  description: string;
  logo: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onSelectActive: () => void;
  onDeactivate: () => void;
  keyVal: string;
  onKeyChange: (val: string) => void;
  modelVal: string;
  onModelChange: (val: string) => void;
  availableModels: { id: string; label: string }[];
  showKey: boolean;
  onToggleShowKey: () => void;
  isTesting: boolean;
  testResult?: { success: boolean; message: string; latency_ms?: number };
  onTest: () => void;
}) {
  const isConfigured = Boolean(keyVal && keyVal.length > 5);

  return (
    <div
      className={`rounded-xl border p-4.5 transition-all bg-surface shadow-xs space-y-3.5 ${
        isActive
          ? "border-emerald-500/40 bg-emerald-500/[0.015]"
          : "border-line hover:border-muted"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-muted/90 p-2 shrink-0 border border-line/60">
            <Logo className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground text-sm">{name}</h4>
              <Badge tone={isConfigured ? "ok" : "neutral"}>
                {isConfigured ? "Configured" : "No Key"}
              </Badge>
              {isActive && (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Active Gateway
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-muted mt-0.5">{category}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={onTest}
            disabled={isTesting || !keyVal}
            className="text-xs flex items-center gap-1.5"
          >
            <Activity className={`h-3 w-3 ${isTesting ? "animate-spin text-primary" : ""}`} />
            {isTesting ? "Pinging..." : "Test Latency"}
          </Button>

          {isActive ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={onDeactivate}
              className="text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 border-red-200 dark:border-red-900/40 font-medium"
            >
              Deactivate
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={onSelectActive}
              className="text-xs hover:border-primary/40 font-medium"
            >
              Activate
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted leading-relaxed">{description}</p>

      {/* Inputs Strip */}
      <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-line/60">
        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">
            API Secret Key
          </label>
          <div className="relative flex items-center">
            <input
              type={showKey ? "text" : "password"}
              placeholder="Enter provider API key (sk-...)"
              value={keyVal}
              onChange={(e) => onKeyChange(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface pl-3 pr-8 py-1.5 text-xs font-mono outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={onToggleShowKey}
              className="absolute right-2.5 text-muted hover:text-foreground"
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">
            Model Engine Target
          </label>
          <select
            value={modelVal}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-xs outline-none focus:border-primary"
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Latency Test Feedback Banner */}
      {testResult && (
        <div
          className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs border ${
            testResult.success
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            )}
            <span>{testResult.message}</span>
          </div>
          {testResult.latency_ms && (
            <span className="font-mono font-semibold text-[11px]">
              {testResult.latency_ms}ms roundtrip
            </span>
          )}
        </div>
      )}
    </div>
  );
}
