"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { OrganizationSelect } from "@/features/common/organization/organization-select";
import { useVehicleGroups } from "@/hooks/api/use-groups";
import { useOffers } from "@/hooks/api/use-offers";
import {
  useCreateSubscription,
  useSubscriptionOperators,
  useSubscriptions,
  useUpdateSubscription,
} from "@/hooks/api/use-subscriptions";
import { getErrorMessage } from "@/lib/axios";
import { formatNumber } from "@/lib/format";
import { offerPeriodicityMeta } from "@/types/offer";
import {
  type CreateSubscriptionPayload,
  SUBSCRIPTION_REFERENCE_PATTERN,
  type Subscription,
  type SubscriptionTarget,
  subscriptionStatusMeta,
  subscriptionTargetMeta,
  type UpdateSubscriptionPayload,
} from "@/types/subscription";

import { parseAmount, previewTotal } from "./subscription-utils";

/** Montant positif, 2 décimales au plus (virgule ou point). */
const AMOUNT = /^\d+([.,]\d{1,2})?$/;

const schema = z
  .object({
    organizationId: z.string().min(1, { message: "Choisissez le client." }),
    target: z.enum(["vehicle_group", "operator"]),
    vehicleGroupId: z.string(),
    operatorId: z.string(),
    offerId: z.string().min(1, { message: "Choisissez l'offre." }),
    offerPrice: z
      .string()
      .trim()
      .refine((v) => AMOUNT.test(v), {
        message: "Montant positif, 2 décimales au plus.",
      }),
    discount: z
      .string()
      .trim()
      .refine((v) => v === "" || AMOUNT.test(v), {
        message: "Montant positif, 2 décimales au plus.",
      }),
    reference: z
      .string()
      .trim()
      .refine((v) => v === "" || SUBSCRIPTION_REFERENCE_PATTERN.test(v), {
        message: "2 à 40 caractères : lettres, chiffres, - _ / .",
      }),
    status: z.enum(["draft", "active"]),
    startDate: z.string().min(1, { message: "Date de début obligatoire." }),
    endDate: z.string(),
    notes: z.string().trim().max(2000),
  })
  .superRefine((v, ctx) => {
    if (v.target === "vehicle_group" && !v.vehicleGroupId) {
      ctx.addIssue({
        code: "custom",
        path: ["vehicleGroupId"],
        message: "Choisissez le groupe de véhicules.",
      });
    }
    if (v.target === "operator" && !v.operatorId) {
      ctx.addIssue({
        code: "custom",
        path: ["operatorId"],
        message: "Choisissez le client final.",
      });
    }
    if (
      AMOUNT.test(v.offerPrice) &&
      AMOUNT.test(v.discount) &&
      parseAmount(v.discount) > parseAmount(v.offerPrice)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["discount"],
        message: "La remise dépasse le prix de l'offre.",
      });
    }
    if (v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "La fin précède le début.",
      });
    }
  });

type Values = z.infer<typeof schema>;

const today = () => new Date().toISOString().slice(0, 10);

function toDefaults(s?: Subscription): Values {
  return {
    organizationId: s?.organizationId ?? "",
    target: s?.target ?? "vehicle_group",
    vehicleGroupId: s?.vehicleGroupId ?? "",
    operatorId: s?.operatorId ?? "",
    offerId: s?.offerId ?? "",
    offerPrice: s ? String(Number(s.offerPrice)) : "",
    discount: s ? String(Number(s.discount)) : "0",
    reference: s?.reference ?? "",
    status: "draft",
    startDate: s?.startDate?.slice(0, 10) ?? today(),
    endDate: s?.endDate?.slice(0, 10) ?? "",
    notes: s?.notes ?? "",
  };
}

/**
 * Création ou modification d'une souscription : un client, UNE cible — un de
 * ses groupes de véhicules OU un de ses clients finaux (opérateur) — et une
 * offre commercialisée. Tarif = prix de l'offre (modifiable) − remise.
 */
export function SubscriptionFormDialog({
  open,
  onOpenChange,
  subscription,
  defaultOrganizationId,
  defaultOfferId,
  defaultTarget,
  defaultOperatorId,
  lockTarget = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent = création. */
  subscription?: Subscription;
  defaultOrganizationId?: string;
  defaultOfferId?: string;
  /** Cible proposée à la création (flotte par défaut). */
  defaultTarget?: SubscriptionTarget;
  defaultOperatorId?: string;
  /** Masque le choix de la cible (page « Attribution des offres »). */
  lockTarget?: boolean;
}) {
  const create = useCreateSubscription();
  const update = useUpdateSubscription();
  const pending = create.isPending || update.isPending;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(subscription),
  });

  useEffect(() => {
    if (!open) return;
    const values = toDefaults(subscription);
    if (!subscription) {
      values.organizationId = defaultOrganizationId ?? "";
      values.offerId = defaultOfferId ?? "";
      values.target = defaultTarget ?? "vehicle_group";
      values.operatorId = defaultOperatorId ?? "";
    }
    form.reset(values);
  }, [
    open,
    subscription,
    defaultOrganizationId,
    defaultOfferId,
    defaultTarget,
    defaultOperatorId,
    form,
  ]);

  const organizationId = form.watch("organizationId");
  const target = form.watch("target");
  const offerId = form.watch("offerId");
  const offerPrice = form.watch("offerPrice");
  const discount = form.watch("discount");

  const offers = useOffers({ perPage: 100 }, { enabled: open });
  const groups = useVehicleGroups(
    { organizationId, perPage: 100 },
    { enabled: open && Boolean(organizationId) && target === "vehicle_group" },
  );
  const operators = useSubscriptionOperators(
    open && target === "operator" ? organizationId || undefined : undefined,
  );
  const existing = useSubscriptions({
    organizationId: organizationId || undefined,
    perPage: 100,
  });

  // Offres proposables : commercialisées, plus l'offre actuelle d'une souscription modifiée.
  const offerRows = (offers.data?.data ?? []).filter(
    (o) => o.status === "active" || o.id === subscription?.offerId,
  );
  const selectedOffer = offerRows.find((o) => o.id === offerId);
  const groupRows = groups.data?.data ?? [];
  /** Groupe → référence de sa souscription vivante (une seule par flotte). */
  const taken = new Map(
    (existing.data?.data ?? [])
      .filter(
        (s) =>
          s.vehicleGroupId &&
          s.status !== "terminated" &&
          s.id !== subscription?.id,
      )
      .map((s) => [s.vehicleGroupId, s.reference]),
  );
  const operatorRows = operators.data ?? [];

  const total = previewTotal(offerPrice, discount);
  const currency = selectedOffer?.currency ?? subscription?.currency ?? "XOF";
  const period = selectedOffer
    ? offerPeriodicityMeta[selectedOffer.periodicity]?.short
    : "période";

  function chooseOffer(id: string) {
    form.setValue("offerId", id, { shouldValidate: true });
    const offer = offerRows.find((o) => o.id === id);
    if (offer)
      form.setValue("offerPrice", String(Number(offer.price)), {
        shouldValidate: true,
      });
  }

  function onSubmit(values: Values) {
    const price = parseAmount(values.offerPrice);
    const remise = values.discount === "" ? 0 : parseAmount(values.discount);
    const handlers = {
      onSuccess: (saved: Subscription) => {
        toast.success(
          subscription ? "Souscription modifiée" : "Souscription créée",
          {
            description: `${saved.reference} — ${saved.operator?.fullName ?? saved.organization?.name ?? ""}`,
          },
        );
        onOpenChange(false);
      },
      onError: (error: unknown) =>
        toast.error(
          subscription ? "Modification impossible" : "Création impossible",
          {
            description: getErrorMessage(error),
          },
        ),
    };
    if (subscription) {
      const payload: UpdateSubscriptionPayload = {
        reference: values.reference || undefined,
        offerId: values.offerId,
        ...cible(values),
        offerPrice: price,
        discount: remise,
        startDate: values.startDate,
        endDate: values.endDate || null,
        notes: values.notes || null,
      };
      update.mutate({ id: subscription.id, payload }, handlers);
    } else {
      const payload: CreateSubscriptionPayload = {
        organizationId: values.organizationId,
        ...cible(values),
        offerId: values.offerId,
        offerPrice: price,
        discount: remise,
        reference: values.reference || undefined,
        status: values.status,
        startDate: values.startDate,
        endDate: values.endDate || undefined,
        notes: values.notes || undefined,
      };
      create.mutate(payload, handlers);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {subscription
              ? `Modifier la souscription ${subscription.reference}`
              : "Nouvelle souscription"}
          </DialogTitle>
          <DialogDescription>
            Une offre est souscrite pour une flotte du client OU pour un de ses
            clients finaux (opérateur), qui ne verra alors que cette offre. Une
            cible n'a qu'une souscription en cours.
          </DialogDescription>
        </DialogHeader>

        <form
          id="subscription-form"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup className="gap-4">
            {lockTarget ? null : (
              <Controller
                control={form.control}
                name="target"
                render={({ field }) => (
                  <Field className="gap-1.5">
                    <FieldLabel>Souscription pour</FieldLabel>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      spacing={0}
                      value={field.value}
                      onValueChange={(v) => {
                        if (!v) return;
                        field.onChange(v as SubscriptionTarget);
                        form.clearErrors(["vehicleGroupId", "operatorId"]);
                      }}
                      aria-label="Cible de la souscription"
                      className="w-full"
                    >
                      {(["vehicle_group", "operator"] as const).map((t) => (
                        <ToggleGroupItem key={t} value={t} className="flex-1">
                          {subscriptionTargetMeta[t].label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </Field>
                )}
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="organizationId"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="subscription-organization">
                      Client
                    </FieldLabel>
                    <OrganizationSelect
                      id="subscription-organization"
                      value={field.value || undefined}
                      disabled={Boolean(subscription)}
                      invalid={fieldState.invalid}
                      onChange={(id) => {
                        field.onChange(id ?? "");
                        form.setValue("vehicleGroupId", "");
                        form.setValue("operatorId", "");
                      }}
                    />
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : subscription ? (
                      <FieldDescription>
                        Le client d'une souscription ne change pas.
                      </FieldDescription>
                    ) : null}
                  </Field>
                )}
              />
              {target === "operator" ? (
                <Controller
                  control={form.control}
                  name="operatorId"
                  render={({ field, fieldState }) => (
                    <Field
                      className="gap-1.5"
                      data-invalid={fieldState.invalid}
                    >
                      <FieldLabel htmlFor="subscription-operator">
                        Client final (opérateur)
                      </FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!organizationId || operators.isPending}
                      >
                        <SelectTrigger
                          id="subscription-operator"
                          className="w-full"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue
                            placeholder={
                              organizationId
                                ? "Choisir un opérateur"
                                : "Choisissez d'abord le client"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectGroup>
                            {operatorRows.map((u) => {
                              const ref =
                                u.subscription &&
                                u.subscription.id !== subscription?.id
                                  ? u.subscription
                                  : null;
                              return (
                                <SelectItem
                                  key={u.id}
                                  value={u.id}
                                  disabled={Boolean(ref)}
                                >
                                  {u.fullName}
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {u.email}
                                    {ref
                                      ? ` · déjà souscrit (${ref.reference})`
                                      : ""}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : organizationId &&
                        !operators.isPending &&
                        operatorRows.length === 0 ? (
                        <FieldDescription>
                          Ce client n'a aucun opérateur.
                        </FieldDescription>
                      ) : (
                        <FieldDescription>
                          Il ne verra que l'offre de cette souscription.
                        </FieldDescription>
                      )}
                    </Field>
                  )}
                />
              ) : (
                <Controller
                  control={form.control}
                  name="vehicleGroupId"
                  render={({ field, fieldState }) => (
                    <Field
                      className="gap-1.5"
                      data-invalid={fieldState.invalid}
                    >
                      <FieldLabel htmlFor="subscription-group">
                        Groupe de véhicules
                      </FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!organizationId || groups.isPending}
                      >
                        <SelectTrigger
                          id="subscription-group"
                          className="w-full"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue
                            placeholder={
                              organizationId
                                ? "Choisir une flotte"
                                : "Choisissez d'abord le client"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectGroup>
                            {groupRows.map((g) => {
                              const ref = taken.get(g.id);
                              return (
                                <SelectItem
                                  key={g.id}
                                  value={g.id}
                                  disabled={Boolean(ref)}
                                >
                                  {g.name}
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {g.membersCount} véhicule
                                    {g.membersCount > 1 ? "s" : ""}
                                    {ref ? ` · déjà souscrit (${ref})` : ""}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : organizationId &&
                        !groups.isPending &&
                        groupRows.length === 0 ? (
                        <FieldDescription>
                          Ce client n'a aucun groupe de véhicules.
                        </FieldDescription>
                      ) : null}
                    </Field>
                  )}
                />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="offerId"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="subscription-offer">Offre</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={chooseOffer}
                      disabled={offers.isPending}
                    >
                      <SelectTrigger
                        id="subscription-offer"
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Standard, Gold, Premium, Platinum ou personnalisée" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectGroup>
                          {offerRows.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.name}
                              <span className="text-muted-foreground">
                                {" "}
                                · {formatNumber(o.price, 2)} {o.currency} /{" "}
                                {offerPeriodicityMeta[o.periodicity]?.short}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : (
                      <FieldDescription>
                        Seules les offres commercialisées sont proposées.
                      </FieldDescription>
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="offerPrice"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="subscription-price">
                      Prix de l'offre ({currency})
                    </FieldLabel>
                    <Input
                      {...field}
                      id="subscription-price"
                      inputMode="decimal"
                      placeholder="Prix de l'offre"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : (
                      <FieldDescription>
                        Figé dans la souscription, par {period}
                        {selectedOffer
                          ? ` — catalogue : ${formatNumber(selectedOffer.price, 2)}`
                          : ""}
                        .
                      </FieldDescription>
                    )}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="discount"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="subscription-discount">
                      Remise ({currency})
                    </FieldLabel>
                    <Input
                      {...field}
                      id="subscription-discount"
                      inputMode="decimal"
                      placeholder="0"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : (
                      <FieldDescription>
                        Montant retiré du prix de l'offre.
                      </FieldDescription>
                    )}
                  </Field>
                )}
              />
              <Field className="gap-1.5">
                <FieldLabel>Tarif appliqué</FieldLabel>
                <div className="flex h-9 items-center justify-between rounded-md border bg-muted/40 px-3 text-sm">
                  <span className="text-muted-foreground tabular-nums">
                    {formatNumber(offerPrice || 0, 2)} −{" "}
                    {formatNumber(discount || 0, 2)}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatNumber(total, 2)} {currency} / {period}
                  </span>
                </div>
                <FieldDescription>
                  Prix de l'offre − remise. Indépendant du nombre de véhicules.
                </FieldDescription>
              </Field>
            </div>

            <div
              className={
                subscription
                  ? "grid gap-4 sm:grid-cols-3"
                  : "grid gap-4 sm:grid-cols-4"
              }
            >
              <Controller
                control={form.control}
                name="reference"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="subscription-reference">
                      Référence
                    </FieldLabel>
                    <Input
                      {...field}
                      id="subscription-reference"
                      placeholder="Automatique"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              {subscription ? null : (
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Field className="gap-1.5">
                      <FieldLabel htmlFor="subscription-status">
                        Statut
                      </FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) =>
                          field.onChange(v as Values["status"])
                        }
                      >
                        <SelectTrigger
                          id="subscription-status"
                          className="w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectGroup>
                            <SelectItem value="draft">
                              {subscriptionStatusMeta.draft.label}
                            </SelectItem>
                            <SelectItem value="active">
                              {subscriptionStatusMeta.active.label}
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              )}
              <Controller
                control={form.control}
                name="startDate"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="subscription-start">Début</FieldLabel>
                    <Input
                      {...field}
                      id="subscription-start"
                      type="date"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="endDate"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="subscription-end">Fin</FieldLabel>
                    <Input
                      {...field}
                      id="subscription-end"
                      type="date"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="notes"
              render={({ field }) => (
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="subscription-notes">
                    Conditions particulières
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="subscription-notes"
                    rows={2}
                    placeholder="Ex. : remise de lancement"
                  />
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button type="submit" form="subscription-form" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {subscription ? "Enregistrer" : "Créer la souscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** La cible choisie seule : l'API exige exactement l'une des deux. */
function cible(
  values: Values,
): { vehicleGroupId: string } | { operatorId: string } {
  return values.target === "operator"
    ? { operatorId: values.operatorId }
    : { vehicleGroupId: values.vehicleGroupId };
}
