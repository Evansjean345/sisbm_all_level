"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCreateOffer, useOfferFeatures, useUpdateOffer } from "@/hooks/api/use-offers";
import { getErrorMessage } from "@/lib/axios";
import {
  type CreateOfferPayload,
  GPS_HISTORY_DAYS,
  OFFER_CODE_PATTERN,
  OFFER_PERIODICITIES,
  OFFER_STATUSES,
  type Offer,
  type OfferPeriodicity,
  type OfferStatus,
  offerPeriodicityMeta,
  offerStatusMeta,
  type UpdateOfferPayload,
} from "@/types/offer";

import { groupFeaturesByModule } from "./offer-utils";

const schema = z
  .object({
    code: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .refine((v) => OFFER_CODE_PATTERN.test(v), { message: "2 à 40 caractères : lettres, chiffres, - et _." }),
    name: z.string().trim().min(2, { message: "2 caractères minimum." }).max(120),
    description: z.string().trim().max(2000),
    price: z
      .string()
      .trim()
      .refine((v) => /^\d+([.,]\d{1,2})?$/.test(v), { message: "Montant positif, 2 décimales au plus." }),
    periodicity: z.enum(OFFER_PERIODICITIES),
    status: z.enum(OFFER_STATUSES),
    launchedOn: z.string(),
    features: z.array(z.string()),
    /** Vide = illimité. */
    maxVehicles: z
      .string()
      .trim()
      .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1), { message: "Entier ≥ 1, ou vide." }),
    gpsHistoryDays: z
      .string()
      .trim()
      .refine((v) => /^\d+$/.test(v) && Number(v) >= GPS_HISTORY_DAYS.min && Number(v) <= GPS_HISTORY_DAYS.max, {
        message: "Entre 1 et 3 650 jours.",
      }),
  })
  .superRefine((v, ctx) => {
    if (v.status === "active" && !v.launchedOn) {
      ctx.addIssue({ code: "custom", path: ["launchedOn"], message: "Obligatoire pour une offre commercialisée." });
    }
  });

type FormInput = z.input<typeof schema>;
type Values = z.output<typeof schema>;

function toDefaults(offer?: Offer, activate = false): FormInput {
  return {
    code: offer?.code ?? "",
    name: offer?.name ?? "",
    description: offer?.description ?? "",
    price: offer ? String(Number(offer.price)) : "",
    periodicity: offer?.periodicity ?? "monthly",
    status: activate ? "active" : (offer?.status ?? "inactive"),
    launchedOn: offer?.launchedOn?.slice(0, 10) ?? "",
    features: offer?.features ?? [],
    maxVehicles: offer?.maxVehicles ? String(offer.maxVehicles) : "",
    gpsHistoryDays: String(offer?.gpsHistoryDays ?? GPS_HISTORY_DAYS.default),
  };
}

/**
 * Création ou modification d'une offre. Les fonctionnalités se cochent par
 * module, d'après le catalogue de l'API ; une offre naît inactive, et une
 * offre commercialisée exige une date de commercialisation.
 */
export function OfferFormDialog({
  open,
  onOpenChange,
  offer,
  activate = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent = création. */
  offer?: Offer;
  /** Ouvre le formulaire statut « Commercialisée » (activation d'une offre sans date). */
  activate?: boolean;
}) {
  const create = useCreateOffer();
  const update = useUpdateOffer();
  const features = useOfferFeatures();
  const pending = create.isPending || update.isPending;
  const form = useForm<FormInput, unknown, Values>({ resolver: zodResolver(schema), defaultValues: toDefaults(offer) });
  const status = form.watch("status");

  useEffect(() => {
    if (open) form.reset(toDefaults(offer, activate));
  }, [open, offer, activate, form]);

  function onSubmit(values: Values) {
    const common = {
      code: values.code,
      name: values.name,
      price: Number(values.price.replace(",", ".")),
      periodicity: values.periodicity,
      status: values.status,
      maxVehicles: values.maxVehicles === "" ? null : Number(values.maxVehicles),
      gpsHistoryDays: Number(values.gpsHistoryDays),
      features: values.features,
    };
    const handlers = {
      onSuccess: () => {
        toast.success(offer ? "Offre mise à jour" : "Offre créée", { description: values.name });
        onOpenChange(false);
      },
      onError: (error: unknown) =>
        toast.error(offer ? "Mise à jour impossible" : "Création impossible", { description: getErrorMessage(error) }),
    };
    if (offer) {
      const payload: UpdateOfferPayload = {
        ...common,
        description: values.description || null,
        launchedOn: values.launchedOn || null,
      };
      update.mutate({ id: offer.id, payload }, handlers);
    } else {
      const payload: CreateOfferPayload = {
        ...common,
        description: values.description || undefined,
        launchedOn: values.launchedOn || undefined,
      };
      create.mutate(payload, handlers);
    }
  }

  const modules = groupFeaturesByModule(features.data ?? []);

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{offer ? `Modifier l'offre ${offer.name}` : "Nouvelle offre"}</DialogTitle>
          <DialogDescription>
            Les fonctionnalités cochées définissent les pages du tableau de bord Admin ouvertes aux organisations qui
            détiennent l'offre.
          </DialogDescription>
        </DialogHeader>

        <form id="offer-form" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Controller
                control={form.control}
                name="code"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="offer-code">Code</FieldLabel>
                    <Input
                      {...field}
                      id="offer-code"
                      placeholder="GOLD"
                      className="uppercase"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5 sm:col-span-2" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="offer-name">Nom</FieldLabel>
                    <Input {...field} id="offer-name" placeholder="Gold" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="description"
              render={({ field }) => (
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="offer-description">Description</FieldLabel>
                  <Textarea {...field} id="offer-description" rows={2} />
                </Field>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Controller
                control={form.control}
                name="price"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="offer-price">Tarif (FCFA)</FieldLabel>
                    <Input
                      {...field}
                      id="offer-price"
                      inputMode="decimal"
                      placeholder="15000"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>Par période de facturation.</FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="periodicity"
                render={({ field }) => (
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="offer-periodicity">Périodicité</FieldLabel>
                    <Select value={field.value} onValueChange={(v) => field.onChange(v as OfferPeriodicity)}>
                      <SelectTrigger id="offer-periodicity" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectGroup>
                          {OFFER_PERIODICITIES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {offerPeriodicityMeta[p].label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="offer-status">Statut</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v as OfferStatus);
                        if (v === "inactive") form.clearErrors("launchedOn");
                      }}
                    >
                      <SelectTrigger id="offer-status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectGroup>
                          {OFFER_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {offerStatusMeta[s].label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="launchedOn"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="offer-launch">Commercialisation</FieldLabel>
                    <Input {...field} id="offer-launch" type="date" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : status === "active" ? (
                      <FieldDescription>Obligatoire.</FieldDescription>
                    ) : null}
                  </Field>
                )}
              />
            </div>

            <FieldSet>
              <FieldLegend variant="label">Limitations</FieldLegend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="maxVehicles"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="offer-maxVehicles">Véhicules max.</FieldLabel>
                      <Input
                        {...field}
                        id="offer-maxVehicles"
                        inputMode="numeric"
                        placeholder="Illimité"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : (
                        <FieldDescription>Laisser vide pour « illimité ».</FieldDescription>
                      )}
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="gpsHistoryDays"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="offer-gpsHistoryDays">Historique GPS (jours)</FieldLabel>
                      <Input
                        {...field}
                        id="offer-gpsHistoryDays"
                        inputMode="numeric"
                        placeholder="30"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : (
                        <FieldDescription>Profondeur des trajets consultables.</FieldDescription>
                      )}
                    </Field>
                  )}
                />
              </div>
            </FieldSet>

            <Controller
              control={form.control}
              name="features"
              render={({ field }) => {
                const selected = new Set(field.value);
                const toggle = (key: string, checked: boolean) => {
                  const next = new Set(selected);
                  if (checked) next.add(key);
                  else next.delete(key);
                  field.onChange([...next]);
                };
                return (
                  <FieldSet>
                    <FieldLegend variant="label">
                      Fonctionnalités incluses ({selected.size}/{features.data?.length ?? 0})
                    </FieldLegend>
                    {features.isPending ? (
                      <p className="text-muted-foreground text-sm">Chargement du catalogue…</p>
                    ) : features.isError ? (
                      <p className="text-destructive text-sm">{getErrorMessage(features.error)}</p>
                    ) : (
                      <div className="grid gap-x-6 gap-y-4 rounded-lg border p-4 sm:grid-cols-2">
                        {modules.map(({ module, items }) => (
                          <div key={module} className="flex flex-col gap-2">
                            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                              {module}
                            </span>
                            {items.map((feature) => (
                              <Field key={feature.key} orientation="horizontal" className="items-start gap-2">
                                <Checkbox
                                  id={`feature-${feature.key}`}
                                  checked={selected.has(feature.key)}
                                  onCheckedChange={(c) => toggle(feature.key, c === true)}
                                />
                                <FieldLabel htmlFor={`feature-${feature.key}`} className="font-normal">
                                  {feature.label}
                                </FieldLabel>
                              </Field>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </FieldSet>
                );
              }}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="offer-form" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {offer ? "Enregistrer" : "Créer l'offre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
