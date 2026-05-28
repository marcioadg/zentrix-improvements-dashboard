import React, { useState } from 'react';
import { Send, Sparkles, User } from 'lucide-react';
import { LinearLayout, FooterHint } from './LinearLayout';

// This page is a UI shell for the AI chat — no real Supabase data to fetch for chat messages
// but we show the interface with the Linear design language

const SAMPLE_MESSAGES = [
  { role: 'user' as const, content: 'What are our biggest risks for Q1 goals?' },
  { role: 'assistant' as const, content: 'Based on the current data in Zentrix OS, I can see a few areas of concern for Q1:\n\n1. **Churn Rate** is at 3.2%, above the <3% target. The trend is improving but the deadline is approaching.\n2. **Hiring Pipeline** — only 2 of 5 senior engineer positions have been filled with the quarter ending soon.\n3. **Revenue** is at $423K vs $500K target — strong growth trajectory but needs acceleration.\n\nI\'d recommend focusing the next sprint on retention initiatives and accelerating the recruiting pipeline.' },
  { role: 'user' as const, content: 'Can you create an action plan for reducing churn?' },
  { role: 'assistant' as const, content: 'Here\'s a recommended churn reduction action plan:\n\n**Immediate (This Week)**\n- Review all accounts showing declining engagement scores\n- Schedule check-in calls with top 10 at-risk accounts\n- Audit recent cancellation reasons for patterns\n\n**Short Term (2 Weeks)**\n- Implement automated health score monitoring\n- Launch targeted re-engagement email campaign\n- Create escalation workflow for declining NPS responses\n\n**Medium Term (30 Days)**\n- Deploy improved onboarding flow for new customers\n- Establish quarterly business reviews for enterprise accounts\n- Build self-serve knowledge base to reduce support friction\n\nWould you like me to create tasks in Zentrix for any of these items?' },
];

const LinearZentrixAI: React.FC = () => {
  const [messages] = useState(SAMPLE_MESSAGES);
  const [inputValue, setInputValue] = useState('');

  return (
    <LinearLayout activeLabel="Zentrix AI" searchPlaceholder="Search conversations...">
      {({ t, theme }) => (
        <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 180px)' }}>
          {/* ── Header ── */}
          <div className="mb-6">
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>
              <Sparkles size={20} className="inline mr-2" style={{ color: t.accent }} />
              Zentrix AI
            </h1>
            <p className="text-[13px]" style={{ color: t.textMuted }}>AI-powered insights and analysis for your business</p>
          </div>

          {/* ── Chat messages ── */}
          <div className="flex-1 space-y-4 mb-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: t.accent + '20', color: t.accent }}>
                    <Sparkles size={14} />
                  </div>
                )}
                <div
                  className="max-w-[75%] rounded-[8px] px-4 py-3"
                  style={{
                    backgroundColor: msg.role === 'user' ? t.accent + '15' : t.cardBg,
                    border: `1px solid ${msg.role === 'user' ? t.accent + '30' : t.border}`,
                  }}
                >
                  <div className="text-[13px] whitespace-pre-wrap leading-relaxed" style={{ color: t.textPrimary }}>
                    {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, pi) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={pi} style={{ color: t.textPrimary }}>{part.slice(2, -2)}</strong>;
                      }
                      return <span key={pi}>{part}</span>;
                    })}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: t.avatarBg, color: t.accent }}>
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Input ── */}
          <div className="sticky bottom-0 pb-2">
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-[8px] border"
              style={{ borderColor: t.border, backgroundColor: t.cardBg }}
            >
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Ask Zentrix AI anything..."
                className="flex-1 bg-transparent border-none outline-none text-[13px]"
                style={{ color: t.textPrimary }}
              />
              <button
                className="flex items-center justify-center w-8 h-8 rounded-[6px] transition-colors"
                style={{ backgroundColor: inputValue ? t.accent : t.hover, color: inputValue ? '#fff' : t.textMuted }}
              >
                <Send size={14} />
              </button>
            </div>
            <div className="text-[11px] mt-2 text-center" style={{ color: t.textMuted }}>
              Zentrix AI uses your company data to provide contextual insights. Read-only in prototype mode.
            </div>
          </div>

          <FooterHint t={t} />
        </div>
      )}
    </LinearLayout>
  );
};

export default LinearZentrixAI;
