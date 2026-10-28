import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { SectionCard } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import {
  RuleBasedFireAlarmDiagnosticsAssistant,
  StaticFireAlarmDiagnosticsRepository,
  type FireAlarmDiagnosticAssistantFeedback,
  type FireAlarmDiagnosticFault,
  type FireAlarmDiagnosticObservation,
} from '@/modules/fire-alarm-diagnostics';
import { accentTokens } from '@/theme/accents';
import { useTheme } from '@/theme/useTheme';

const diagnosticsRepository = new StaticFireAlarmDiagnosticsRepository();
const diagnosticsAssistant = new RuleBasedFireAlarmDiagnosticsAssistant(diagnosticsRepository);

/** Sections are numbered so the order of work is obvious at a glance. */
function StepBadge({ number }: { number: number }) {
  const { scheme } = useTheme();
  const amber = accentTokens('amber', scheme);

  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: amber.solid,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>
        {number}
      </AppText>
    </View>
  );
}

export default function FireAlarmDiagnosticsScreen() {
  const { palette, scheme } = useTheme();
  const amber = accentTokens('amber', scheme);

  const categories = useMemo(() => diagnosticsRepository.getCategories(), []);
  const triageOptions = useMemo(() => diagnosticsAssistant.getTriageOptions(), []);

  const [selectedSignals, setSelectedSignals] = useState<FireAlarmDiagnosticObservation[]>([]);
  const [notes, setNotes] = useState('');
  const [measurements, setMeasurements] = useState<Record<string, string>>({
    loopResistance: '',
    positiveCurrent: '',
    negativeCurrent: '',
    positiveToEarth: '',
    negativeToEarth: '',
    lineVoltage: '',
  });
  const [feedback, setFeedback] = useState<FireAlarmDiagnosticAssistantFeedback | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [openFaultId, setOpenFaultId] = useState<string | null>(null);

  const chosenSignals = useMemo(
    () => triageOptions.filter((option) => selectedSignals.includes(option.id)),
    [selectedSignals, triageOptions],
  );

  useEffect(() => {
    let active = true;

    if (selectedSignals.length === 0) {
      setFeedback(null);
      setIsAnalysing(false);
      return () => {
        active = false;
      };
    }

    setIsAnalysing(true);

    diagnosticsAssistant
      .suggestFromRequest?.({
        observations: selectedSignals,
        faultIds: chosenSignals.flatMap((signal) => signal.faultIds),
        notes: notes.trim() || undefined,
        measurements,
      })
      .then((result) => {
        if (!active) {
          return;
        }

        setFeedback(result ?? diagnosticsAssistant.suggestFromObservations(selectedSignals));
        setIsAnalysing(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setFeedback(diagnosticsAssistant.suggestFromObservations(selectedSignals));
        setIsAnalysing(false);
      });

    return () => {
      active = false;
    };
  }, [chosenSignals, measurements, notes, selectedSignals]);

  const toggleSignal = (id: FireAlarmDiagnosticObservation) => {
    setSelectedSignals((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const suggestedFaultIds = feedback?.suggestions.map((suggestion) => suggestion.faultId) ?? [];

  const priorityTone =
    feedback?.priority === 'high'
      ? 'danger'
      : feedback?.priority === 'medium'
        ? 'warning'
        : 'success';

  return (
    <Screen bottomGap={28}>
      <SectionCard
        title="1 · What are you seeing?"
        badge={<StepBadge number={1} />}
        hint="Tap every symptom that applies."
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {triageOptions.map((option) => {
            const active = selectedSignals.includes(option.id);

            return (
              <Pressable
                key={option.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                accessibilityLabel={option.label}
                onPress={() => toggleSignal(option.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: active ? amber.line : palette.line,
                  backgroundColor: active ? amber.soft : palette.surface,
                }}
              >
                <AppText
                  variant="caption"
                  style={{ color: active ? amber.ink : palette.inkMuted, fontWeight: '600' }}
                >
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <View style={{ height: 13 }} />

      <SectionCard
        title="2 · Meter readings"
        badge={<StepBadge number={2} />}
        hint="Optional, but it sharpens the suggestion."
      >
        <View style={{ gap: 10 }}>
          {MEASUREMENT_FIELDS.map((field) => (
            <View key={field.id} style={{ gap: 4 }}>
              <AppText variant="label" tone="muted">
                {`${field.label.toUpperCase()} (${field.unit})`}
              </AppText>
              <TextInput
                value={measurements[field.id] ?? ''}
                onChangeText={(value) =>
                  setMeasurements((current) => ({ ...current, [field.id]: value }))
                }
                placeholder={field.placeholder}
                placeholderTextColor={palette.inkSoft}
                keyboardType="decimal-pad"
                style={{
                  borderWidth: 1,
                  borderColor: palette.line,
                  backgroundColor: palette.surface,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: palette.ink,
                  fontSize: 14,
                }}
              />
            </View>
          ))}

          <View style={{ gap: 4 }}>
            <AppText variant="label" tone="muted">
              NOTES
            </AppText>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Panel text, addresses, recent works"
              placeholderTextColor={palette.inkSoft}
              multiline
              textAlignVertical="top"
              style={{
                borderWidth: 1,
                borderColor: palette.line,
                backgroundColor: palette.surface,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: palette.ink,
                fontSize: 14,
                minHeight: 72,
              }}
            />
          </View>
        </View>
      </SectionCard>

      <View style={{ height: 13 }} />

      <SectionCard
        title="3 · Likely fault"
        badge={<StepBadge number={3} />}
        hint={
          selectedSignals.length === 0
            ? 'Pick a symptom above to get a suggestion.'
            : isAnalysing
              ? 'Analysing…'
              : undefined
        }
      >
        {feedback ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {feedback.priority ? (
                <Pill
                  label={`${feedback.priority} priority`}
                  tone={priorityTone as 'danger' | 'warning' | 'success'}
                />
              ) : null}
              <Pill
                label={feedback.source === 'ai-worker' ? 'AI worker' : 'Built-in rules'}
                tone={feedback.source === 'ai-worker' ? 'info' : 'neutral'}
              />
            </View>

            <AppText variant="body">{feedback.summary}</AppText>
            <AppText variant="body" tone="muted">
              {feedback.probableCause}
            </AppText>

            {feedback.nextSteps.length > 0 ? (
              <View style={{ gap: 6 }}>
                <AppText variant="label" tone="muted">
                  NEXT CHECKS
                </AppText>
                {feedback.nextSteps.map((nextStep) => (
                  <View key={nextStep} style={{ flexDirection: 'row', gap: 8 }}>
                    <Ionicons name="chevron-forward" size={13} color={amber.ink} style={{ marginTop: 3 }} />
                    <AppText variant="body" style={{ flex: 1 }}>
                      {nextStep}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : null}

            {feedback.suggestions.length > 0 ? (
              <View style={{ gap: 8 }}>
                <AppText variant="label" tone="muted">
                  MATCHED FAULTS
                </AppText>
                {feedback.suggestions.slice(0, 3).map((suggestion, index) => (
                  <Pressable
                    key={`${suggestion.faultId}-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={suggestion.reason}
                    onPress={() => setOpenFaultId(suggestion.faultId)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      borderRadius: 12,
                      backgroundColor: amber.soft,
                    }}
                  >
                    <AppText variant="caption" style={{ color: amber.ink, fontWeight: '700' }}>
                      {`#${index + 1}`}
                    </AppText>
                    <AppText variant="body" style={{ flex: 1, color: amber.ink }} numberOfLines={2}>
                      {suggestion.reason}
                    </AppText>
                    <Ionicons name="arrow-forward" size={14} color={amber.ink} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <AppText variant="body" tone="muted">
            No suggestion yet.
          </AppText>
        )}
      </SectionCard>

      <View style={{ height: 13 }} />

      <SectionCard
        title="4 · Fault library"
        badge={<StepBadge number={4} />}
        hint="Open a fault for its checks and readings."
      >
        <View style={{ gap: 10 }}>
          {categories.map((category) => (
            <View key={category.id} style={{ gap: 6 }}>
              <AppText variant="subheading">{category.title}</AppText>

              {category.faults.map((fault) => (
                <FaultRow
                  key={fault.id}
                  fault={fault}
                  expanded={openFaultId === fault.id}
                  suggested={suggestedFaultIds.includes(fault.id)}
                  onToggle={() =>
                    setOpenFaultId((current) => (current === fault.id ? null : fault.id))
                  }
                />
              ))}
            </View>
          ))}
        </View>
      </SectionCard>
    </Screen>
  );
}

const MEASUREMENT_FIELDS = [
  { id: 'lineVoltage', label: 'Loop voltage', unit: 'V', placeholder: '24' },
  { id: 'loopResistance', label: 'Loop resistance', unit: 'Ω', placeholder: '38' },
  { id: 'positiveCurrent', label: 'Positive current', unit: 'mA', placeholder: '42' },
  { id: 'negativeCurrent', label: 'Negative current', unit: 'mA', placeholder: '41' },
  { id: 'positiveToEarth', label: 'Positive to earth', unit: 'MΩ', placeholder: '>20' },
  { id: 'negativeToEarth', label: 'Negative to earth', unit: 'MΩ', placeholder: '>20' },
];

function FaultRow({
  fault,
  expanded,
  suggested,
  onToggle,
}: {
  fault: FireAlarmDiagnosticFault;
  expanded: boolean;
  suggested: boolean;
  onToggle: () => void;
}) {
  const { palette, scheme } = useTheme();
  const amber = accentTokens('amber', scheme);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: expanded ? amber.line : palette.line,
        backgroundColor: expanded ? amber.soft : palette.surface,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={fault.title}
        onPress={onToggle}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {fault.title}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {fault.symptoms[0]}
          </AppText>
        </View>
        {suggested ? <Pill label="matched" tone="warning" /> : null}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={15}
          color={palette.inkSoft}
        />
      </Pressable>

      {expanded ? (
        <View style={{ paddingHorizontal: 10, paddingBottom: 10, gap: 8 }}>
          <FaultList title="Causes" items={fault.likelyCauses} />
          <FaultList title="Checks" items={fault.testSteps} />
          <FaultList title="Readings mean" items={fault.expectedFindings} />
          <FaultList title="Fix" items={fault.actions} />
          <FaultList title="Escalate when" items={fault.escalationNotes} />
        </View>
      ) : null}
    </View>
  );
}

function FaultList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: 3 }}>
      <AppText variant="label" tone="muted">
        {title.toUpperCase()}
      </AppText>
      {items.map((item) => (
        <View key={item} style={{ flexDirection: 'row', gap: 6 }}>
          <AppText variant="caption" tone="soft">
            •
          </AppText>
          <AppText variant="caption" style={{ flex: 1 }}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
}
