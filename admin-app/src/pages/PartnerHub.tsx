import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Loader2,
  Lock,
  LayoutTemplate,
  Pencil,
  Play,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { toast } from 'sonner';

type PartnerStatus = 'not_started' | 'submitted' | 'in_review' | 'certified';
type PartnerTab = 'clients' | 'configuration' | 'templates' | 'referral_links' | 'commissions';
type PartnerWorkspaceModule = 'language' | 'knowledge' | 'vision_goals' | 'meetings' | 'one_on_one' | 'mastery';

interface PartnerApplication {
  id: string;
  company_id: string;
  user_id: string;
  status: PartnerStatus;
  practice_name: string;
  website: string | null;
  client_count: number | null;
  business_model: string | null;
  implementation_focus: string | null;
  notes: string | null;
  submitted_at: string | null;
  companies?: {
    name: string | null;
  } | null;
}

interface PartnerReferralLink {
  id: string;
  company_id: string;
  application_id: string | null;
  link_code: string;
  destination_url: string;
  is_active: boolean;
}

interface PartnerCommissionEvent {
  id: string;
  company_id: string;
  referral_link_id: string | null;
  referred_company_id?: string | null;
  referred_user_id?: string | null;
  event_type: string;
  amount_cents: number;
  commission_cents: number;
  payout_status: string;
  occurred_at?: string;
}

interface PartnerClient {
  id: string;
  partner_company_id: string;
  referral_link_id: string | null;
  client_company_id: string | null;
  client_user_id: string | null;
  client_name: string;
  client_email: string | null;
  status: 'lead' | 'onboarding' | 'active' | 'paused' | 'churned';
  implementation_stage: 'invited' | 'workspace_created' | 'kickoff_scheduled' | 'in_implementation' | 'live';
  subscription_tier: string | null;
  mrr_cents: number;
  commission_rate: number;
  first_attributed_at: string;
  last_activity_at: string | null;
  notes: string | null;
}

interface PartnerTemplate {
  id: string;
  name: string;
  meeting_title: string | null;
  description: string | null;
  sections: Array<{ id?: string; title?: string; type?: string; duration?: number }>;
  shared: boolean;
  updated_at: string;
}

interface PartnerWorkspaceOverride {
  id: string;
  partner_client_id: string;
  partner_company_id: string;
  module: PartnerWorkspaceModule;
  draft_config: {
    notes?: string;
  };
  published_config: {
    notes?: string;
  };
  published_at: string | null;
  published_by?: string | null;
  created_by?: string | null;
  updated_at: string;
}

const workspaceTabs: Array<{ id: PartnerTab; label: string }> = [
  { id: 'clients', label: 'Clients' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'templates', label: 'Templates' },
  { id: 'referral_links', label: 'Referral Links' },
  { id: 'commissions', label: 'Commissions' },
];

const workspaceModules: Array<{
  id: PartnerWorkspaceModule;
  label: string;
  description: string;
  placeholder: string;
}> = [
  {
    id: 'language',
    label: 'Language',
    description: 'Client-facing terminology, tone, operating vocabulary, and naming conventions.',
    placeholder: 'Example: Replace Rocks with Quarterly Priorities. Use direct, low-jargon language...',
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    description: 'Context the partner wants available while operating this client workspace.',
    placeholder: 'Add company context, onboarding notes, operating constraints, industry details...',
  },
  {
    id: 'vision_goals',
    label: 'Vision + Goals',
    description: 'Configuration notes for company vision, annual goals, quarterly goals, and success metrics.',
    placeholder: 'Define goal cadence, default scorecard themes, leadership priorities...',
  },
  {
    id: 'meetings',
    label: 'Meetings',
    description: 'Meeting agenda visibility and client-specific meeting preferences.',
    placeholder: 'List published agendas, hidden agendas, cadence rules, section preferences...',
  },
  {
    id: 'one_on_one',
    label: '1-on-1',
    description: 'Manager/team-member question bank preferences and coaching prompts.',
    placeholder: 'Add manager prompts, team-member prompts, cadence notes, review questions...',
  },
  {
    id: 'mastery',
    label: 'Mastery',
    description: 'Client progress notes and partner assessment checkpoints.',
    placeholder: 'Track maturity level, training completion, gaps, next certification milestones...',
  },
];

const partnerStats = [
  { label: 'Commission', detail: 'Lifetime', value: '30%' },
  { label: 'Year-one bonus', detail: '', value: '+10%' },
  { label: 'Payout cadence', detail: '', value: 'NET-30' },
  { label: 'Active partners', detail: '', value: '48' },
  { label: 'Avg. clients / partner', detail: '', value: '11' },
  { label: 'Top-quartile MRR', detail: '', value: '$6.2K' },
];

const statusLabels: Record<PartnerStatus, string> = {
  not_started: 'Not started',
  submitted: 'Submitted',
  in_review: 'In review',
  certified: 'Certified',
};

const statusStep: Record<PartnerStatus, number> = {
  not_started: 0,
  submitted: 1,
  in_review: 2,
  certified: 4,
};

const reviewStatuses: PartnerStatus[] = ['submitted', 'in_review', 'certified'];

const roadmapItems = [
  { label: 'Domain & auth foundation', status: 'Ready', icon: ShieldCheck },
  { label: 'Certification gating', status: 'Current', icon: Sparkles },
  { label: 'Templates resolver', status: 'Next', icon: FileText },
  { label: 'Coach Hub bootstrap', status: 'Planned', icon: BookOpen },
];

const clientStatusLabels: Record<PartnerClient['status'], string> = {
  lead: 'Lead',
  onboarding: 'Onboarding',
  active: 'Active',
  paused: 'Paused',
  churned: 'Churned',
};

const implementationStageLabels: Record<PartnerClient['implementation_stage'], string> = {
  invited: 'Invited',
  workspace_created: 'Workspace created',
  kickoff_scheduled: 'Kickoff scheduled',
  in_implementation: 'In implementation',
  live: 'Live',
};

const getCertificationSteps = (status: PartnerStatus) => [
  {
    number: '01',
    title: 'Submit application',
    description: 'Tell us about your practice and how you currently operate. Reviewed weekly.',
    duration: '5 min',
    action: status === 'not_started' ? 'Start application' : 'Submitted',
    locked: false,
    complete: status !== 'not_started',
  },
  {
    number: '02',
    title: 'Complete the certification',
    description: 'Self-paced course on the Zentrix operating model: execution, strategy, rhythm, and partner tooling.',
    duration: '~8 hours',
    action: status === 'certified' ? 'Complete' : 'Unlocks after review',
    locked: status !== 'certified',
    complete: status === 'certified',
  },
  {
    number: '03',
    title: 'Pass the practicum',
    description: 'Build a custom template for a real scenario. Reviewed by a Zentrix-certified partner.',
    duration: '~2 hours',
    action: status === 'certified' ? 'Complete' : 'Unlocks after step 2',
    locked: status !== 'certified',
    complete: status === 'certified',
  },
  {
    number: '04',
    title: 'Activation',
    description: 'Partner Hub goes live, referral link is minted, and you can start onboarding clients.',
    duration: 'Same day',
    action: status === 'certified' ? 'Active' : 'Unlocks after step 3',
    locked: status !== 'certified',
    complete: status === 'certified',
  },
];

export default function PartnerHub() {
  const { user } = useAuth();
  const { currentCompany, loading: companyLoading } = useMultiCompany();
  const navigate = useNavigate();
  const [application, setApplication] = useState<PartnerApplication | null>(null);
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [partnerClients, setPartnerClients] = useState<PartnerClient[]>([]);
  const [partnerTemplates, setPartnerTemplates] = useState<PartnerTemplate[]>([]);
  const [workspaceOverrides, setWorkspaceOverrides] = useState<PartnerWorkspaceOverride[]>([]);
  const [isPartnerClientsReady, setIsPartnerClientsReady] = useState(true);
  const [isPartnerClientsSandbox, setIsPartnerClientsSandbox] = useState(false);
  const [isWorkspaceOverridesSandbox, setIsWorkspaceOverridesSandbox] = useState(false);
  const [referralLinks, setReferralLinks] = useState<PartnerReferralLink[]>([]);
  const [commissionEvents, setCommissionEvents] = useState<PartnerCommissionEvent[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);
  const [isOverridesLoading, setIsOverridesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [isCreatingReferralLink, setIsCreatingReferralLink] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [showApplication, setShowApplication] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [selectedTemplateClientId, setSelectedTemplateClientId] = useState('');
  const [selectedConfigClientId, setSelectedConfigClientId] = useState('');
  const [selectedConfigModule, setSelectedConfigModule] = useState<PartnerWorkspaceModule>('language');
  const [overrideDraft, setOverrideDraft] = useState('');
  const [activeTab, setActiveTab] = useState<PartnerTab>('clients');
  const [form, setForm] = useState({
    practiceName: '',
    website: '',
    clientCount: '',
    businessModel: '',
    implementationFocus: '',
    notes: '',
  });
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    status: 'lead' as PartnerClient['status'],
    implementationStage: 'invited' as PartnerClient['implementation_stage'],
    subscriptionTier: '',
    mrr: '',
    notes: '',
  });
  const [clientEditForm, setClientEditForm] = useState(clientForm);

  const status: PartnerStatus = application?.status || 'not_started';
  const completedSteps = statusStep[status];
  const certificationSteps = useMemo(() => getCertificationSteps(status), [status]);
  const canAccessWorkspace = status === 'certified';
  const commissionSummary = useMemo(() => {
    return commissionEvents.reduce(
      (summary, event) => {
        summary.revenueCents += event.amount_cents || 0;
        summary.commissionCents += event.commission_cents || 0;
        if (event.payout_status === 'paid') {
          summary.paidCents += event.commission_cents || 0;
        }
        if (event.payout_status === 'pending' || event.payout_status === 'approved') {
          summary.pendingCents += event.commission_cents || 0;
        }
        return summary;
      },
      { revenueCents: 0, commissionCents: 0, paidCents: 0, pendingCents: 0 }
    );
  }, [commissionEvents]);

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(cents / 100);

  const formatDate = (value?: string | null) => {
    if (!value) return 'Not yet';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  };

  const getReferralUrl = (link: PartnerReferralLink) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://zentrixos.com';
    return `${origin}/signup?partner=${encodeURIComponent(link.link_code)}`;
  };

  const getPartnerClientsSandboxKey = () => {
    if (!currentCompany?.id) return null;
    return `partner_clients_sandbox:${currentCompany.id}`;
  };

  const loadPartnerClientsSandbox = () => {
    const key = getPartnerClientsSandboxKey();
    if (!key || typeof window === 'undefined') return [];

    try {
      return JSON.parse(window.localStorage.getItem(key) || '[]') as PartnerClient[];
    } catch {
      return [];
    }
  };

  const savePartnerClientsSandbox = (clients: PartnerClient[]) => {
    const key = getPartnerClientsSandboxKey();
    if (!key || typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(clients));
  };

  const getWorkspaceOverridesSandboxKey = (clientId?: string) => {
    if (!currentCompany?.id || !clientId) return null;
    return `partner_workspace_overrides_sandbox:${currentCompany.id}:${clientId}`;
  };

  const loadWorkspaceOverridesSandbox = (clientId: string) => {
    const key = getWorkspaceOverridesSandboxKey(clientId);
    if (!key || typeof window === 'undefined') return [];

    try {
      return JSON.parse(window.localStorage.getItem(key) || '[]') as PartnerWorkspaceOverride[];
    } catch {
      return [];
    }
  };

  const saveWorkspaceOverridesSandbox = (clientId: string, overrides: PartnerWorkspaceOverride[]) => {
    const key = getWorkspaceOverridesSandboxKey(clientId);
    if (!key || typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(overrides));
  };

  const selectedConfigClient = partnerClients.find((client) => client.id === selectedConfigClientId) || null;
  const selectedOverride = workspaceOverrides.find((override) => override.module === selectedConfigModule) || null;
  const selectedModuleMeta = workspaceModules.find((module) => module.id === selectedConfigModule) || workspaceModules[0];

  const buildLinkCode = () => {
    const source = application?.practice_name || currentCompany?.name || 'partner';
    const slug = source
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 28);
    return `${slug || 'partner'}-${Math.random().toString(36).slice(2, 7)}`;
  };

  const loadPartnerWorkspace = async () => {
    if (!currentCompany?.id) return;

    const [{ data: clients, error: clientsError }, { data: links }, { data: events }] = await Promise.all([
      (supabase as any)
        .from('partner_clients')
        .select('*')
        .eq('partner_company_id', currentCompany.id)
        .order('first_attributed_at', { ascending: false }),
      (supabase as any)
        .from('partner_referral_links')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false }),
      (supabase as any)
        .from('partner_commission_events')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('occurred_at', { ascending: false }),
    ]);

    if (clientsError) {
      setIsPartnerClientsReady(true);
      setIsPartnerClientsSandbox(true);
      setPartnerClients(loadPartnerClientsSandbox());
    } else {
      setIsPartnerClientsReady(true);
      setIsPartnerClientsSandbox(false);
      setPartnerClients(clients || []);
    }
    setReferralLinks(links || []);
    setCommissionEvents(events || []);
  };

  const loadPartnerTemplates = async () => {
    if (!currentCompany?.id) return;

    setIsTemplatesLoading(true);
    const { data, error } = await (supabase as any)
      .from('meeting_templates')
      .select('id, name, meeting_title, description, sections, shared, updated_at')
      .eq('company_id', currentCompany.id)
      .order('updated_at', { ascending: false });

    if (error) {
      setPartnerTemplates([]);
      setIsTemplatesLoading(false);
      return;
    }

    setPartnerTemplates((data || []) as PartnerTemplate[]);
    setIsTemplatesLoading(false);
  };

  const loadWorkspaceOverrides = async (clientId: string) => {
    if (!currentCompany?.id || !clientId) return;

    setIsOverridesLoading(true);
    const { data, error } = await (supabase as any)
      .from('partner_workspace_overrides')
      .select('*')
      .eq('partner_company_id', currentCompany.id)
      .eq('partner_client_id', clientId)
      .order('updated_at', { ascending: false });

    if (error) {
      setIsWorkspaceOverridesSandbox(true);
      setWorkspaceOverrides(loadWorkspaceOverridesSandbox(clientId));
      setIsOverridesLoading(false);
      return;
    }

    setIsWorkspaceOverridesSandbox(false);
    setWorkspaceOverrides((data || []) as PartnerWorkspaceOverride[]);
    setIsOverridesLoading(false);
  };

  const loadAdminApplications = async () => {
    setIsAdminLoading(true);
    const { data, error } = await (supabase as any)
      .from('partner_applications')
      .select('*, companies(name)')
      .order('submitted_at', { ascending: false });

    if (error) {
      setApplications([]);
      setIsAdminLoading(false);
      return;
    }

    setApplications(data || []);
    setIsAdminLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    const loadApplication = async () => {
      if (companyLoading) return;

      if (!user || !currentCompany?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const [{ data, error }, { data: adminData }] = await Promise.all([
        (supabase as any)
          .from('partner_applications')
          .select('*')
          .eq('company_id', currentCompany.id)
          .maybeSingle(),
        (supabase as any).rpc('is_super_admin'),
      ]);

      if (!isMounted) return;

      const hasAdminAccess = Boolean(adminData);
      setIsSuperAdmin(hasAdminAccess);

      if (error) {
        setApplication(null);
        setIsLoading(false);
        if (hasAdminAccess) {
          await loadAdminApplications();
        }
        return;
      }

      setApplication(data);
      if (data) {
        setForm({
          practiceName: data.practice_name || '',
          website: data.website || '',
          clientCount: data.client_count ? String(data.client_count) : '',
          businessModel: data.business_model || '',
          implementationFocus: data.implementation_focus || '',
          notes: data.notes || '',
        });
      }
      setIsLoading(false);
      if (hasAdminAccess) {
        await loadAdminApplications();
      }
      if (data?.status === 'certified') {
        await loadPartnerWorkspace();
        await loadPartnerTemplates();
      }
    };

    loadApplication();

    return () => {
      isMounted = false;
    };
  }, [companyLoading, currentCompany?.id, user]);

  useEffect(() => {
    if (canAccessWorkspace && currentCompany?.id) {
      loadPartnerWorkspace();
      loadPartnerTemplates();
    }
  }, [canAccessWorkspace, currentCompany?.id]);

  useEffect(() => {
    if (!selectedConfigClientId) {
      setWorkspaceOverrides([]);
      setOverrideDraft('');
      return;
    }

    loadWorkspaceOverrides(selectedConfigClientId);
  }, [selectedConfigClientId, currentCompany?.id]);

  useEffect(() => {
    const nextOverride = workspaceOverrides.find((override) => override.module === selectedConfigModule);
    setOverrideDraft(nextOverride?.draft_config?.notes || '');
  }, [workspaceOverrides, selectedConfigModule]);

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !currentCompany?.id) {
      toast.error('Company context is still loading.');
      return;
    }

    if (!form.practiceName.trim() || !form.businessModel.trim() || !form.implementationFocus.trim()) {
      toast.error('Complete the required fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      company_id: currentCompany.id,
      user_id: user.id,
      status: 'submitted',
      practice_name: form.practiceName.trim(),
      website: form.website.trim() || null,
      client_count: form.clientCount ? Number(form.clientCount) : null,
      business_model: form.businessModel.trim(),
      implementation_focus: form.implementationFocus.trim(),
      notes: form.notes.trim() || null,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase as any)
      .from('partner_applications')
      .upsert(payload, { onConflict: 'company_id' })
      .select('*')
      .single();

    if (error) {
      setIsSubmitting(false);
      toast.error('Could not submit the application yet.');
      return;
    }

    setApplication(data);
    setShowApplication(false);
    setIsSubmitting(false);
    toast.success('Partner application submitted.');
  };

  const updateApplicationStatus = async (applicationId: string, nextStatus: Exclude<PartnerStatus, 'not_started'>) => {
    if (!isSuperAdmin || !user?.id) return;

    setReviewingId(applicationId);
    const payload = {
      status: nextStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase as any)
      .from('partner_applications')
      .update(payload)
      .eq('id', applicationId)
      .select('*, companies(name)')
      .single();

    if (error) {
      setReviewingId(null);
      toast.error('Could not update partner status.');
      return;
    }

    setApplications((current) => current.map((item) => (item.id === applicationId ? data : item)));
    if (data.company_id === currentCompany?.id) {
      setApplication(data);
      if (data.status === 'certified') {
        await loadPartnerWorkspace();
      }
    }
    setReviewingId(null);
    toast.success(`Partner status updated to ${statusLabels[nextStatus]}.`);
  };

  const createReferralLink = async () => {
    if (!user || !currentCompany?.id || !application?.id || !canAccessWorkspace) return;

    setIsCreatingReferralLink(true);
    const linkCode = buildLinkCode();
    const destinationUrl = typeof window !== 'undefined' ? `${window.location.origin}/signup` : 'https://zentrixos.com/signup';

    const { data, error } = await (supabase as any)
      .from('partner_referral_links')
      .insert({
        company_id: currentCompany.id,
        application_id: application.id,
        link_code: linkCode,
        destination_url: destinationUrl,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error) {
      setIsCreatingReferralLink(false);
      toast.error('Could not create referral link.');
      return;
    }

    setReferralLinks((current) => [data, ...current]);
    setIsCreatingReferralLink(false);
    toast.success('Referral link created.');
  };

  const createPartnerClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentCompany?.id || !canAccessWorkspace) return;

    if (!clientForm.name.trim()) {
      toast.error('Client name is required.');
      return;
    }

    setIsCreatingClient(true);
    if (isPartnerClientsSandbox) {
      const now = new Date().toISOString();
      const sandboxClient: PartnerClient = {
        id: `sandbox-${Date.now()}`,
        partner_company_id: currentCompany.id,
        referral_link_id: referralLinks[0]?.id || null,
        client_company_id: null,
        client_user_id: null,
        client_name: clientForm.name.trim(),
        client_email: clientForm.email.trim() || null,
        status: clientForm.status,
        implementation_stage: clientForm.implementationStage,
        subscription_tier: clientForm.subscriptionTier.trim() || null,
        mrr_cents: clientForm.mrr ? Math.round(Number(clientForm.mrr) * 100) : 0,
        commission_rate: 30,
        first_attributed_at: now,
        last_activity_at: now,
        notes: clientForm.notes.trim() || null,
      };
      const nextClients = [sandboxClient, ...partnerClients];
      savePartnerClientsSandbox(nextClients);
      setPartnerClients(nextClients);
      setClientForm({
        name: '',
        email: '',
        status: 'lead',
        implementationStage: 'invited',
        subscriptionTier: '',
        mrr: '',
        notes: '',
      });
      setShowClientForm(false);
      setIsCreatingClient(false);
      toast.success('Partner client added to staging sandbox.');
      return;
    }

    const { data, error } = await (supabase as any)
      .from('partner_clients')
      .insert({
        partner_company_id: currentCompany.id,
        referral_link_id: referralLinks[0]?.id || null,
        client_name: clientForm.name.trim(),
        client_email: clientForm.email.trim() || null,
        status: clientForm.status,
        implementation_stage: clientForm.implementationStage,
        subscription_tier: clientForm.subscriptionTier.trim() || null,
        mrr_cents: clientForm.mrr ? Math.round(Number(clientForm.mrr) * 100) : 0,
        notes: clientForm.notes.trim() || null,
        last_activity_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      setIsCreatingClient(false);
      toast.error('Could not add partner client.');
      return;
    }

    setPartnerClients((current) => [data, ...current]);
    setClientForm({
      name: '',
      email: '',
      status: 'lead',
      implementationStage: 'invited',
      subscriptionTier: '',
      mrr: '',
      notes: '',
    });
    setShowClientForm(false);
    setIsCreatingClient(false);
    toast.success('Partner client added.');
  };

  const startEditingClient = (client: PartnerClient) => {
    setEditingClientId(client.id);
    setClientEditForm({
      name: client.client_name,
      email: client.client_email || '',
      status: client.status,
      implementationStage: client.implementation_stage,
      subscriptionTier: client.subscription_tier || '',
      mrr: client.mrr_cents ? String(Math.round(client.mrr_cents / 100)) : '',
      notes: client.notes || '',
    });
  };

  const updatePartnerClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingClientId || !currentCompany?.id || !canAccessWorkspace) return;

    if (!clientEditForm.name.trim()) {
      toast.error('Client name is required.');
      return;
    }

    setIsCreatingClient(true);
    const payload = {
      client_name: clientEditForm.name.trim(),
      client_email: clientEditForm.email.trim() || null,
      status: clientEditForm.status,
      implementation_stage: clientEditForm.implementationStage,
      subscription_tier: clientEditForm.subscriptionTier.trim() || null,
      mrr_cents: clientEditForm.mrr ? Math.round(Number(clientEditForm.mrr) * 100) : 0,
      notes: clientEditForm.notes.trim() || null,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isPartnerClientsSandbox) {
      const nextClients = partnerClients.map((client) =>
        client.id === editingClientId ? { ...client, ...payload } : client
      );
      savePartnerClientsSandbox(nextClients);
      setPartnerClients(nextClients);
      setEditingClientId(null);
      setIsCreatingClient(false);
      toast.success('Partner client updated in staging sandbox.');
      return;
    }

    const { data, error } = await (supabase as any)
      .from('partner_clients')
      .update(payload)
      .eq('id', editingClientId)
      .eq('partner_company_id', currentCompany.id)
      .select('*')
      .single();

    if (error) {
      setIsCreatingClient(false);
      toast.error('Could not update partner client.');
      return;
    }

    setPartnerClients((current) => current.map((client) => (client.id === editingClientId ? data : client)));
    setEditingClientId(null);
    setIsCreatingClient(false);
    toast.success('Partner client updated.');
  };

  const applyTemplateToClient = async (template: PartnerTemplate) => {
    if (!selectedTemplateClientId) {
      toast.error('Select a client before applying a template.');
      return;
    }

    const client = partnerClients.find((item) => item.id === selectedTemplateClientId);
    if (!client || !currentCompany?.id) return;

    const now = new Date().toISOString();
    const templateNote = `Applied template "${template.name}" on ${formatDate(now)}.`;
    const nextNotes = client.notes ? `${client.notes}\n${templateNote}` : templateNote;
    const payload = {
      implementation_stage: client.implementation_stage === 'live' ? client.implementation_stage : 'in_implementation',
      notes: nextNotes,
      last_activity_at: now,
      updated_at: now,
    };

    if (isPartnerClientsSandbox) {
      const nextClients = partnerClients.map((item) =>
        item.id === client.id ? { ...item, ...payload } : item
      );
      savePartnerClientsSandbox(nextClients);
      setPartnerClients(nextClients);
      setActiveTab('clients');
      toast.success('Template assigned to client in staging sandbox.');
      return;
    }

    const { data, error } = await (supabase as any)
      .from('partner_clients')
      .update(payload)
      .eq('id', client.id)
      .eq('partner_company_id', currentCompany.id)
      .select('*')
      .single();

    if (error) {
      toast.error('Could not assign template to client.');
      return;
    }

    setPartnerClients((current) => current.map((item) => (item.id === client.id ? data : item)));
    setActiveTab('clients');
    toast.success(`Template assigned to ${client.client_name}.`);
  };

  const openClientConfiguration = (client: PartnerClient) => {
    setSelectedConfigClientId(client.id);
    setActiveTab('configuration');
    window.setTimeout(() => {
      document.getElementById('partner-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const saveWorkspaceOverride = async (publish = false) => {
    if (!selectedConfigClient || !currentCompany?.id || !user?.id) {
      toast.error('Select a client before saving configuration.');
      return;
    }

    setIsSavingOverride(true);
    const now = new Date().toISOString();
    const draftConfig = { notes: overrideDraft.trim() };
    const existingOverride = workspaceOverrides.find((override) => override.module === selectedConfigModule);
    const payload = {
      partner_client_id: selectedConfigClient.id,
      partner_company_id: currentCompany.id,
      module: selectedConfigModule,
      draft_config: draftConfig,
      published_config: publish ? draftConfig : existingOverride?.published_config || {},
      published_at: publish ? now : existingOverride?.published_at || null,
      published_by: publish ? user.id : existingOverride?.published_by || null,
      created_by: existingOverride?.created_by || user.id,
      updated_at: now,
    };

    if (isWorkspaceOverridesSandbox) {
      const sandboxOverride: PartnerWorkspaceOverride = {
        id: existingOverride?.id || `sandbox-${selectedConfigModule}-${Date.now()}`,
        ...payload,
      };
      const nextOverrides = existingOverride
        ? workspaceOverrides.map((override) => (override.module === selectedConfigModule ? sandboxOverride : override))
        : [sandboxOverride, ...workspaceOverrides];
      saveWorkspaceOverridesSandbox(selectedConfigClient.id, nextOverrides);
      setWorkspaceOverrides(nextOverrides);
      setIsSavingOverride(false);
      toast.success(publish ? 'Configuration published in staging sandbox.' : 'Draft saved in staging sandbox.');
      return;
    }

    const { data, error } = await (supabase as any)
      .from('partner_workspace_overrides')
      .upsert(payload, { onConflict: 'partner_client_id,module' })
      .select('*')
      .single();

    if (error) {
      setIsSavingOverride(false);
      toast.error('Could not save workspace configuration.');
      return;
    }

    setWorkspaceOverrides((current) => {
      const exists = current.some((override) => override.module === selectedConfigModule);
      return exists
        ? current.map((override) => (override.module === selectedConfigModule ? data : override))
        : [data, ...current];
    });
    setIsSavingOverride(false);
    toast.success(publish ? 'Configuration published.' : 'Draft saved.');
  };

  const copyReferralLink = async (link: PartnerReferralLink) => {
    const url = getReferralUrl(link);
    await navigator.clipboard.writeText(url);
    toast.success('Referral link copied.');
  };

  const openOverview = () => {
    toast.info('Overview video will be connected in the next Partner Hub pass.');
  };

  const selectWorkspaceTab = (tabId: PartnerTab) => {
    setActiveTab(tabId);
    window.setTimeout(() => {
      document.getElementById('partner-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const statusText = isLoading ? 'Loading' : statusLabels[status];
  const activeApplications = applications.filter((item) => item.status !== 'certified').length;
  const trackedClients = partnerClients.length;
  const activeClients = partnerClients.filter((client) => client.status === 'active').length;
  const onboardingClients = partnerClients.filter((client) => client.status === 'onboarding').length;
  const totalClientMrr = partnerClients.reduce((sum, client) => sum + (client.mrr_cents || 0), 0);
  const fallbackTemplateRows = [
    {
      title: 'Executive weekly rhythm',
      description: 'Default weekly meeting, metrics, issues, and action review structure.',
      status: 'Starter',
    },
    {
      title: 'Client onboarding workspace',
      description: 'Baseline goals, org chart, tasks, and meeting cadence for new partner clients.',
      status: 'Starter',
    },
    {
      title: 'Strategy reset sprint',
      description: 'Short implementation sequence for scorecard, priorities, and operating cadence.',
      status: 'Starter',
    },
  ];

  const renderWorkspacePanel = () => {
    if (!canAccessWorkspace) return null;

    if (activeTab === 'clients') {
      return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[8px] border border-[#e2ded8] bg-white p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b8792]">
                  Clients
                </p>
                <h3 className="mt-2 text-base font-semibold text-[#202027]">Partner-managed accounts</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  className="h-9 gap-2 rounded-[6px] bg-[#27233f] text-xs text-white hover:bg-[#332d55]"
                  onClick={() => setShowClientForm((value) => !value)}
                  disabled={!isPartnerClientsReady}
                >
                  <Users className="h-3.5 w-3.5" />
                  Add client
                </Button>
              </div>
            </div>
            {isPartnerClientsSandbox && (
              <div className="mb-4 rounded-[6px] border border-[#d8d4cc] bg-[#fbfaf7] p-4 text-sm leading-6 text-[#77737f]">
                Staging sandbox is active for client testing. Records added here stay in this browser until the partner_clients database migration is applied.
              </div>
            )}
            {showClientForm && (
              <form onSubmit={createPartnerClient} className="mb-4 grid gap-3 rounded-[8px] border border-[#e2ded8] bg-[#fbfaf7] p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client name</Label>
                  <Input
                    id="clientName"
                    value={clientForm.name}
                    onChange={(event) => setClientForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Client company"
                    className="rounded-[6px] border-[#d8d4cc] bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Client email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={clientForm.email}
                    onChange={(event) => setClientForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="client@company.com"
                    className="rounded-[6px] border-[#d8d4cc] bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientStatus">Status</Label>
                  <select
                    id="clientStatus"
                    value={clientForm.status}
                    onChange={(event) => setClientForm((current) => ({ ...current, status: event.target.value as PartnerClient['status'] }))}
                    className="h-10 w-full rounded-[6px] border border-[#d8d4cc] bg-white px-3 text-sm text-[#202027]"
                  >
                    {Object.entries(clientStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="implementationStage">Implementation stage</Label>
                  <select
                    id="implementationStage"
                    value={clientForm.implementationStage}
                    onChange={(event) => setClientForm((current) => ({ ...current, implementationStage: event.target.value as PartnerClient['implementation_stage'] }))}
                    className="h-10 w-full rounded-[6px] border border-[#d8d4cc] bg-white px-3 text-sm text-[#202027]"
                  >
                    {Object.entries(implementationStageLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscriptionTier">Subscription tier</Label>
                  <Input
                    id="subscriptionTier"
                    value={clientForm.subscriptionTier}
                    onChange={(event) => setClientForm((current) => ({ ...current, subscriptionTier: event.target.value }))}
                    placeholder="Pro, Scale, Enterprise"
                    className="rounded-[6px] border-[#d8d4cc] bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientMrr">MRR</Label>
                  <Input
                    id="clientMrr"
                    type="number"
                    min="0"
                    step="1"
                    value={clientForm.mrr}
                    onChange={(event) => setClientForm((current) => ({ ...current, mrr: event.target.value }))}
                    placeholder="0"
                    className="rounded-[6px] border-[#d8d4cc] bg-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="clientNotes">Notes</Label>
                  <Textarea
                    id="clientNotes"
                    value={clientForm.notes}
                    onChange={(event) => setClientForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Implementation notes, next step, owner..."
                    className="min-h-20 rounded-[6px] border-[#d8d4cc] bg-white"
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-[6px] border-[#d8d4cc] bg-white text-xs"
                    onClick={() => setShowClientForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-9 gap-2 rounded-[6px] bg-[#27233f] text-xs text-white hover:bg-[#332d55]"
                    disabled={isCreatingClient}
                  >
                    {isCreatingClient && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save client
                  </Button>
                </div>
              </form>
            )}
            {partnerClients.length > 0 ? (
              <div className="grid gap-3">
                {partnerClients.map((client) => (
                  <div key={client.id} className="rounded-[6px] border border-[#ebe7e2] bg-[#fbfaf7] p-4">
                    {editingClientId === client.id ? (
                      <form onSubmit={updatePartnerClient} className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`edit-client-name-${client.id}`}>Client name</Label>
                          <Input
                            id={`edit-client-name-${client.id}`}
                            value={clientEditForm.name}
                            onChange={(event) => setClientEditForm((current) => ({ ...current, name: event.target.value }))}
                            className="rounded-[6px] border-[#d8d4cc] bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-client-email-${client.id}`}>Client email</Label>
                          <Input
                            id={`edit-client-email-${client.id}`}
                            type="email"
                            value={clientEditForm.email}
                            onChange={(event) => setClientEditForm((current) => ({ ...current, email: event.target.value }))}
                            className="rounded-[6px] border-[#d8d4cc] bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-client-status-${client.id}`}>Status</Label>
                          <select
                            id={`edit-client-status-${client.id}`}
                            value={clientEditForm.status}
                            onChange={(event) => setClientEditForm((current) => ({ ...current, status: event.target.value as PartnerClient['status'] }))}
                            className="h-10 w-full rounded-[6px] border border-[#d8d4cc] bg-white px-3 text-sm text-[#202027]"
                          >
                            {Object.entries(clientStatusLabels).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-client-stage-${client.id}`}>Implementation stage</Label>
                          <select
                            id={`edit-client-stage-${client.id}`}
                            value={clientEditForm.implementationStage}
                            onChange={(event) => setClientEditForm((current) => ({ ...current, implementationStage: event.target.value as PartnerClient['implementation_stage'] }))}
                            className="h-10 w-full rounded-[6px] border border-[#d8d4cc] bg-white px-3 text-sm text-[#202027]"
                          >
                            {Object.entries(implementationStageLabels).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-client-tier-${client.id}`}>Subscription tier</Label>
                          <Input
                            id={`edit-client-tier-${client.id}`}
                            value={clientEditForm.subscriptionTier}
                            onChange={(event) => setClientEditForm((current) => ({ ...current, subscriptionTier: event.target.value }))}
                            className="rounded-[6px] border-[#d8d4cc] bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-client-mrr-${client.id}`}>MRR</Label>
                          <Input
                            id={`edit-client-mrr-${client.id}`}
                            type="number"
                            min="0"
                            step="1"
                            value={clientEditForm.mrr}
                            onChange={(event) => setClientEditForm((current) => ({ ...current, mrr: event.target.value }))}
                            className="rounded-[6px] border-[#d8d4cc] bg-white"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`edit-client-notes-${client.id}`}>Notes</Label>
                          <Textarea
                            id={`edit-client-notes-${client.id}`}
                            value={clientEditForm.notes}
                            onChange={(event) => setClientEditForm((current) => ({ ...current, notes: event.target.value }))}
                            className="min-h-20 rounded-[6px] border-[#d8d4cc] bg-white"
                          />
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 gap-2 rounded-[6px] border-[#d8d4cc] bg-white text-xs"
                            onClick={() => setEditingClientId(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="h-9 gap-2 rounded-[6px] bg-[#27233f] text-xs text-white hover:bg-[#332d55]"
                            disabled={isCreatingClient}
                          >
                            {isCreatingClient && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Save changes
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-[#27262d]">{client.client_name}</h4>
                            <Badge variant="outline" className="rounded-full border-[#dedad3] bg-white text-[10px]">
                              {clientStatusLabels[client.status]}
                            </Badge>
                            <Badge variant="outline" className="rounded-full border-[#dedad3] bg-white text-[10px]">
                              {implementationStageLabels[client.implementation_stage]}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#77737f]">
                            {client.client_email && <span>{client.client_email}</span>}
                            <span>Attributed {formatDate(client.first_attributed_at)}</span>
                            <span>Last activity {formatDate(client.last_activity_at)}</span>
                          </div>
                          {client.notes && (
                            <p className="mt-3 whitespace-pre-line text-sm leading-5 text-[#77737f]">{client.notes}</p>
                          )}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 gap-2 rounded-[6px] border-[#d8d4cc] bg-white text-xs"
                              onClick={() => startEditingClient(client)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit lifecycle
                            </Button>
                            <Button
                              type="button"
                              className="h-9 gap-2 rounded-[6px] bg-[#27233f] text-xs text-white hover:bg-[#332d55]"
                              onClick={() => openClientConfiguration(client)}
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                              Configure workspace
                            </Button>
                          </div>
                        </div>
                        <div className="grid min-w-36 gap-2 rounded-[6px] border border-[#ebe7e2] bg-white p-3 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[#8b8792]">MRR</span>
                            <span className="font-semibold text-[#202027]">{formatCurrency(client.mrr_cents)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[#8b8792]">Tier</span>
                            <span className="font-semibold text-[#202027]">{client.subscription_tier || 'Pending'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[#8b8792]">Rate</span>
                            <span className="font-semibold text-[#202027]">{client.commission_rate}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[6px] border border-dashed border-[#d8d4cc] bg-[#fbfaf7] p-6 text-sm leading-6 text-[#77737f]">
                No partner clients have been attributed yet. When a client signs up through a referral link or is added by the partner team, this tab will show account status, implementation stage, MRR, and payout attribution.
              </div>
            )}
          </div>
          <div className="rounded-[8px] border border-[#e2ded8] bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b8792]">
              Client metrics
            </p>
            <div className="mt-4 grid gap-2">
              {[
                ['Tracked accounts', String(trackedClients)],
                ['Active clients', String(activeClients)],
                ['Onboarding', String(onboardingClients)],
                ['Client MRR', formatCurrency(totalClientMrr)],
                ['Active referral links', String(referralLinks.filter((link) => link.is_active).length)],
                ['Attributed revenue', formatCurrency(commissionSummary.revenueCents)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-[6px] border border-[#ebe7e2] bg-[#fbfaf7] px-3 py-3">
                  <span className="text-xs font-medium text-[#77737f]">{label}</span>
                  <span className="text-sm font-semibold text-[#202027]">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2 rounded-[6px] border border-[#ebe7e2] bg-[#fbfaf7] p-3 text-xs leading-5 text-[#77737f]">
              <div className="flex items-start gap-2">
                <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Client records are partner-attributed accounts, separate from the partner company itself.</span>
              </div>
              <div className="flex items-start gap-2">
                <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Implementation stage updates will drive the next workflow pass.</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'configuration') {
      return (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-[8px] border border-[#e2ded8] bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b8792]">
              Client
            </p>
            <h3 className="mt-2 text-base font-semibold text-[#202027]">Workspace configuration</h3>
            <select
              value={selectedConfigClientId}
              onChange={(event) => setSelectedConfigClientId(event.target.value)}
              className="mt-4 h-10 w-full rounded-[6px] border border-[#d8d4cc] bg-white px-3 text-sm text-[#202027]"
              aria-label="Select client workspace"
            >
              <option value="">Select client</option>
              {partnerClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.client_name}
                </option>
              ))}
            </select>
            {selectedConfigClient && (
              <div className="mt-4 rounded-[6px] border border-[#ebe7e2] bg-[#fbfaf7] p-3 text-xs leading-5 text-[#77737f]">
                <div className="font-semibold text-[#202027]">{selectedConfigClient.client_name}</div>
                <div>{selectedConfigClient.client_email || 'No client email'}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full border-[#dedad3] bg-white text-[10px]">
                    {clientStatusLabels[selectedConfigClient.status]}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-[#dedad3] bg-white text-[10px]">
                    {implementationStageLabels[selectedConfigClient.implementation_stage]}
                  </Badge>
                </div>
              </div>
            )}
            <div className="mt-5 grid gap-2">
              {workspaceModules.map((module) => {
                const moduleOverride = workspaceOverrides.find((override) => override.module === module.id);
                const hasDraft = Boolean(moduleOverride?.draft_config?.notes);
                const hasPublished = Boolean(moduleOverride?.published_at);
                return (
                  <button
                    key={module.id}
                    type="button"
                    className={`rounded-[6px] border px-3 py-3 text-left transition-colors ${
                      selectedConfigModule === module.id
                        ? 'border-[#27233f] bg-[#f7f5f1] text-[#202027]'
                        : 'border-[#ebe7e2] bg-white text-[#5f5a67] hover:bg-[#fbfaf7]'
                    }`}
                    onClick={() => setSelectedConfigModule(module.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{module.label}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a96a1]">
                        {hasPublished ? 'Published' : hasDraft ? 'Draft' : 'Empty'}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#77737f]">{module.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-[8px] border border-[#e2ded8] bg-white p-5">
            {!selectedConfigClient ? (
              <div className="rounded-[6px] border border-dashed border-[#d8d4cc] bg-[#fbfaf7] p-6 text-sm leading-6 text-[#77737f]">
                Select a client to configure workspace overrides. This is the first pass of the spec's Client Configuration screen.
              </div>
            ) : (
              <>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b8792]">
                      {selectedConfigClient.client_name}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-[#202027]">{selectedModuleMeta.label}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#77737f]">{selectedModuleMeta.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 gap-2 rounded-[6px] border-[#d8d4cc] bg-white text-xs"
                      onClick={() => saveWorkspaceOverride(false)}
                      disabled={isSavingOverride || isOverridesLoading}
                    >
                      {isSavingOverride ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save draft
                    </Button>
                    <Button
                      type="button"
                      className="h-9 gap-2 rounded-[6px] bg-[#27233f] text-xs text-white hover:bg-[#332d55]"
                      onClick={() => saveWorkspaceOverride(true)}
                      disabled={isSavingOverride || isOverridesLoading}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Publish changes
                    </Button>
                  </div>
                </div>
                {isWorkspaceOverridesSandbox && (
                  <div className="mb-4 rounded-[6px] border border-[#d8d4cc] bg-[#fbfaf7] p-4 text-sm leading-6 text-[#77737f]">
                    Workspace override storage is running in browser sandbox until the partner_workspace_overrides migration is applied.
                  </div>
                )}
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-2">
                    <Label htmlFor="workspaceOverrideDraft">Draft override</Label>
                    <Textarea
                      id="workspaceOverrideDraft"
                      value={overrideDraft}
                      onChange={(event) => setOverrideDraft(event.target.value)}
                      placeholder={selectedModuleMeta.placeholder}
                      className="min-h-80 rounded-[6px] border-[#d8d4cc] bg-white text-sm leading-6"
                    />
                    <p className="text-xs leading-5 text-[#8b8792]">
                      Draft changes stay private to the partner until published.
                    </p>
                  </div>
                  <div className="rounded-[6px] border border-[#ebe7e2] bg-[#fbfaf7] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8f8b96]">
                      Published version
                    </p>
                    <div className="mt-3 min-h-40 whitespace-pre-line rounded-[6px] border border-[#ebe7e2] bg-white p-3 text-sm leading-6 text-[#77737f]">
                      {selectedOverride?.published_config?.notes || 'Nothing published yet.'}
                    </div>
                    <div className="mt-4 grid gap-2 text-xs text-[#77737f]">
                      <div className="flex items-center justify-between gap-3">
                        <span>Published</span>
                        <span className="font-semibold text-[#202027]">{formatDate(selectedOverride?.published_at)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Draft status</span>
                        <span className="font-semibold text-[#202027]">{overrideDraft.trim() ? 'Has draft' : 'Empty'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'templates') {
      return (
        <div className="rounded-[8px] border border-[#e2ded8] bg-white p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b8792]">
                Templates
              </p>
              <h3 className="mt-2 text-base font-semibold text-[#202027]">Partner implementation templates</h3>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {partnerClients.length > 0 && (
                <select
                  value={selectedTemplateClientId}
                  onChange={(event) => setSelectedTemplateClientId(event.target.value)}
                  className="h-9 min-w-48 rounded-[6px] border border-[#d8d4cc] bg-white px-3 text-xs text-[#202027]"
                  aria-label="Select client for template"
                >
                  <option value="">Select client</option>
                  {partnerClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.client_name}
                    </option>
                  ))}
                </select>
              )}
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-[6px] border-[#d8d4cc] bg-white text-xs"
                onClick={loadPartnerTemplates}
                disabled={isTemplatesLoading}
              >
                {isTemplatesLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                type="button"
                className="h-9 gap-2 rounded-[6px] bg-[#27233f] text-xs text-white hover:bg-[#332d55]"
                onClick={() => navigate('/meeting/custom/builder')}
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
                New template
              </Button>
            </div>
          </div>
          {partnerTemplates.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {partnerTemplates.map((template) => (
                <div key={template.id} className="rounded-[8px] border border-[#ebe7e2] bg-[#fbfaf7] p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold text-[#27262d]">{template.name}</h4>
                    <Badge variant="outline" className="shrink-0 rounded-[4px] border-[#dedad3] bg-white text-[10px]">
                      {template.shared ? 'Shared' : 'Private'}
                    </Badge>
                  </div>
                  <p className="text-sm leading-5 text-[#77737f]">
                    {template.description || template.meeting_title || 'Reusable implementation meeting template.'}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#77737f]">
                    <span>{template.sections?.length || 0} sections</span>
                    <span>Updated {formatDate(template.updated_at)}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 h-9 w-full rounded-[6px] border-[#d8d4cc] bg-white text-xs"
                    onClick={() => navigate(`/meeting/custom/builder?template=${template.id}`)}
                  >
                    Open template
                  </Button>
                  <Button
                    type="button"
                    className="mt-2 h-9 w-full gap-2 rounded-[6px] bg-[#27233f] text-xs text-white hover:bg-[#332d55]"
                    onClick={() => applyTemplateToClient(template)}
                    disabled={!selectedTemplateClientId}
                  >
                    <LayoutTemplate className="h-3.5 w-3.5" />
                    Assign to client
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              {fallbackTemplateRows.map((template) => (
                <div key={template.title} className="rounded-[8px] border border-dashed border-[#d8d4cc] bg-[#fbfaf7] p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold text-[#27262d]">{template.title}</h4>
                    <Badge variant="outline" className="shrink-0 rounded-[4px] border-[#dedad3] bg-white text-[10px]">
                      {template.status}
                    </Badge>
                  </div>
                  <p className="text-sm leading-5 text-[#77737f]">{template.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'referral_links') {
      return (
        <div className="rounded-[8px] border border-[#e2ded8] bg-white p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b8792]">
                Referral Links
              </p>
              <h3 className="mt-2 text-base font-semibold text-[#202027]">Partner signup links</h3>
            </div>
            <Button
              type="button"
              className="h-9 gap-2 rounded-[6px] bg-[#27233f] text-xs text-white hover:bg-[#332d55]"
              onClick={createReferralLink}
              disabled={isCreatingReferralLink}
            >
              {isCreatingReferralLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LinkIcon className="h-3.5 w-3.5" />}
              Create link
            </Button>
          </div>
          {referralLinks.length > 0 ? (
            <div className="grid gap-3">
              {referralLinks.map((link) => (
                <div key={link.id} className="grid gap-3 rounded-[6px] border border-[#ebe7e2] bg-[#fbfaf7] p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-[#27262d]">{link.link_code}</h4>
                      <Badge variant="outline" className="rounded-full border-[#dedad3] bg-white text-[10px]">
                        {link.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="mt-2 break-all text-sm text-[#77737f]">{getReferralUrl(link)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button type="button" variant="outline" className="h-9 gap-2 rounded-[6px] border-[#d8d4cc] bg-white text-xs" onClick={() => copyReferralLink(link)}>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                    <Button type="button" variant="outline" className="h-9 gap-2 rounded-[6px] border-[#d8d4cc] bg-white text-xs" onClick={() => window.open(getReferralUrl(link), '_blank', 'noopener,noreferrer')}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[6px] border border-dashed border-[#d8d4cc] bg-[#fbfaf7] p-6 text-sm text-[#77737f]">
              Create the first partner referral link to start attributing signups.
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="rounded-[8px] border border-[#e2ded8] bg-white p-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b8792]">
              Commissions
            </p>
            <h3 className="mt-2 text-base font-semibold text-[#202027]">Revenue and payout summary</h3>
          </div>
          <BarChart3 className="h-4 w-4 text-[#777280]" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Tracked revenue', formatCurrency(commissionSummary.revenueCents)],
            ['Commission earned', formatCurrency(commissionSummary.commissionCents)],
            ['Pending payout', formatCurrency(commissionSummary.pendingCents)],
            ['Paid', formatCurrency(commissionSummary.paidCents)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[6px] border border-[#ebe7e2] bg-[#fbfaf7] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8f8b96]">{label}</p>
              <p className="mt-2 text-xl font-semibold text-[#202027]">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-[6px] border border-[#ebe7e2] bg-[#fbfaf7] p-3 text-xs leading-5 text-[#77737f]">
          Commission terms: 30% lifetime recurring, +10% year-one bonus, NET-30 payout cadence.
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#f7f5f1] text-[#202027]">
      <div className="border-b border-[#e3e0da] bg-[#fbfaf7]">
        <div className="flex min-h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
            {workspaceTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                disabled={!canAccessWorkspace}
                onClick={() => selectWorkspaceTab(tab.id)}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-[4px] px-3 text-xs font-medium transition-colors ${
                  canAccessWorkspace && activeTab === tab.id
                    ? 'bg-white text-[#27233f] shadow-sm'
                    : 'text-[#8c8994] hover:bg-white/70 hover:text-[#4c4853]'
                }`}
              >
                {tab.label}
                {!canAccessWorkspace && <Lock className="h-3 w-3" />}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8c8994] md:flex">
            <button
              type="button"
              className="flex items-center gap-2 rounded-[4px] border border-dashed border-[#d7d3cc] bg-white px-3 py-2 normal-case tracking-normal text-[#7f7b89]"
            >
              <FileText className="h-3.5 w-3.5" />
              Coach Hub
              <Badge variant="outline" className="rounded-[3px] px-1 py-0 text-[9px] uppercase">
                Docs
              </Badge>
              {!canAccessWorkspace && <Lock className="h-3 w-3" />}
            </button>
            <span>Program</span>
            <span>{statusText}</span>
          </div>
        </div>
      </div>

      <section className="border-b border-[#e3e0da] bg-[#fbfaf7]">
        <div className="grid gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-8 lg:py-12">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#8b8792]">
              Partner Hub <span className="mx-2">.</span> Program Status
            </p>
            <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-normal text-[#1f2026] sm:text-4xl">
              Become a Zentrix Certified Partner
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6d6976] sm:text-[15px]">
              Certified partners operate Zentrix for their clients - they apply templates, customize workspaces,
              run meetings, and earn recurring revenue on every account they bring. Complete the application
              and certification to unlock this section.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2 self-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-[6px] border-[#d8d4cc] bg-white text-[#33323a]"
              onClick={openOverview}
            >
              <Play className="h-3.5 w-3.5" />
              Watch overview - 4 min
            </Button>
            <Button
              type="button"
              className="h-10 gap-2 rounded-[6px] bg-[#27233f] text-white hover:bg-[#332d55]"
              onClick={() => setShowApplication((value) => !value)}
              disabled={isLoading || status === 'certified'}
            >
              {status === 'not_started' ? 'Start application' : 'View application'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e3e0da] bg-[#fbfaf7]">
        <div className="grid gap-4 px-4 py-4 text-xs text-[#777380] sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="rounded-full border-[#d9d5ce] bg-white px-3 py-1 text-[11px] text-[#5f5a67]">
              Status - {statusText}
            </Badge>
            <span>
              Step <strong className="text-[#24242b]">{completedSteps} of 4</strong> complete
            </span>
            <span className="hidden sm:inline">.</span>
            <span>
              estimated time to certification <strong className="text-[#24242b]">~1 week</strong>
            </span>
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#9a96a1]">
            Next cohort opens <span className="text-[#4a4652]">June 9</span> . 12 seats left
          </div>
        </div>
      </section>

      <section className="grid border-b border-[#e3e0da] bg-white sm:grid-cols-2 lg:grid-cols-6">
        {partnerStats.map((stat) => (
          <div key={stat.label} className="min-h-24 border-b border-r border-[#ece9e4] px-4 py-5 sm:px-6 lg:border-b-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#8f8b96]">
              {stat.label}
              {stat.detail && <span className="ml-2">. {stat.detail}</span>}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-normal text-[#1f2026]">{stat.value}</p>
          </div>
        ))}
      </section>

      {showApplication && (
        <section className="border-b border-[#e3e0da] bg-[#f2efe9] px-4 py-8 sm:px-6 lg:px-8">
          <form onSubmit={submitApplication} className="mx-auto grid max-w-5xl gap-5 rounded-[8px] border border-[#ddd8d0] bg-white p-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b8792]">
                Application
              </p>
              <h2 className="mt-2 text-base font-semibold text-[#202027]">Partner profile</h2>
            </div>
            <div className="space-y-2">
              <Label htmlFor="practiceName">Practice or company name</Label>
              <Input
                id="practiceName"
                value={form.practiceName}
                onChange={(event) => setForm((current) => ({ ...current, practiceName: event.target.value }))}
                placeholder="Zentrix Advisory"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                placeholder="https://"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientCount">Current client count</Label>
              <Input
                id="clientCount"
                type="number"
                min="0"
                value={form.clientCount}
                onChange={(event) => setForm((current) => ({ ...current, clientCount: event.target.value }))}
                placeholder="12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessModel">Business model</Label>
              <Input
                id="businessModel"
                value={form.businessModel}
                onChange={(event) => setForm((current) => ({ ...current, businessModel: event.target.value }))}
                placeholder="Consulting, coaching, fractional ops..."
                required
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="implementationFocus">Implementation focus</Label>
              <Textarea
                id="implementationFocus"
                value={form.implementationFocus}
                onChange={(event) => setForm((current) => ({ ...current, implementationFocus: event.target.value }))}
                placeholder="Describe the customer profile and operating model you plan to implement with Zentrix."
                required
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Anything the partner team should know."
              />
            </div>
            <div className="flex items-center justify-end gap-2 lg:col-span-2">
              <Button type="button" variant="outline" onClick={() => setShowApplication(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2 bg-[#27233f] text-white hover:bg-[#332d55]">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit application
              </Button>
            </div>
          </form>
        </section>
      )}

      {canAccessWorkspace && (
        <section id="partner-workspace" className="scroll-mt-4 border-b border-[#e3e0da] bg-[#f7f5f1] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b8792]">
                Certified workspace
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-normal text-[#202027]">
                {workspaceTabs.find((tab) => tab.id === activeTab)?.label}
              </h2>
            </div>
            <Badge variant="outline" className="rounded-full border-[#cddbcf] bg-white text-[#4b8d5f]">
              Active
            </Badge>
          </div>
          {renderWorkspacePanel()}
        </section>
      )}

      <section className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#8b8792]">
            Path to certification
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-normal text-[#202027]">
            Four steps. About a week, end-to-end.
          </h2>
        </div>

        <div className="overflow-hidden rounded-[8px] border border-[#e2ded8] bg-white">
          {certificationSteps.map((step) => (
            <div
              key={step.number}
              className="grid gap-4 border-b border-[#ede9e4] px-4 py-4 last:border-b-0 sm:grid-cols-[48px_minmax(0,1fr)_120px_180px] sm:items-center sm:px-6"
            >
              <span className="text-sm font-medium text-[#8a8691]">{step.number}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#27262d]">{step.title}</h3>
                  {step.complete ? <CheckCircle2 className="h-3.5 w-3.5 text-[#4b8d5f]" /> : step.locked && <Lock className="h-3.5 w-3.5 text-[#aaa6af]" />}
                </div>
                <p className="mt-1 text-sm leading-5 text-[#77737f]">{step.description}</p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8f8a96]">
                {step.duration}
              </span>
              {step.locked || step.complete ? (
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b2adb6]">
                  {step.action}
                </span>
              ) : (
                <Button
                  type="button"
                  className="h-9 justify-self-start gap-2 rounded-[6px] bg-[#27233f] px-4 text-xs text-white hover:bg-[#332d55] sm:justify-self-end"
                  onClick={() => setShowApplication(true)}
                >
                  {step.action}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 px-4 pb-10 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
        <div className="rounded-[8px] border border-[#e2ded8] bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b8792]">
                Locked workspace
              </p>
              <h2 className="mt-2 text-base font-semibold text-[#202027]">What unlocks after certification</h2>
            </div>
            {!canAccessWorkspace && <Lock className="h-4 w-4 text-[#9b96a3]" />}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {['Clients', 'Configuration', 'Templates', 'Referral links', 'Commissions'].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-[6px] border border-[#ebe7e2] px-3 py-3">
                <span className="text-sm font-medium text-[#4c4853]">{item}</span>
                {canAccessWorkspace ? <CheckCircle2 className="h-3.5 w-3.5 text-[#4b8d5f]" /> : <Lock className="h-3.5 w-3.5 text-[#aaa6af]" />}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[8px] border border-[#e2ded8] bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b8792]">
                Implementation sequence
              </p>
              <h2 className="mt-2 text-base font-semibold text-[#202027]">Sequenced to unblock the next</h2>
            </div>
            <BriefcaseBusiness className="h-4 w-4 text-[#777280]" />
          </div>
          <div className="space-y-2">
            {roadmapItems.map((item) => (
              <div key={item.label} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-[6px] border border-[#ebe7e2] px-3 py-3">
                <item.icon className="h-4 w-4 text-[#6f6a78]" />
                <span className="truncate text-sm font-medium text-[#4c4853]">{item.label}</span>
                <Badge variant="outline" className="rounded-[4px] border-[#dedad3] bg-[#fbfaf7] text-[10px] text-[#77727f]">
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isSuperAdmin && (
        <section className="border-t border-[#e3e0da] bg-white px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b8792]">
                Admin review
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-normal text-[#202027]">
                Partner applications
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#77737f]">
              <Badge variant="outline" className="rounded-full border-[#dedad3] bg-[#fbfaf7]">
                {activeApplications} active review
              </Badge>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-[6px] border-[#d8d4cc] bg-white text-xs"
                onClick={loadAdminApplications}
                disabled={isAdminLoading}
              >
                {isAdminLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[8px] border border-[#e2ded8]">
            {applications.length === 0 ? (
              <div className="bg-[#fbfaf7] px-4 py-8 text-sm text-[#77737f]">
                No partner applications submitted yet.
              </div>
            ) : (
              applications.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-4 border-b border-[#ede9e4] bg-[#fbfaf7] px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_150px_360px] lg:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#27262d]">
                        {item.practice_name}
                      </h3>
                      <Badge variant="outline" className="rounded-full border-[#dedad3] bg-white text-[10px]">
                        {item.companies?.name || 'Company'}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#77737f]">
                      {item.implementation_focus || item.business_model || 'No implementation notes yet.'}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit rounded-full border-[#dedad3] bg-white text-[#5f5a67]">
                    {statusLabels[item.status]}
                  </Badge>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {reviewStatuses.map((nextStatus) => (
                      <Button
                        key={nextStatus}
                        type="button"
                        variant={item.status === nextStatus ? 'default' : 'outline'}
                        className={`h-9 rounded-[6px] px-3 text-xs ${
                          item.status === nextStatus
                            ? 'bg-[#27233f] text-white hover:bg-[#332d55]'
                            : 'border-[#d8d4cc] bg-white text-[#33323a]'
                        }`}
                        disabled={reviewingId === item.id || item.status === nextStatus}
                        onClick={() => updateApplicationStatus(item.id, nextStatus)}
                      >
                        {reviewingId === item.id && item.status !== nextStatus ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        {statusLabels[nextStatus]}
                      </Button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      <div className="fixed bottom-4 right-4 hidden rounded-[6px] border border-[#ddd8d0] bg-white px-3 py-2 text-xs text-[#7b7682] shadow-sm lg:flex lg:items-center lg:gap-2">
        <Search className="h-3.5 w-3.5" />
        Partner Hub preview
        <ChevronDown className="h-3.5 w-3.5" />
        <Copy className="h-3.5 w-3.5" />
      </div>
    </main>
  );
}
