"use client";

import { useEffect, useState } from "react";

import { cn } from "cn";
import { ArrowRight, ChevronDown, Pencil, Plus, Trash2, Workflow } from "lucide-react";
import { toast } from "sonner";

import { eventTypeLabels, severityMeta } from "@/components/alerting-labels";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/query-state";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { OrganizationFilter, OrganizationSelect } from "@/features/common/organization/organization-select";
import {
  useGeofences,
  useRules,
  useSaveRule,
  useSpeedPolicies,
  useToggleClientRule,
} from "@/hooks/api/use-client-rules";
import { useVehicleGroups } from "@/hooks/api/use-groups";
import { useSchedules } from "@/hooks/api/use-schedules";
import { useVehicles } from "@/hooks/api/use-vehicles";
import { getErrorMessage } from "@/lib/axios";
import { formatDateTime, formatRelative } from "@/lib/format";

/** Identifiant local d'une ligne de formulaire (l'API renumérote à l'enregistrement). */
const localId = () => crypto.randomUUID();

import { type EventType, type NotificationChannel, SEVERITIES, type Severity } from "@/types/alerting";
import {
  DEFAULT_RULE_OPERATOR_BY_FIELD,
  getRuleFieldsForEvent,
  getRuleNotificationChannels,
  getRuleOperatorsForField,
  isRulePushOnlyEvent,
  RULE_ACTION_TYPES,
  RULE_FORM_EVENT_TYPES,
  type Rule,
  type RuleActionType,
  type RuleConditionTarget,
  type RuleField,
  type RuleOperator,
  type RulePayload,
} from "@/types/client-rules";
import type { Group } from "@/types/group";
import type { Vehicle } from "@/types/vehicle";

const FIELD_LABELS: Record<RuleField, { label: string; placeholder: string }> = {
  speed: { label: "Vitesse (km/h)", placeholder: "110" },
  speed_policy: { label: "Politique de vitesse", placeholder: "Choisir une politique" },
  zone: { label: "Zone", placeholder: "Choisir une zone" },
  time: { label: "Heure", placeholder: "22:00-05:00" },
  duration: { label: "Durée (s)", placeholder: "60" },
  schedule: { label: "Calendrier d'utilisation", placeholder: "Choisir un calendrier" },
  ignition: { label: "Contact moteur", placeholder: "allumé" },
  vehicle: { label: "Véhicule", placeholder: "AB-1234-CI" },
};

type RuleOption = { value: string; label: string };
type RuleOptionSource = { options: RuleOption[]; isLoading: boolean; error: unknown; emptyMessage?: string };

const CONDITION_TARGET_TYPES = ["all", "vehicle", "fleet"] as const;
type ConditionTargetType = (typeof CONDITION_TARGET_TYPES)[number];

const TARGET_LABELS: Record<ConditionTargetType, string> = {
  all: "Tous les véhicules du client",
  vehicle: "Véhicule",
  fleet: "Flotte",
};

const OPERATOR_LABELS: Record<RuleOperator, string> = {
  gt: "supérieur à",
  lt: "inférieur à",
  eq: "égal à",
  neq: "différent de",
  in: "dans la plage",
  outside: "hors de la plage",
};

const ACTION_LABELS: Record<RuleActionType, { label: string; placeholder: string }> = {
  alert: { label: "Créer une alerte", placeholder: "Gravité de l'alerte" },
  notify: { label: "Envoyer une notification", placeholder: "Destinataires ou groupe (facultatif)" },
  incident: { label: "Ouvrir un incident", placeholder: "File : Sécurité / SOC" },
  command: { label: "Couper le moteur", placeholder: "Coupure moteur (avec confirmation)" },
};

const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  push: "Push",
  sms: "SMS",
  email: "E-mail",
};

function getTimeRangePart(value: string, index: 0 | 1): string {
  return value.split("-", 2)[index] ?? "";
}

function updateTimeRangePart(value: string, index: 0 | 1, part: string): string {
  const parts = value.split("-", 2);
  parts[index] = part;
  return `${parts[0] ?? ""}-${parts[1] ?? ""}`;
}

function RuleConditionValue({
  conditionId,
  field,
  value,
  values,
  valueLabel,
  valueLabels,
  source,
  multiple,
  onChange,
}: {
  conditionId: string;
  field: RuleField;
  value: string;
  values?: string[];
  valueLabel?: string;
  valueLabels?: string[];
  source?: RuleOptionSource;
  multiple?: boolean;
  onChange: (value: string, label?: string, values?: string[], labels?: string[]) => void;
}) {
  if (field === "speed_policy" || field === "zone" || field === "schedule") {
    const options = source?.options ?? [];
    if (multiple) {
      const selectedValues = values?.length ? values : value ? [value] : [];
      const selectedLabels = valueLabels?.length ? valueLabels : valueLabel ? [valueLabel] : [];
      const labelsByValue = new Map(options.map((option) => [option.value, option.label]));
      const labels = selectedValues.map(
        (selected, index) => labelsByValue.get(selected) ?? selectedLabels[index] ?? "Zone indisponible",
      );
      const statusMessage = source?.error
        ? getErrorMessage(source.error)
        : source?.isLoading
          ? "Chargement des zones…"
          : options.length === 0
            ? (source?.emptyMessage ?? "Aucune zone active configurée pour une sortie.")
            : null;

      return (
        <div className="flex min-w-0 flex-col gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between font-normal"
                aria-label={FIELD_LABELS[field].label}
                disabled={(source?.isLoading ?? false) || (options.length === 0 && selectedValues.length === 0)}
              >
                <span className="truncate">
                  {selectedValues.length === 0
                    ? "Choisir les zones"
                    : selectedValues.length === 1
                      ? labels[0]
                      : `${selectedValues.length} zones sélectionnées`}
                </span>
                <ChevronDown />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-2">
              <div className="flex max-h-60 flex-col gap-1 overflow-y-auto">
                {selectedValues
                  .filter((selected) => !labelsByValue.has(selected))
                  .map((selected) => {
                    const selectedIndex = selectedValues.indexOf(selected);
                    return (
                      // biome-ignore lint/a11y/noLabelWithoutControl: le contrôle (Checkbox / Input) est dans le label
                      <label
                        key={selected}
                        className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-muted"
                      >
                        <Checkbox
                          id={`condition-${conditionId}-zone-${selected}`}
                          checked
                          onCheckedChange={(checked) => {
                            if (checked === true) return;
                            const nextValues = selectedValues.filter((item) => item !== selected);
                            const nextLabels = selectedValues.flatMap((item, itemIndex) =>
                              item === selected ? [] : [labels[itemIndex] ?? "Zone indisponible"],
                            );
                            onChange(nextValues[0] ?? "", nextLabels[0], nextValues, nextLabels);
                          }}
                        />
                        <span className="min-w-0 truncate text-sm">{labels[selectedIndex] ?? "Zone indisponible"}</span>
                      </label>
                    );
                  })}
                {options.map((option) => {
                  const checked = selectedValues.includes(option.value);
                  return (
                    // biome-ignore lint/a11y/noLabelWithoutControl: le contrôle (Checkbox / Input) est dans le label
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-muted"
                    >
                      <Checkbox
                        id={`condition-${conditionId}-zone-${option.value}`}
                        checked={checked}
                        onCheckedChange={(nextChecked) => {
                          const nextValues = nextChecked
                            ? [...selectedValues, option.value]
                            : selectedValues.filter((item) => item !== option.value);
                          const nextLabels = nextValues.map((item) => {
                            const selectedIndex = selectedValues.indexOf(item);
                            return (
                              labelsByValue.get(item) ??
                              (selectedIndex >= 0 ? selectedLabels[selectedIndex] : undefined) ??
                              option.label
                            );
                          });
                          onChange(nextValues[0] ?? "", nextLabels[0], nextValues, nextLabels);
                        }}
                      />
                      <span className="min-w-0 truncate text-sm">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          {statusMessage ? (
            <FieldDescription role={source?.error ? "alert" : undefined}>{statusMessage}</FieldDescription>
          ) : null}
          <FieldDescription>
            {selectedValues.length === 0
              ? "Sélectionnez au moins une zone."
              : "La règle se déclenche si le véhicule sort d'au moins une des zones sélectionnées."}
          </FieldDescription>
        </div>
      );
    }

    const optionExists = options.some((option) => option.value === value);
    const statusMessage = source?.error
      ? getErrorMessage(source.error)
      : source?.isLoading
        ? "Chargement des paramètres…"
        : options.length === 0
          ? (source?.emptyMessage ?? "Aucun paramètre actif n'est configuré.")
          : null;
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <Select
          value={value}
          onValueChange={(selected) => {
            const option = options.find((item) => item.value === selected);
            onChange(selected, option?.label);
          }}
          disabled={(source?.isLoading ?? false) || options.length === 0}
        >
          <SelectTrigger className="w-full" aria-label={FIELD_LABELS[field].label}>
            <SelectValue placeholder={FIELD_LABELS[field].placeholder} />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-72">
            <SelectGroup>
              {value && !optionExists ? (
                <SelectItem value={value}>{valueLabel ?? "Configuration indisponible"}</SelectItem>
              ) : null}
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {statusMessage ? (
          <FieldDescription role={source?.error ? "alert" : undefined}>{statusMessage}</FieldDescription>
        ) : null}
      </div>
    );
  }

  if (field === "time") {
    return (
      <div className="grid min-w-0 grid-cols-2 gap-2">
        {/* biome-ignore lint/a11y/noLabelWithoutControl: le contrôle (Input) est dans le label */}
        <label className="flex min-w-0 flex-col gap-1 text-muted-foreground text-xs">
          Début
          <Input
            type="time"
            aria-label="Heure de début"
            value={getTimeRangePart(value, 0)}
            onChange={(event) => onChange(updateTimeRangePart(value, 0, event.target.value))}
          />
        </label>
        {/* biome-ignore lint/a11y/noLabelWithoutControl: le contrôle (Input) est dans le label */}
        <label className="flex min-w-0 flex-col gap-1 text-muted-foreground text-xs">
          Fin
          <Input
            type="time"
            aria-label="Heure de fin"
            value={getTimeRangePart(value, 1)}
            onChange={(event) => onChange(updateTimeRangePart(value, 1, event.target.value))}
          />
        </label>
      </div>
    );
  }

  const numeric = field === "speed" || field === "duration";
  return (
    <Input
      type={numeric ? "number" : "text"}
      min={numeric ? 0 : undefined}
      step={numeric ? 1 : undefined}
      aria-label={`Valeur : ${FIELD_LABELS[field].label}`}
      value={value}
      placeholder={FIELD_LABELS[field].placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function RuleConditionScope({
  conditionId,
  hasOperatorChoices,
  target,
  vehicles,
  fleets,
  resourcesEnabled,
  isLoading,
  error,
  onChange,
}: {
  conditionId: string;
  hasOperatorChoices: boolean;
  target: RuleConditionTarget | undefined;
  vehicles: Vehicle[];
  fleets: Group[];
  resourcesEnabled: boolean;
  isLoading: boolean;
  error: unknown;
  onChange: (target: RuleConditionTarget) => void;
}) {
  const targetType = target?.type ?? "all";
  const targetId = target && target.type !== "all" ? target.id : "";
  const options = targetType === "vehicle" ? vehicles : fleets;
  const targetLabelId = `condition-target-${conditionId}`;
  const selectedTargetLabel =
    targetType === "vehicle"
      ? vehicles.find((vehicle) => vehicle.id === targetId)?.registration
      : fleets.find((fleet) => fleet.id === targetId)?.name;

  return (
    <FieldGroup className={cn("grid gap-3 sm:grid-cols-2", hasOperatorChoices ? "sm:col-span-3" : "sm:col-span-2")}>
      <Field className="gap-1.5">
        <FieldLabel htmlFor={`${targetLabelId}-type`}>Appliquer à</FieldLabel>
        <Select
          value={targetType}
          onValueChange={(value) => {
            if (value === "all") onChange({ type: "all" });
            else if (value === "vehicle" || value === "fleet") onChange({ type: value, id: "" });
          }}
        >
          <SelectTrigger id={`${targetLabelId}-type`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectGroup>
              {CONDITION_TARGET_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {TARGET_LABELS[type]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      {targetType === "all" ? (
        <Field className="gap-1.5">
          <FieldDescription>La condition s'applique à tous les véhicules de ce client.</FieldDescription>
        </Field>
      ) : (
        <Field className="gap-1.5">
          <FieldLabel htmlFor={`${targetLabelId}-resource`}>{TARGET_LABELS[targetType]}</FieldLabel>
          <Select
            value={targetId}
            onValueChange={(id) =>
              onChange({
                type: targetType,
                id,
                label:
                  (targetType === "vehicle"
                    ? vehicles.find((vehicle) => vehicle.id === id)?.registration
                    : fleets.find((fleet) => fleet.id === id)?.name) ?? undefined,
              })
            }
            disabled={!resourcesEnabled || isLoading || options.length === 0}
          >
            <SelectTrigger id={`${targetLabelId}-resource`} className="w-full">
              <SelectValue placeholder={targetType === "vehicle" ? "Choisir un véhicule" : "Choisir une flotte"} />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              <SelectGroup>
                {targetId && !options.some((option) => option.id === targetId) ? (
                  <SelectItem value={targetId}>
                    {target && target.type !== "all"
                      ? (target.label ?? "Ressource indisponible")
                      : "Ressource indisponible"}
                  </SelectItem>
                ) : null}
                {targetType === "vehicle"
                  ? vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.registration}
                      </SelectItem>
                    ))
                  : fleets.map((fleet) => (
                      <SelectItem key={fleet.id} value={fleet.id}>
                        {fleet.name} · {fleet.membersCount} véhicule(s)
                      </SelectItem>
                    ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {error || !resourcesEnabled || isLoading || options.length === 0 ? (
            <FieldDescription role={error ? "alert" : undefined}>
              {error
                ? getErrorMessage(error)
                : !resourcesEnabled
                  ? "Sélectionnez un client pour charger les ressources."
                  : isLoading
                    ? "Chargement des ressources…"
                    : targetType === "vehicle"
                      ? "Aucun véhicule actif disponible."
                      : "Aucune flotte disponible."}
            </FieldDescription>
          ) : null}
          {targetId && resourcesEnabled && !isLoading && !selectedTargetLabel ? (
            <FieldDescription role="alert">
              La ressource sélectionnée n'est plus disponible pour ce client.
            </FieldDescription>
          ) : null}
        </Field>
      )}
    </FieldGroup>
  );
}

function RuleActionValue({
  type,
  value,
  onChange,
}: {
  type: RuleActionType;
  value: string;
  onChange: (value: string) => void;
}) {
  if (type === "alert") {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" aria-label="Gravité de l'alerte">
          <SelectValue placeholder={ACTION_LABELS.alert.placeholder} />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            {SEVERITIES.map((severity) => (
              <SelectItem key={severity} value={severity}>
                {severityMeta[severity].label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      aria-label="Paramètre de l'action"
      value={value}
      placeholder={ACTION_LABELS[type].placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function RuleNotificationChannels({
  trigger,
  channels,
  onChange,
}: {
  trigger: EventType;
  channels: NotificationChannel[] | undefined;
  onChange: (channels: NotificationChannel[]) => void;
}) {
  const resolvedChannels = getRuleNotificationChannels(trigger, channels);
  const pushOnly = isRulePushOnlyEvent(trigger);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{NOTIFICATION_CHANNEL_LABELS.push} · obligatoire</Badge>
        {pushOnly ? (
          <span className="text-muted-foreground text-xs">Canal imposé pour cet événement.</span>
        ) : (
          <ToggleGroup
            type="multiple"
            variant="outline"
            size="sm"
            spacing={0}
            value={resolvedChannels.filter((channel) => channel !== "push")}
            aria-label="Canaux de notification supplémentaires"
            onValueChange={(selected) =>
              onChange(
                getRuleNotificationChannels(trigger, [
                  "push",
                  ...selected.filter(
                    (channel): channel is NotificationChannel => channel === "sms" || channel === "email",
                  ),
                ]),
              )
            }
          >
            <ToggleGroupItem value="sms">{NOTIFICATION_CHANNEL_LABELS.sms}</ToggleGroupItem>
            <ToggleGroupItem value="email">{NOTIFICATION_CHANNEL_LABELS.email}</ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>
      {pushOnly ? <p className="text-muted-foreground text-xs">SMS et e-mail ne sont pas disponibles ici.</p> : null}
    </div>
  );
}

function normalizeRuleNotificationActions(trigger: EventType, actions: Rule["actions"]): Rule["actions"] {
  return actions.map((action) =>
    action.type === "notify" ? { ...action, channels: getRuleNotificationChannels(trigger, action.channels) } : action,
  );
}

function normalizeRuleConditionOperator(condition: Rule["conditions"][number]): Rule["conditions"][number] {
  const operators = getRuleOperatorsForField(condition.field);
  return operators.includes(condition.operator)
    ? condition
    : { ...condition, operator: DEFAULT_RULE_OPERATOR_BY_FIELD[condition.field] };
}

function hasRuleConditionOperatorChoices(field: RuleField): boolean {
  return getRuleOperatorsForField(field).length > 1;
}

type RuleView = "cards" | "table";

function ruleConditionText(condition: Rule["conditions"][number], lowercaseField = false): string {
  const fieldLabel = FIELD_LABELS[condition.field].label;
  const zoneLabels = condition.valueLabels;
  const target =
    condition.target?.type === "vehicle"
      ? ` · ${condition.target.label ?? "Véhicule"}`
      : condition.target?.type === "fleet"
        ? ` · Flotte : ${condition.target.label ?? "Flotte"}`
        : "";
  if (condition.field === "zone" && zoneLabels && zoneLabels.length > 0) {
    return `${lowercaseField ? "zones" : "Zones"} : ${zoneLabels.join(" ou ")}${target}`;
  }
  return `${lowercaseField ? fieldLabel.toLowerCase() : fieldLabel} ${OPERATOR_LABELS[condition.operator]} ${condition.valueLabel ?? condition.value}${target}`;
}

/** Phrase lisible d'une règle : « Quand Excès de vitesse et Vitesse supérieur à 110 → … ». */
function ruleSentence(r: Pick<Rule, "trigger" | "conditions" | "actions">): string {
  const conds = r.conditions.map((condition) => ruleConditionText(condition, true));
  const acts = r.actions.map((a) =>
    a.type === "notify"
      ? `${ACTION_LABELS[a.type].label.toLowerCase()} (${getRuleNotificationChannels(r.trigger, a.channels)
          .map((channel) => NOTIFICATION_CHANNEL_LABELS[channel])
          .join(", ")})`
      : ACTION_LABELS[a.type].label.toLowerCase(),
  );
  return `Quand « ${eventTypeLabels[r.trigger]} »${conds.length ? ` et ${conds.join(" et ")}` : ""}, alors ${acts.join(", ") || "rien"}.`;
}

/**
 * Moteur de règles (rubrique client) : générique et transversal (§16) — déclencheur, conditions
 * (ET logique) et actions. Même écran pour la plateforme Client et la fiche client.
 */
export function RulesEngine({ organizationId: scoped }: { organizationId?: string } = {}) {
  const [filterOrg, setFilterOrg] = useState<string | undefined>();
  const organizationId = scoped ?? filterOrg;
  const rules = useRules(organizationId);
  const toggle = useToggleClientRule();
  const [editing, setEditing] = useState<{ open: boolean; rule: Rule | null }>({ open: false, rule: null });
  const [view, setView] = useState<RuleView>("cards");
  const rows = rules.data ?? [];

  const newButton = (
    <Button onClick={() => setEditing({ open: true, rule: null })}>
      <Plus data-icon="inline-start" />
      Nouvelle règle
    </Button>
  );

  const viewToggle = (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      value={view}
      aria-label="Format de la liste des règles"
      onValueChange={(value) => {
        if (value === "cards" || value === "table") setView(value);
      }}
    >
      <ToggleGroupItem value="cards">Cartes</ToggleGroupItem>
      <ToggleGroupItem value="table">Tableau</ToggleGroupItem>
    </ToggleGroup>
  );

  return (
    <div className="flex flex-col gap-4">
      {scoped ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {viewToggle}
          {newButton}
        </div>
      ) : (
        <PageHeader
          title="Moteur de règles"
          description="Automatisations : quand un événement survient et que les conditions sont réunies, le système agit."
          actions={
            <>
              <OrganizationFilter value={filterOrg} onChange={setFilterOrg} />
              {viewToggle}
              {newButton}
            </>
          }
        />
      )}
      <Alert>
        <Workflow />
        <AlertTitle>Règles enregistrées</AlertTitle>
        <AlertDescription>
          Les règles sont stockées et vérifiées par l'API ; leur évaluation sur les événements GPS (déclenchements,
          alertes, incidents) n'est pas encore active.
        </AlertDescription>
      </Alert>

      {rules.isPending ? (
        <LoadingRows rows={4} />
      ) : rules.isError ? (
        <ErrorState error={rules.error} onRetry={() => rules.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Workflow />} title="Aucune règle" description="Créez la première automatisation." />
      ) : view === "cards" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.id} className={r.active ? undefined : "opacity-70"}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {r.name}
                  <StatusBadge tone={severityMeta[r.severity].tone}>{severityMeta[r.severity].label}</StatusBadge>
                </CardTitle>
                <CardDescription>{r.description ?? (scoped ? "" : r.organization.name)}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="rounded-md bg-muted/50 p-2.5 text-sm">{ruleSentence(r)}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge variant="outline">{eventTypeLabels[r.trigger]}</Badge>
                  {r.conditions.map((c) => (
                    <Badge key={c.id} variant="secondary">
                      {ruleConditionText(c)}
                    </Badge>
                  ))}
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                  {r.actions.map((a) => (
                    <Badge key={a.id}>
                      {ACTION_LABELS[a.type].label}
                      {a.type === "notify"
                        ? ` · ${getRuleNotificationChannels(r.trigger, a.channels)
                            .map((channel) => NOTIFICATION_CHANNEL_LABELS[channel])
                            .join(", ")}`
                        : ""}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2 border-t pt-3">
                  <span className="text-muted-foreground text-xs">
                    Déclenchée {r.triggerCount} fois
                    {r.lastTriggeredAt ? ` · dernière ${formatRelative(r.lastTriggeredAt)}` : " · jamais"}
                    {scoped ? "" : ` · ${r.organization.name}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.active}
                      aria-label={r.active ? "Désactiver la règle" : "Activer la règle"}
                      onCheckedChange={(active) =>
                        toggle.mutate(
                          { kind: "rule", id: r.id, active },
                          { onSuccess: () => toast.success(active ? "Règle activée" : "Règle désactivée") },
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Modifier ${r.name}`}
                      onClick={() => setEditing({ open: true, rule: r })}
                    >
                      <Pencil />
                    </Button>
                  </div>
                </div>
                <span className="sr-only">Modifiée le {formatDateTime(r.updatedAt)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="px-0">
            <Table className="**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Règle</TableHead>
                  {scoped ? null : <TableHead>Client</TableHead>}
                  <TableHead>Déclencheur</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Gravité</TableHead>
                  <TableHead>Déclenchements</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Modifier</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="min-w-40">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{r.name}</span>
                        {r.description ? (
                          <span className="max-w-56 truncate text-muted-foreground text-xs">{r.description}</span>
                        ) : null}
                      </div>
                      <span className="sr-only">Modifiée le {formatDateTime(r.updatedAt)}</span>
                    </TableCell>
                    {scoped ? null : <TableCell>{r.organization.name}</TableCell>}
                    <TableCell>
                      <Badge variant="outline">{eventTypeLabels[r.trigger]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-72 whitespace-normal">
                      {r.conditions.length ? (
                        <div className="flex flex-wrap gap-1">
                          {r.conditions.map((c) => (
                            <Badge key={c.id} variant="secondary">
                              {ruleConditionText(c)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Aucune condition</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-56 whitespace-normal">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {r.actions.map((a) => (
                          <Badge key={a.id}>
                            {ACTION_LABELS[a.type].label}
                            {a.type === "notify"
                              ? ` · ${getRuleNotificationChannels(r.trigger, a.channels)
                                  .map((channel) => NOTIFICATION_CHANNEL_LABELS[channel])
                                  .join(", ")}`
                              : ""}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={severityMeta[r.severity].tone}>{severityMeta[r.severity].label}</StatusBadge>
                    </TableCell>
                    <TableCell>
                      <span className="block">{r.triggerCount} fois</span>
                      <span className="block text-muted-foreground text-xs">
                        {r.lastTriggeredAt ? formatRelative(r.lastTriggeredAt) : "Jamais"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={r.active}
                        aria-label={r.active ? "Désactiver la règle" : "Activer la règle"}
                        onCheckedChange={(active) =>
                          toggle.mutate(
                            { kind: "rule", id: r.id, active },
                            { onSuccess: () => toast.success(active ? "Règle activée" : "Règle désactivée") },
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Modifier ${r.name}`}
                        onClick={() => setEditing({ open: true, rule: r })}
                      >
                        <Pencil />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <RuleDialog
        open={editing.open}
        rule={editing.rule}
        organizationId={organizationId}
        lockOrganization={Boolean(scoped)}
        onOpenChange={(open) => setEditing((s) => ({ ...s, open }))}
      />
    </div>
  );
}

function RuleDialog({
  open,
  rule,
  organizationId,
  lockOrganization,
  onOpenChange,
}: {
  open: boolean;
  rule: Rule | null;
  organizationId?: string;
  lockOrganization: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<RulePayload | null>(null);
  const save = useSaveRule();
  const resourceOrganizationId = form?.organizationId ? form.organizationId : organizationId;
  const resourcesEnabled = Boolean(resourceOrganizationId);
  const geofenceEvent = form?.trigger === "geofence_entry" || form?.trigger === "geofence_exit";
  const needsVehicleTargets = form?.conditions.some((condition) => condition.target?.type === "vehicle") ?? false;
  const needsFleetTargets = form?.conditions.some((condition) => condition.target?.type === "fleet") ?? false;
  const geofencesQuery = useGeofences(resourceOrganizationId, {
    enabled: open && resourcesEnabled && geofenceEvent,
  });
  const speedPoliciesQuery = useSpeedPolicies(resourceOrganizationId, {
    enabled: open && resourcesEnabled && form?.trigger === "overspeed",
  });
  const schedulesQuery = useSchedules(
    { organizationId: resourceOrganizationId, isActive: true, page: 1, perPage: 100 },
    { enabled: open && resourcesEnabled && form?.trigger === "schedule_violation" },
  );
  const vehiclesQuery = useVehicles(
    { organizationId: resourceOrganizationId, status: "active", page: 1, perPage: 100 },
    { enabled: open && resourcesEnabled && needsVehicleTargets },
  );
  const fleetsQuery = useVehicleGroups(
    { organizationId: resourceOrganizationId, page: 1, perPage: 100 },
    { enabled: open && resourcesEnabled && needsFleetTargets },
  );

  useEffect(() => {
    if (!open) return;
    if (rule) {
      const { id: _i, organization: _o, updatedAt: _u, triggerCount: _t, lastTriggeredAt: _l, ...rest } = rule;
      const allowedFields = getRuleFieldsForEvent(rest.trigger);
      const conditions = rest.conditions
        .filter((condition) => allowedFields.includes(condition.field))
        .map((condition) => {
          const normalized = normalizeRuleConditionOperator(condition);
          if (rest.trigger !== "geofence_exit" || normalized.field !== "zone" || normalized.values?.length) {
            return normalized;
          }
          return {
            ...normalized,
            values: normalized.value ? [normalized.value] : [],
            valueLabels: normalized.valueLabel ? [normalized.valueLabel] : [],
          };
        });
      const actions = normalizeRuleNotificationActions(rest.trigger, rest.actions);
      if (conditions.length !== rest.conditions.length) {
        toast.warning("Des conditions incompatibles ont été retirées du formulaire.");
      }
      setForm({ ...rest, conditions, actions });
    } else {
      setForm({
        organizationId: organizationId ?? "",
        name: "",
        description: null,
        trigger: "overspeed",
        conditions: [],
        actions: [{ id: localId(), type: "alert", value: "medium" }],
        severity: "medium",
        active: true,
      });
    }
  }, [open, rule, organizationId]);

  if (!form) return null;
  const set = <K extends keyof RulePayload>(k: K, v: RulePayload[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const fieldsForEvent = getRuleFieldsForEvent(form.trigger);
  const conditionOptionSources: Partial<Record<RuleField, RuleOptionSource>> = {
    speed_policy: {
      options: (speedPoliciesQuery.data ?? [])
        .filter((policy) => policy.active && policy.organizationId === resourceOrganizationId)
        .map((policy) => ({
          value: policy.id,
          label: `${policy.name} · ${policy.limitKph} km/h + ${policy.toleranceKph} km/h · ${policy.minDurationSeconds} s`,
        })),
      isLoading: resourcesEnabled && speedPoliciesQuery.isFetching,
      error: resourcesEnabled ? speedPoliciesQuery.error : null,
      emptyMessage: resourcesEnabled ? undefined : "Sélectionnez un client pour charger les politiques.",
    },
    zone: {
      options: (geofencesQuery.data ?? [])
        .filter(
          (geofence) =>
            geofence.active &&
            geofence.organizationId === resourceOrganizationId &&
            (form.trigger === "geofence_exit"
              ? geofence.alertOnExit
              : form.trigger === "geofence_entry"
                ? geofence.alertOnEntry
                : true),
        )
        .map((geofence) => ({ value: geofence.id, label: geofence.name })),
      isLoading: resourcesEnabled && geofencesQuery.isFetching,
      error: resourcesEnabled ? geofencesQuery.error : null,
      emptyMessage: resourcesEnabled ? undefined : "Sélectionnez un client pour charger les zones.",
    },
    schedule: {
      options: (schedulesQuery.data?.data ?? [])
        .filter((schedule) => schedule.organizationId === resourceOrganizationId && schedule.isActive)
        .map((schedule) => ({ value: schedule.id, label: schedule.name })),
      isLoading: resourcesEnabled && schedulesQuery.isFetching,
      error: resourcesEnabled ? schedulesQuery.error : null,
      emptyMessage: resourcesEnabled ? undefined : "Sélectionnez un client pour charger les calendriers.",
    },
  };
  const vehicles = (vehiclesQuery.data?.data ?? []).filter(
    (vehicle) => vehicle.organizationId === resourceOrganizationId,
  );
  const fleets = (fleetsQuery.data?.data ?? []).filter((fleet) => fleet.organizationId === resourceOrganizationId);

  const changeTrigger = (trigger: EventType) => {
    const allowedFields = getRuleFieldsForEvent(trigger);
    const conditions = form.conditions
      .filter((condition) => allowedFields.includes(condition.field))
      .map((condition) => {
        const normalized = normalizeRuleConditionOperator(condition);
        if (normalized.field !== "zone") return normalized;
        if (trigger === "geofence_exit") {
          return {
            ...normalized,
            values: normalized.values?.length ? normalized.values : normalized.value ? [normalized.value] : [],
            valueLabels: normalized.valueLabels?.length
              ? normalized.valueLabels
              : normalized.valueLabel
                ? [normalized.valueLabel]
                : [],
          };
        }
        return {
          ...normalized,
          value: normalized.values?.[0] ?? normalized.value,
          valueLabel: normalized.valueLabels?.[0] ?? normalized.valueLabel,
          values: undefined,
          valueLabels: undefined,
        };
      });
    const actions = normalizeRuleNotificationActions(trigger, form.actions);
    const removedCount = form.conditions.length - conditions.length;
    setForm({ ...form, trigger, conditions, actions });
    if (removedCount > 0) {
      const message =
        removedCount === 1
          ? "1 condition incompatible a été retirée."
          : `${removedCount} conditions incompatibles ont été retirées.`;
      toast.warning(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !save.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rule ? "Modifier la règle" : "Nouvelle règle"}</DialogTitle>
          <DialogDescription>{ruleSentence(form)}</DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {lockOrganization ? null : (
              <Field className="gap-1.5 sm:col-span-2">
                <FieldLabel htmlFor="rule-org">Client</FieldLabel>
                <OrganizationSelect
                  id="rule-org"
                  className="w-full"
                  value={form.organizationId || undefined}
                  onChange={(id) => set("organizationId", id ?? "")}
                />
              </Field>
            )}
            <Field className="gap-1.5">
              <FieldLabel htmlFor="rule-name">Nom</FieldLabel>
              <Input id="rule-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="rule-sev">Gravité de la règle</FieldLabel>
              <Select value={form.severity} onValueChange={(v) => set("severity", v as Severity)}>
                <SelectTrigger id="rule-sev" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {severityMeta[s].label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field className="gap-1.5 sm:col-span-2">
              <FieldLabel htmlFor="rule-desc">Description</FieldLabel>
              <Textarea
                id="rule-desc"
                rows={2}
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value || null)}
              />
            </Field>
          </div>

          <FieldSet>
            <FieldLegend variant="label">1. Quand cet événement survient</FieldLegend>
            {isRulePushOnlyEvent(form.trigger) ? (
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="w-fit">
                  {eventTypeLabels[form.trigger]}
                </Badge>
                <p className="text-muted-foreground text-xs">
                  Cet événement est géré dans le code et envoie uniquement des notifications push.
                </p>
              </div>
            ) : (
              <Select value={form.trigger} onValueChange={(v) => changeTrigger(v as EventType)}>
                <SelectTrigger className="w-full" aria-label="Événement déclencheur">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  <SelectGroup>
                    {RULE_FORM_EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {eventTypeLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </FieldSet>

          <FieldSet>
            <FieldLegend variant="label">2. Et que toutes ces conditions sont vraies</FieldLegend>
            <p className="text-muted-foreground text-xs">
              Les critères viennent des réglages correspondant à l’événement. Chaque condition peut viser tous les
              véhicules, un véhicule ou une flotte.
            </p>
            {form.conditions.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Sans condition, la règle s’applique à chaque occurrence de l’événement sélectionné.
              </p>
            ) : null}
            {form.conditions.map((c, i) => (
              <div
                key={c.id}
                className={cn(
                  "grid min-w-0 grid-cols-1 items-center gap-2 rounded-md border p-3",
                  hasRuleConditionOperatorChoices(c.field)
                    ? "sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]"
                    : "sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto]",
                )}
              >
                <Select
                  value={c.field}
                  onValueChange={(v) =>
                    set(
                      "conditions",
                      form.conditions.map((x, j) => {
                        if (j !== i) return x;
                        const field = v as RuleField;
                        const operators = getRuleOperatorsForField(field);
                        return {
                          ...x,
                          field,
                          operator: operators.includes(x.operator) ? x.operator : DEFAULT_RULE_OPERATOR_BY_FIELD[field],
                          value: "",
                          values: undefined,
                          valueLabel: undefined,
                          valueLabels: undefined,
                        };
                      }),
                    )
                  }
                >
                  <SelectTrigger className="w-full" aria-label="Critère">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectGroup>
                      {fieldsForEvent.map((f) => (
                        <SelectItem key={f} value={f}>
                          {FIELD_LABELS[f].label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {hasRuleConditionOperatorChoices(c.field) ? (
                  <Select
                    value={c.operator}
                    onValueChange={(v) =>
                      set(
                        "conditions",
                        form.conditions.map((x, j) => (j === i ? { ...x, operator: v as RuleOperator } : x)),
                      )
                    }
                  >
                    <SelectTrigger className="w-full" aria-label="Opérateur">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectGroup>
                        {getRuleOperatorsForField(c.field).map((o) => (
                          <SelectItem key={o} value={o}>
                            {OPERATOR_LABELS[o]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : null}
                <RuleConditionValue
                  conditionId={c.id}
                  field={c.field}
                  value={c.value}
                  values={c.values}
                  valueLabel={c.valueLabel}
                  valueLabels={c.valueLabels}
                  source={conditionOptionSources[c.field]}
                  multiple={form.trigger === "geofence_exit" && c.field === "zone"}
                  onChange={(value, valueLabel, values, valueLabels) =>
                    set(
                      "conditions",
                      form.conditions.map((x, j) => (j === i ? { ...x, value, valueLabel, values, valueLabels } : x)),
                    )
                  }
                />
                <RuleConditionScope
                  conditionId={c.id}
                  hasOperatorChoices={hasRuleConditionOperatorChoices(c.field)}
                  target={c.target}
                  vehicles={vehicles}
                  fleets={fleets}
                  resourcesEnabled={resourcesEnabled}
                  isLoading={c.target?.type === "fleet" ? fleetsQuery.isFetching : vehiclesQuery.isFetching}
                  error={c.target?.type === "fleet" ? fleetsQuery.error : vehiclesQuery.error}
                  onChange={(target) =>
                    set(
                      "conditions",
                      form.conditions.map((x, j) => (j === i ? { ...x, target } : x)),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="justify-self-start sm:justify-self-center"
                  aria-label="Retirer la condition"
                  onClick={() =>
                    set(
                      "conditions",
                      form.conditions.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            {fieldsForEvent.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => {
                  const field = fieldsForEvent[0];
                  if (!field) return;
                  set("conditions", [
                    ...form.conditions,
                    {
                      id: localId(),
                      field,
                      operator: DEFAULT_RULE_OPERATOR_BY_FIELD[field],
                      value: "",
                      target: { type: "all" },
                    },
                  ]);
                }}
              >
                <Plus data-icon="inline-start" />
                Ajouter une condition
              </Button>
            ) : (
              <FieldDescription>Aucun réglage configurable n'est disponible pour cet événement.</FieldDescription>
            )}
          </FieldSet>

          <FieldSet>
            <FieldLegend variant="label">3. Alors exécuter ces actions</FieldLegend>
            {form.actions.map((a, i) => (
              <div
                key={a.id}
                className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]"
              >
                <Select
                  value={a.type}
                  onValueChange={(v) =>
                    set(
                      "actions",
                      form.actions.map((x, j) => {
                        if (j !== i) return x;
                        const type = v as RuleActionType;
                        if (x.type === type) return x;
                        return {
                          ...x,
                          type,
                          channels: type === "notify" ? getRuleNotificationChannels(form.trigger) : undefined,
                          value:
                            type === "alert"
                              ? (SEVERITIES.find((severity) => severity === x.value) ?? form.severity)
                              : "",
                        };
                      }),
                    )
                  }
                >
                  <SelectTrigger className="w-full" aria-label="Action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectGroup>
                      {RULE_ACTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {ACTION_LABELS[t].label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <div className="flex min-w-0 flex-col gap-2">
                  <RuleActionValue
                    type={a.type}
                    value={a.value}
                    onChange={(value) =>
                      set(
                        "actions",
                        form.actions.map((x, j) => (j === i ? { ...x, value } : x)),
                      )
                    }
                  />
                  {a.type === "notify" ? (
                    <RuleNotificationChannels
                      trigger={form.trigger}
                      channels={a.channels}
                      onChange={(channels) =>
                        set(
                          "actions",
                          form.actions.map((x, j) => (j === i ? { ...x, channels } : x)),
                        )
                      }
                    />
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="justify-self-start sm:justify-self-center"
                  disabled={form.actions.length === 1}
                  aria-label="Retirer l'action"
                  onClick={() =>
                    set(
                      "actions",
                      form.actions.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() =>
                set("actions", [
                  ...form.actions,
                  {
                    id: localId(),
                    type: "alert",
                    value: form.severity,
                  },
                ])
              }
            >
              <Plus data-icon="inline-start" />
              Ajouter une action
            </Button>
            {form.actions.some((a) => a.type === "command") ? (
              <p className="text-amber-600 text-xs dark:text-amber-400">
                Une commande boîtier passe par les contrôles des commandes sensibles : identité, droits, souscription,
                compatibilité matérielle, confirmation et traçabilité.
              </p>
            ) : null}
          </FieldSet>

          <Field orientation="horizontal">
            <Switch id="rule-active" checked={form.active} onCheckedChange={(v) => set("active", v)} />
            <FieldLabel htmlFor="rule-active" className="font-normal">
              Règle active
            </FieldLabel>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" disabled={save.isPending} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                { payload: form, id: rule?.id },
                {
                  onSuccess: () => {
                    toast.success("Règle enregistrée", { description: form.name });
                    onOpenChange(false);
                  },
                  onError: (e) => toast.error("Enregistrement impossible", { description: getErrorMessage(e) }),
                },
              )
            }
          >
            {save.isPending ? <Spinner data-icon="inline-start" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
