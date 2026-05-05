import { useState } from 'react';
import { Shield, Check, X } from 'lucide-react';
import { TEMPLATES, createPolicyFromTemplate, lamportsToSol } from '../lib/policy-templates';
import type { TemplateId, Policy, CreatePolicyOptions } from '../types';

interface PolicyConfiguratorProps {
  currentPolicy: Policy | null;
  onApply: (policy: Policy) => void;
}

export function PolicyConfigurator({ currentPolicy, onApply }: PolicyConfiguratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<CreatePolicyOptions>({});

  const handleTemplateSelect = (templateId: TemplateId) => {
    setSelectedTemplate(templateId);
    setShowOptions(true);
    setOptions({});
  };

  const handleApply = () => {
    if (!selectedTemplate) return;
    const policy = createPolicyFromTemplate(selectedTemplate, options);
    if (policy) onApply(policy);
  };

  const handleUseCurrent = () => {
    if (currentPolicy) onApply(currentPolicy);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--sea-ink)]">Policy Configuration</h3>
        {currentPolicy && (
          <button
            onClick={handleUseCurrent}
            className="text-sm font-medium text-[var(--lagoon-deep)] hover:underline"
          >
            Keep Current Policy
          </button>
        )}
      </div>

      {/* Template Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {TEMPLATES.map((template) => {
          const isSelected = selectedTemplate === template.id;
          return (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template.id)}
              className={`rounded-lg border p-4 text-left transition ${
                isSelected
                  ? 'border-[var(--lagoon-deep)] bg-[rgba(79,184,178,0.1)]'
                  : 'border-[var(--line)] bg-[var(--island-bg)] hover:border-[var(--lagoon-deep)] hover:bg-[var(--island-bg)]'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-semibold text-[var(--sea-ink)]">{template.name}</h4>
                {isSelected && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--lagoon-deep)]">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">{template.description}</p>
              <div className="flex flex-wrap gap-2">
                {template.policy.allowlist.length > 0 && (
                  <span className="rounded-full bg-[rgba(79,184,178,0.14)] px-2 py-0.5 text-xs font-medium text-[var(--lagoon-deep)]">
                    {template.policy.allowlist.length} Allowed
                  </span>
                )}
                {template.policy.blocklist.length > 0 && (
                  <span className="rounded-full bg-[rgba(220,38,38,0.1)] px-2 py-0.5 text-xs font-medium text-red-600">
                    {template.policy.blocklist.length} Blocked
                  </span>
                )}
                {template.policy.dailyLimit && (
                  <span className="rounded-full bg-[rgba(234,179,8,0.1)] px-2 py-0.5 text-xs font-medium text-yellow-600">
                    {lamportsToSol(template.policy.dailyLimit)} SOL/day
                  </span>
                )}
                {template.policy.maxAmount && (
                  <span className="rounded-full bg-[rgba(234,179,8,0.1)] px-2 py-0.5 text-xs font-medium text-yellow-600">
                    {lamportsToSol(template.policy.maxAmount)} SOL/tx
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Options Panel */}
      {showOptions && selectedTemplate && (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-4">
          <h4 className="mb-4 font-medium text-[var(--sea-ink)]">
            Customize: {TEMPLATES.find(t => t.id === selectedTemplate)?.name}
          </h4>

          {/* Daily Limit Option */}
          {TEMPLATES.find(t => t.id === selectedTemplate)?.options?.some(o => o.key === 'dailyLimitAmount') && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-[var(--sea-ink)]">
                Daily Limit (SOL)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={options.dailyLimitAmount || 0.05}
                onChange={(e) => setOptions(prev => ({ ...prev, dailyLimitAmount: parseFloat(e.target.value) }))}
                className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:border-[var(--lagoon-deep)] focus:outline-none"
              />
            </div>
          )}

          {/* Max Transaction Option */}
          {TEMPLATES.find(t => t.id === selectedTemplate)?.options?.some(o => o.key === 'maxTransactionAmount') && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-[var(--sea-ink)]">
                Per-Transaction Limit (SOL)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={options.maxTransactionAmount || 0.01}
                onChange={(e) => setOptions(prev => ({ ...prev, maxTransactionAmount: parseFloat(e.target.value) }))}
                className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:border-[var(--lagoon-deep)] focus:outline-none"
              />
            </div>
          )}

          {/* Custom Allowlist */}
          {TEMPLATES.find(t => t.id === selectedTemplate)?.options?.some(o => o.key === 'customAllowlist') && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-[var(--sea-ink)]">
                Additional Allowed Addresses
              </label>
              <textarea
                placeholder="Enter Solana addresses, one per line"
                rows={3}
                onChange={(e) => {
                  const lines = e.target.value.split('\n').filter(l => l.trim());
                  setOptions(prev => ({ ...prev, customAllowlist: lines }));
                }}
                className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:border-[var(--lagoon-deep)] focus:outline-none"
              />
            </div>
          )}

          {/* Custom Blocklist */}
          {TEMPLATES.find(t => t.id === selectedTemplate)?.options?.some(o => o.key === 'customBlocklist') && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-[var(--sea-ink)]">
                Additional Blocked Addresses
              </label>
              <textarea
                placeholder="Enter Solana addresses, one per line"
                rows={3}
                onChange={(e) => {
                  const lines = e.target.value.split('\n').filter(l => l.trim());
                  setOptions(prev => ({ ...prev, customBlocklist: lines }));
                }}
                className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:border-[var(--lagoon-deep)] focus:outline-none"
              />
            </div>
          )}

          <button
            onClick={handleApply}
            className="w-full rounded-full bg-[var(--lagoon-deep)] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
          >
            Apply Policy
          </button>
        </div>
      )}

      {/* Current Policy Display */}
      {currentPolicy && (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-4">
          <h4 className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium text-[var(--sea-ink)]">
              <Shield className="h-4 w-4 text-[var(--lagoon-deep)]" />
              Current Policy
            </span>
            <div className="flex items-center gap-2">
              {currentPolicy.allowlist.length > 0 && (
                <span className="rounded-full bg-[rgba(79,184,178,0.14)] px-2.5 py-0.5 text-xs font-semibold text-[var(--lagoon-deep)]">
                  {currentPolicy.allowlist.length} Allowed
                </span>
              )}
              {currentPolicy.blocklist.length > 0 && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                  {currentPolicy.blocklist.length} Blocked
                </span>
              )}
            </div>
          </h4>
          <PolicyDisplay policy={currentPolicy} />
        </div>
      )}
    </div>
  );
}

export function PolicyDisplay({ policy }: { policy: Policy }) {
  return (
    <div className="space-y-3">
      {policy.allowlist.length > 0 && (
        <div>
          <span className="text-xs font-medium text-[var(--sea-ink-soft)]">Allowed Addresses:</span>
          <ul className="mt-1 space-y-1">
            {policy.allowlist.map((addr, i) => (
              <li key={i} className="flex items-center gap-2 text-sm font-mono text-[var(--sea-ink)]">
                <Check className="h-3 w-3 text-green-600" />
                {addr.length > 20 ? `${addr.slice(0, 8)}...${addr.slice(-8)}` : addr}
              </li>
            ))}
          </ul>
        </div>
      )}

      {policy.blocklist.length > 0 && (
        <div>
          <span className="text-xs font-medium text-[var(--sea-ink-soft)]">Blocked Addresses:</span>
          <ul className="mt-1 space-y-1">
            {policy.blocklist.map((addr, i) => (
              <li key={i} className="flex items-center gap-2 text-sm font-mono text-red-600">
                <X className="h-3 w-3" />
                {addr.length > 20 ? `${addr.slice(0, 8)}...${addr.slice(-8)}` : addr}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        {policy.maxAmount && (
          <div>
            <span className="text-xs font-medium text-[var(--sea-ink-soft)]">Max per Tx:</span>
            <span className="ml-2 text-sm font-medium text-[var(--sea-ink)]">
              {lamportsToSol(policy.maxAmount)} SOL
            </span>
          </div>
        )}
        {policy.dailyLimit && (
          <div>
            <span className="text-xs font-medium text-[var(--sea-ink-soft)]">Daily Limit:</span>
            <span className="ml-2 text-sm font-medium text-[var(--sea-ink)]">
              {lamportsToSol(policy.dailyLimit)} SOL
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
