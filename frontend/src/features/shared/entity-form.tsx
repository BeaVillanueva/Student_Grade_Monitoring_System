import { useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Input,
  PasswordInput,
  Select,
  Textarea,
} from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/display";
import { FormField } from "@/components/shared/form-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  DialogClose,
} from "@/components/ui/overlays";
import { normalizeApiError } from "@/api/errors";
import { validationFeedback } from "@/lib/validation-feedback";
export interface FieldDefinition {
  name: string;
  label: string;
  type?:
    "text" | "email" | "number" | "date" | "password" | "select" | "textarea";
  required?: boolean;
  step?: number;
  description?: string;
  options?: { value: string | number; label: string }[];
}
export function EntityForm({
  fields,
  schema,
  defaults,
  confirmation,
  onSave,
}: {
  fields: FieldDefinition[];
  schema: z.ZodType;
  defaults: Record<string, unknown>;
  confirmation: string;
  onSave: (values: Record<string, unknown>) => Promise<void>;
}) {
  const [review, setReview] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [failure, setFailure] = useState<string | null>(null);
  // Dynamic field definitions are paired with a strict schema; services validate
  // the parsed payload again. No credentials are sent through mutation variables.
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(
      schema as z.ZodType<Record<string, unknown>, Record<string, unknown>>,
    ) as Resolver<Record<string, unknown>>,
    defaultValues: defaults,
  });
  const rootError = errors[""]?.message;
  return (
    <>
      <form
        className="space-y-5"
        aria-label="Record form"
        aria-busy={saving}
        noValidate
        onSubmit={handleSubmit((values) => {
          setFailure(null);
          setReview(values);
        })}
      >
        {failure && (
          <Alert tone="danger" title="The record was not saved">
            {failure}
          </Alert>
        )}
        {rootError && (
          <Alert tone="danger" title="Review your changes">
            {String(rootError)}
          </Alert>
        )}
        {fields.map((field) => (
          <FormField
            key={field.name}
            label={field.label}
            description={field.description}
            required={field.required}
            error={
              errors[field.name]?.message
                ? validationFeedback(errors[field.name]?.message)
                : undefined
            }
          >
            {(a11y) => {
              const registration = register(
                field.name,
                field.type === "number" ||
                  (field.type === "select" &&
                    field.options?.some(
                      (option) => typeof option.value === "number",
                    ))
                  ? {
                      setValueAs: (value) =>
                        value === "" ? NaN : Number(value),
                    }
                  : {},
              );
              const common = { ...a11y, ...registration, disabled: saving };
              if (field.type === "password")
                return (
                  <PasswordInput {...common} autoComplete="new-password" />
                );
              if (field.type === "textarea") return <Textarea {...common} />;
              if (field.type === "select")
                return (
                  <Select {...common}>
                    <option value="">Choose an option</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                );
              return (
                <Input
                  {...common}
                  type={field.type ?? "text"}
                  step={field.type === "number" ? (field.step ?? 1) : undefined}
                />
              );
            }}
          </FormField>
        ))}
        <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={saving}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" disabled={saving}>
            Review and save
          </Button>
        </div>
      </form>
      <AlertDialog
        open={review !== null}
        onOpenChange={(open) => {
          if (!saving && !open) setReview(null);
        }}
      >
        <AlertDialogContent title="Confirm changes" description={confirmation}>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={saving}>
              Back to form
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              disabled={saving}
              onClick={async (event) => {
                event.preventDefault();
                if (!review || savingRef.current) return;
                const payload = review;
                savingRef.current = true;
                setSaving(true);
                fields
                  .filter((field) => field.type === "password")
                  .forEach((field) => setValue(field.name, ""));
                try {
                  await onSave(payload);
                  setReview(null);
                } catch (error) {
                  setFailure(normalizeApiError(error, "protected").message);
                  setReview(null);
                } finally {
                  savingRef.current = false;
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving…" : "Confirm save"}
            </Button>
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
