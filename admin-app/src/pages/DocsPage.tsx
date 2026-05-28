import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Code, Key, Webhook, ChevronDown, ChevronRight, Copy } from 'lucide-react';

const API_BASE = 'https://[your-supabase-project].supabase.co/functions/v1/zapier-api';

type Param = { name: string; type: string; required: boolean; description: string };
type Op = { id: string; action: string; name: string; description: string; params: Param[]; example: object };

const OPERATIONS: Record<string, Op[]> = {
  Deals: [
    { id: 'create_deal', action: 'create_deal', name: 'Create Deal', description: 'Create a new deal in the pipeline.', params: [{ name: 'title', type: 'string', required: true, description: 'Deal title' }, { name: 'value', type: 'number', required: false, description: 'Total contract value' }, { name: 'mrr', type: 'number', required: false, description: 'Monthly recurring revenue' }, { name: 'stage', type: 'string', required: false, description: 'Pipeline stage' }, { name: 'contact_email', type: 'string', required: false, description: 'Associate by contact email' }, { name: 'deal_owner', type: 'string', required: false, description: 'Owner user email' }, { name: 'close_date', type: 'string', required: false, description: 'Expected close date (YYYY-MM-DD)' }], example: { action: 'create_deal', title: 'Acme Corp Enterprise', value: 50000, mrr: 4167, contact_email: 'john@acme.com' } },
    { id: 'update_deal', action: 'update_deal', name: 'Update Deal', description: 'Update fields on an existing deal.', params: [{ name: 'deal_id', type: 'string', required: true, description: 'Deal UUID' }, { name: 'title', type: 'string', required: false, description: 'New title' }, { name: 'value', type: 'number', required: false, description: 'Updated value' }, { name: 'stage', type: 'string', required: false, description: 'Move to stage' }, { name: 'close_date', type: 'string', required: false, description: 'New close date' }], example: { action: 'update_deal', deal_id: '<deal-uuid>', stage: 'negotiation', value: 55000 } },
    { id: 'get_deal', action: 'get_deal', name: 'Get Deal', description: 'Retrieve full deal details by ID.', params: [{ name: 'deal_id', type: 'string', required: true, description: 'Deal UUID' }], example: { action: 'get_deal', deal_id: '<deal-uuid>' } },
    { id: 'list_deals', action: 'list_deals', name: 'List Deals', description: 'List all deals, optionally filtered by stage.', params: [{ name: 'stage', type: 'string', required: false, description: 'Filter by stage' }], example: { action: 'list_deals' } },
    { id: 'search_deals', action: 'search_deals', name: 'Search Deals', description: 'Full-text search across deal title and description.', params: [{ name: 'query', type: 'string', required: true, description: 'Search term' }], example: { action: 'search_deals', query: 'Acme' } },
    { id: 'move_deal_stage', action: 'move_deal_stage', name: 'Move Deal Stage', description: 'Move a deal to a different pipeline stage.', params: [{ name: 'deal_id', type: 'string', required: true, description: 'Deal UUID' }, { name: 'stage', type: 'string', required: true, description: 'Target stage' }], example: { action: 'move_deal_stage', deal_id: '<deal-uuid>', stage: 'closed_won' } },
    { id: 'close_deal_lost', action: 'close_deal_lost', name: 'Close Deal as Lost', description: 'Mark a deal as lost with an optional reason.', params: [{ name: 'deal_id', type: 'string', required: true, description: 'Deal UUID' }, { name: 'lost_reason', type: 'string', required: false, description: 'Reason for losing' }], example: { action: 'close_deal_lost', deal_id: '<deal-uuid>', lost_reason: 'Budget constraints' } },
    { id: 'delete_deal', action: 'delete_deal', name: 'Delete Deal', description: 'Permanently delete a deal.', params: [{ name: 'deal_id', type: 'string', required: true, description: 'Deal UUID' }], example: { action: 'delete_deal', deal_id: '<deal-uuid>' } },
  ],
  Contacts: [
    { id: 'create_contact', action: 'create_contact', name: 'Create Contact', description: 'Create a new contact.', params: [{ name: 'email', type: 'string', required: true, description: 'Contact email' }, { name: 'first_name', type: 'string', required: false, description: 'First name' }, { name: 'last_name', type: 'string', required: false, description: 'Last name' }, { name: 'company_name', type: 'string', required: false, description: 'Company association' }, { name: 'phone', type: 'string', required: false, description: 'Phone number' }, { name: 'role', type: 'string', required: false, description: 'Job title' }, { name: 'lead_status', type: 'string', required: false, description: 'new | contacted | qualified | unqualified | nurturing | converted' }], example: { action: 'create_contact', email: 'jane@acme.com', first_name: 'Jane', last_name: 'Smith', company_name: 'Acme Corp' } },
    { id: 'update_contact', action: 'update_contact', name: 'Update Contact', description: 'Update fields on an existing contact.', params: [{ name: 'contact_id', type: 'string', required: true, description: 'Contact UUID' }, { name: 'first_name', type: 'string', required: false, description: 'First name' }, { name: 'lead_status', type: 'string', required: false, description: 'Lead status' }, { name: 'role', type: 'string', required: false, description: 'Job title' }], example: { action: 'update_contact', contact_id: '<contact-uuid>', lead_status: 'qualified' } },
    { id: 'get_contact', action: 'get_contact', name: 'Get Contact', description: 'Retrieve a contact by ID or email.', params: [{ name: 'contact_id', type: 'string', required: false, description: 'Contact UUID' }, { name: 'email', type: 'string', required: false, description: 'Email (alternative)' }], example: { action: 'get_contact', email: 'jane@acme.com' } },
    { id: 'list_contacts', action: 'list_contacts', name: 'List Contacts', description: 'List all contacts.', params: [{ name: 'limit', type: 'number', required: false, description: 'Max results (default 100)' }], example: { action: 'list_contacts', limit: 50 } },
    { id: 'search_contacts', action: 'search_contacts', name: 'Search Contacts', description: 'Search contacts by name, email, or company.', params: [{ name: 'query', type: 'string', required: true, description: 'Search term' }], example: { action: 'search_contacts', query: 'jane@acme.com' } },
    { id: 'update_lead_status', action: 'update_lead_status', name: 'Update Lead Status', description: 'Change the lead status on a contact.', params: [{ name: 'contact_id', type: 'string', required: true, description: 'Contact UUID' }, { name: 'lead_status', type: 'string', required: true, description: 'new | contacted | qualified | unqualified | nurturing | converted' }], example: { action: 'update_lead_status', contact_id: '<contact-uuid>', lead_status: 'qualified' } },
    { id: 'delete_contact', action: 'delete_contact', name: 'Delete Contact', description: 'Permanently delete a contact.', params: [{ name: 'contact_id', type: 'string', required: true, description: 'Contact UUID' }], example: { action: 'delete_contact', contact_id: '<contact-uuid>' } },
  ],
  Activities: [
    { id: 'add_contact_activity', action: 'add_contact_activity', name: 'Log Activity', description: 'Log a call, email, meeting, or other activity on a contact.', params: [{ name: 'contact_id', type: 'string', required: true, description: 'Contact UUID' }, { name: 'activity_type', type: 'string', required: true, description: 'call | email | meeting | linkedin | note | sms | whatsapp' }, { name: 'title', type: 'string', required: false, description: 'Activity title' }, { name: 'notes', type: 'string', required: false, description: 'Notes' }, { name: 'outcome', type: 'string', required: false, description: 'Outcome' }], example: { action: 'add_contact_activity', contact_id: '<contact-uuid>', activity_type: 'call', title: 'Discovery Call', outcome: 'interested' } },
    { id: 'list_contact_activities', action: 'list_contact_activities', name: 'List Contact Activities', description: 'List all activities for a contact.', params: [{ name: 'contact_id', type: 'string', required: true, description: 'Contact UUID' }], example: { action: 'list_contact_activities', contact_id: '<contact-uuid>' } },
    { id: 'list_deal_activities', action: 'list_deal_activities', name: 'List Deal Activities', description: 'List all activities associated with a deal.', params: [{ name: 'deal_id', type: 'string', required: true, description: 'Deal UUID' }], example: { action: 'list_deal_activities', deal_id: '<deal-uuid>' } },
  ],
};

const DocsPage = () => {
  const [activeTab, setActiveTab] = useState<string>('Deals');
  const [expanded, setExpanded] = useState<string | null>(null);

  const copy = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="font-semibold text-foreground hover:text-secondary-foreground transition-colors flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Zentrix OS
          </Link>
          <span className="text-sm text-muted-foreground">API Documentation</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        {/* Intro */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Zentrix API Reference</h1>
          <p className="text-secondary-foreground max-w-2xl">
            The Zentrix REST API lets you create, read, update, and delete records in your CRM — contacts, deals, activities, and more. Use it with Zapier, Make, n8n, or any HTTP client.
          </p>
        </div>

        {/* Authentication */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-secondary-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Authentication</h2>
          </div>
          <div className="bg-muted/50 rounded-lg p-5 space-y-3">
            <p className="text-sm text-secondary-foreground">All requests require an API key passed as a header:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border border-border rounded px-3 py-2 text-sm font-mono">x-api-key: your_api_key_here</code>
              <button onClick={() => copy('x-api-key: your_api_key_here')} className="p-2 hover:bg-muted rounded transition-colors" title="Copy">
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Generate API keys in your account Settings → API Keys. Keys are tenant-scoped — they only access data for your organization.</p>
          </div>
        </section>

        {/* Base URL */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-secondary-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Base URL & Request Format</h2>
          </div>
          <div className="bg-muted/50 rounded-lg p-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-secondary-foreground mb-1">Endpoint</p>
              <code className="block bg-white border border-border rounded px-3 py-2 text-sm font-mono">{API_BASE}</code>
              <p className="text-xs text-muted-foreground mt-1">Contact your account admin for your specific endpoint URL.</p>
            </div>
            <div>
              <p className="text-sm font-medium text-secondary-foreground mb-1">Request format</p>
              <p className="text-sm text-secondary-foreground">All requests are <code className="bg-muted px-1 rounded text-xs">POST</code> with a JSON body containing an <code className="bg-muted px-1 rounded text-xs">action</code> field and any required parameters:</p>
              <pre className="bg-white border border-border rounded px-3 py-2 text-sm font-mono mt-2 overflow-x-auto">{`POST /zapier-api
Content-Type: application/json
x-api-key: your_key

{
  "action": "create_deal",
  "title": "New Deal",
  ...
}`}</pre>
            </div>
          </div>
        </section>

        {/* Endpoints */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Endpoints</h2>
          <div className="flex gap-2 border-b border-border pb-2">
            {Object.keys(OPERATIONS).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${
                  activeTab === cat ? 'bg-popover text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {OPERATIONS[activeTab].map((op) => (
              <div key={op.id} className="border border-border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => setExpanded(expanded === op.id ? null : op.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold bg-primary/5 text-primary px-2 py-0.5 rounded font-mono">POST</span>
                    <span className="font-medium text-foreground">{op.name}</span>
                    <code className="text-xs text-muted-foreground font-mono hidden sm:inline">{op.action}</code>
                  </div>
                  {expanded === op.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>

                {expanded === op.id && (
                  <div className="border-t border-gray-100 px-5 py-5 space-y-5 bg-muted/50">
                    <p className="text-sm text-secondary-foreground">{op.description}</p>

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Parameters</h4>
                      <div className="space-y-2">
                        {op.params.map((p) => (
                          <div key={p.name} className="flex items-baseline gap-2 text-sm">
                            <code className="font-mono font-medium text-gray-800 shrink-0">{p.name}</code>
                            <span className="text-xs text-muted-foreground shrink-0">{p.type}</span>
                            {p.required && <span className="text-[10px] bg-destructive/5 text-destructive border border-red-200 px-1.5 py-0.5 rounded shrink-0 font-medium">required</span>}
                            <span className="text-muted-foreground">{p.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Example Request</h4>
                        <button
                          onClick={() => copy(JSON.stringify(op.example, null, 2))}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-secondary-foreground transition-colors"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      </div>
                      <pre className="bg-white border border-border rounded px-4 py-3 text-xs font-mono overflow-x-auto">
                        {JSON.stringify(op.example, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Webhooks */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-secondary-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Webhooks</h2>
          </div>
          <div className="bg-muted/50 rounded-lg p-5 space-y-3">
            <p className="text-sm text-secondary-foreground">Zentrix can push events to your systems when things happen (deal won, contact created, stage changed, etc.).</p>
            <ul className="text-sm text-secondary-foreground space-y-1 list-disc list-inside">
              <li><strong>Outgoing:</strong> Configure webhook URLs in Settings → Webhooks to receive real-time event payloads</li>
              <li><strong>Inbound:</strong> POST events to your Zentrix inbound webhook URL to trigger automations</li>
              <li><strong>OpenPhone:</strong> A dedicated endpoint receives call and SMS events directly from OpenPhone</li>
            </ul>
            <p className="text-xs text-muted-foreground">Contact your account admin for specific webhook endpoint URLs and authentication details.</p>
          </div>
        </section>

        {/* Rate limits */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Rate Limits & Notes</h2>
          <ul className="text-sm text-secondary-foreground space-y-2 list-disc list-inside">
            <li>Rate limits apply per API key. Contact support if you need higher throughput.</li>
            <li>All data is scoped to your tenant — keys cannot access other organizations' data.</li>
            <li>UUIDs are used for all resource IDs. Store them after creation.</li>
            <li>Responses include a <code className="bg-muted px-1 rounded text-xs">success</code> boolean and <code className="bg-muted px-1 rounded text-xs">data</code> object.</li>
            <li>Errors return a <code className="bg-muted px-1 rounded text-xs">code</code> field describing the issue.</li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 mt-16">
        <div className="max-w-5xl mx-auto flex justify-between items-center text-sm text-muted-foreground">
          <span>© 2025 Zentrix. All rights reserved.</span>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-secondary-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-secondary-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DocsPage;
