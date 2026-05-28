import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { LinearLayout, LoadingSkeleton, FooterHint } from './LinearLayout';
import { usePeople, formatDate } from './usePrototypeData';

const PERMISSION_COLORS: Record<string, string> = {
  owner: 'bg-purple-500/20 text-purple-400',
  admin: 'bg-primary/20 text-blue-400',
  director: 'bg-emerald-500/20 text-emerald-400',
  manager: 'bg-cyan-500/20 text-cyan-400',
  member: 'bg-gray-500/20 text-muted-foreground',
};

const LinearPeople: React.FC = () => {
  const { people, loading } = usePeople();
  const [roleFilter, setRoleFilter] = useState('All');

  const roles = ['All', ...new Set(people.map(p => p.permission_level).filter(Boolean))];

  const filteredPeople = people.filter(p => {
    if (roleFilter !== 'All' && p.permission_level !== roleFilter) return false;
    return true;
  });

  return (
    <LinearLayout activeLabel="People" searchPlaceholder="Search people...">
      {({ t, theme }) => {
        if (loading) return <LoadingSkeleton t={t} rows={8} />;

        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] mb-1" style={{ color: t.textPrimary }}>People</h1>
                <p className="text-[13px]" style={{ color: t.textMuted }}>{people.length} members</p>
              </div>
            </div>

            {/* ── Role filter tabs ── */}
            <div className="flex items-center gap-1 mb-4 flex-wrap">
              {roles.map(role => {
                const isActive = roleFilter === role;
                return (
                  <button key={role} onClick={() => setRoleFilter(role)} className="px-3 py-1.5 rounded-[5px] text-[12px] font-medium transition-colors capitalize" style={{ backgroundColor: isActive ? t.active : 'transparent', color: isActive ? t.textPrimary : t.textMuted }} onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = t.hover; }} onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    {role}
                  </button>
                );
              })}
            </div>

            {/* ── People grid ── */}
            <div className="grid grid-cols-3 gap-3">
              {filteredPeople.length === 0 && (
                <div className="col-span-3 text-center py-12 text-[13px]" style={{ color: t.textMuted }}>No people found</div>
              )}
              {filteredPeople.map(person => (
                <div key={person.id} className="rounded-[6px] border p-4 transition-colors cursor-pointer" style={{ borderColor: t.border, backgroundColor: t.cardBg }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hover)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = t.cardBg)}>
                  <div className="flex items-center gap-3 mb-3">
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-medium" style={{ backgroundColor: t.avatarBg, color: t.accent }}>
                        {person.initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium truncate" style={{ color: t.textPrimary }}>{person.full_name}</div>
                      <div className="text-[11px] truncate" style={{ color: t.textMuted }}>{person.role}</div>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-[2px] text-[10px] capitalize ${PERMISSION_COLORS[person.permission_level] || 'bg-gray-500/20 text-muted-foreground'}`}>
                      {person.permission_level}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: t.textMuted }}>
                      <Mail size={10} />
                      <span className="truncate">{person.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: t.textMuted }}>
                      <span>Joined {formatDate(person.joined_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <FooterHint t={t} />
          </>
        );
      }}
    </LinearLayout>
  );
};

export default LinearPeople;
