import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Crown } from "lucide-react";
import { insightsAPI } from "../features/insights/insightsAPI";
import UpgradeModal from "../components/UpgradeModal";
const SUGGESTIONS = [
  "How much did I spend this month?",
  "What are my top categories?",
  "How much did I save this month?",
];
function AiBadge({ usedAi }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${usedAi ? "bg-brand-100 text-brand-700" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}
    >
      {usedAi ? "AI-powered" : "Rule-based"}
    </span>
  );
}
export default function Insights() {
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => {
    insightsAPI
      .summary()
      .then(setSummary)
      .catch(() =>
        setSummary({
          summary: "Couldn't load your summary right now.",
          usedAi: false,
        }),
      )
      .finally(() => setSummaryLoading(false));
  }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);
  async function handleAsk(q) {
    const text = (q || question).trim();
    if (!text || asking) return;
    setMessages((m) => [
      ...m,
      {
        role: "user",
        text,
      },
    ]);
    setQuestion("");
    setAsking(true);
    try {
      const res = await insightsAPI.ask(text);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: res.answer,
          usedAi: res.usedAi,
          limitReached: res.limitReached,
          dailyLimit: res.dailyLimit,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            err.response?.data?.message ||
            "Something went wrong answering that.",
          usedAi: false,
        },
      ]);
    } finally {
      setAsking(false);
    }
  }
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Insights
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        A monthly summary and a place to ask questions about your spending.
        Works out of the box with rule-based answers — add an{" "}
        <code className="rounded bg-gray-100 dark:bg-gray-700 px-1">
          OPENAI_API_KEY
        </code>{" "}
        or{" "}
        <code className="rounded bg-gray-100 dark:bg-gray-700 px-1">
          ANTHROPIC_API_KEY
        </code>{" "}
        to the server's .env for smarter, open-ended answers.
      </p>

      <div className="mt-6 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            <Sparkles className="h-4 w-4 text-brand-600" /> This month
          </h2>
          {summary && <AiBadge usedAi={summary.usedAi} />}
        </div>
        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
          {summaryLoading ? "Loading..." : summary?.summary}
        </p>
      </div>

      <div className="mt-6 rounded-xl bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
        <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Ask about your finances
          </h2>
        </div>

        <div className="max-h-96 overflow-y-auto px-6 py-4">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleAsk(s)}
                  className="rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${m.role === "user" ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-800"}`}
                >
                  <p>{m.text}</p>
                  {m.role === "assistant" && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <AiBadge usedAi={m.usedAi} />
                      {m.limitReached && (
                        <button
                          onClick={() => setShowUpgrade(true)}
                          className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-500/10 dark:text-amber-400"
                        >
                          <Crown className="h-3 w-3" />
                          {m.dailyLimit
                            ? `Free plan: ${m.dailyLimit} AI answers/day used — upgrade for unlimited`
                            : "Upgrade for unlimited AI answers"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {asking && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Thinking...
              </p>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex gap-2 border-t border-gray-100 dark:border-gray-700 px-6 py-4"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your spending..."
            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={asking}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> Ask
          </button>
        </form>
      </div>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
