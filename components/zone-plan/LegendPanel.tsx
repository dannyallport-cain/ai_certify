'use client';

import type {
  FireAlarmPlan3D,
  Plan3DLegendConfig,
} from '@/mobile/modules/fire-alarm-roomplan/plan3d/plan3d-types';

import PlanKeys from './PlanKeys';

interface LegendPanelProps {
  legend: Plan3DLegendConfig;
  plan: FireAlarmPlan3D;
  canEdit: boolean;
  onChange: (patch: Partial<Plan3DLegendConfig>) => void;
  onCompanyChange: (patch: Partial<Plan3DLegendConfig['company']>) => void;
}

const INPUT_CLASS =
  'mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-foreground/40';

function Field({
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`${INPUT_CLASS} disabled:opacity-60`}
      />
    </label>
  );
}

/**
 * The legend editor. Company details live here because a zone plan is normally issued under the
 * provider's own details, and the client receiving the link often needs to correct them.
 */
export default function LegendPanel({
  legend,
  plan,
  canEdit,
  onChange,
  onCompanyChange,
}: LegendPanelProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Legend</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Printed with the plan. {canEdit ? 'Edit and save to update the shared link.' : 'View only.'}
      </p>

      <div className="mt-3 space-y-3">
        <Field
          label="Plan title"
          value={legend.planTitle}
          disabled={!canEdit}
          onChange={(planTitle) => onChange({ planTitle })}
        />

        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Job reference"
            value={legend.jobReference}
            disabled={!canEdit}
            onChange={(jobReference) => onChange({ jobReference })}
          />
          <Field
            label="Revision"
            value={legend.revision}
            disabled={!canEdit}
            onChange={(revision) => onChange({ revision })}
          />
        </div>

        <Field
          label="Site name"
          value={legend.siteName}
          disabled={!canEdit}
          onChange={(siteName) => onChange({ siteName })}
        />
        <Field
          label="Site address"
          value={legend.siteAddress}
          disabled={!canEdit}
          onChange={(siteAddress) => onChange({ siteAddress })}
        />

        <div className="rounded-lg border border-border p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Company details
          </h3>

          <div className="mt-2 space-y-2">
            <Field
              label="Company name"
              value={legend.company.name}
              disabled={!canEdit}
              onChange={(name) => onCompanyChange({ name })}
            />
            <Field
              label="Address line 1"
              value={legend.company.addressLines[0] ?? ''}
              disabled={!canEdit}
              onChange={(line) =>
                onCompanyChange({
                  addressLines: [line, ...legend.company.addressLines.slice(1)].filter(Boolean),
                })
              }
            />
            <Field
              label="Address line 2"
              value={legend.company.addressLines[1] ?? ''}
              disabled={!canEdit}
              onChange={(line) =>
                onCompanyChange({
                  addressLines: [legend.company.addressLines[0] ?? '', line].filter(Boolean),
                })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Phone"
                value={legend.company.phone}
                disabled={!canEdit}
                onChange={(phone) => onCompanyChange({ phone })}
              />
              <Field
                label="Email"
                value={legend.company.email}
                disabled={!canEdit}
                onChange={(email) => onCompanyChange({ email })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Website"
                value={legend.company.website}
                disabled={!canEdit}
                onChange={(website) => onCompanyChange({ website })}
              />
              <Field
                label="Accreditation"
                value={legend.company.accreditation}
                placeholder="BAFE SP203-1"
                disabled={!canEdit}
                onChange={(accreditation) => onCompanyChange({ accreditation })}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Prepared by"
            value={legend.preparedBy}
            disabled={!canEdit}
            onChange={(preparedBy) => onChange({ preparedBy })}
          />
          <Field
            label="Prepared on"
            value={legend.preparedOn}
            disabled={!canEdit}
            onChange={(preparedOn) => onChange({ preparedOn })}
          />
        </div>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <textarea
            value={legend.notes}
            disabled={!canEdit}
            onChange={(event) => onChange({ notes: event.target.value })}
            rows={2}
            className={`${INPUT_CLASS} resize-none disabled:opacity-60`}
          />
        </label>
      </div>

      <PlanKeys plan={plan} />
    </section>
  );
}
