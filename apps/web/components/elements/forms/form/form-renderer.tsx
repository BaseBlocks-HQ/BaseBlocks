"use client";

/**
 * Form Renderer
 * Renders the form for end users (published view)
 */

import type { ElementRendererProps } from "@/components/elements/registry";
import type { FormContent } from "@/types/elements";
import { useState, useCallback } from "react";
import { getFieldRenderer } from "./builder/field-registry";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";

// Import fields to register them
import "./fields";

type FormValues = Record<string, unknown>;
type FormErrors = Record<string, string>;

export function FormRenderer({ id, content }: ElementRendererProps<"form">) {
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error when user starts typing
    setErrors((prev) => {
      if (prev[fieldName]) {
        const { [fieldName]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    for (const field of content.fields) {
      const value = values[field.name];

      if (field.validation?.required) {
        if (value === undefined || value === null || value === "") {
          newErrors[field.name] = `${field.label || "This field"} is required`;
        }
      }

      if (field.validation?.minLength && typeof value === "string") {
        if (value.length < field.validation.minLength) {
          newErrors[field.name] = `Must be at least ${field.validation.minLength} characters`;
        }
      }

      if (field.validation?.maxLength && typeof value === "string") {
        if (value.length > field.validation.maxLength) {
          newErrors[field.name] = `Must be no more than ${field.validation.maxLength} characters`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [content.fields, values]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate form submission
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Form submitted:", values);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-lg font-medium">{content.successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {content.fields.map((field) => {
        const Renderer = getFieldRenderer(field.type);

        if (!Renderer) {
          return (
            <div key={field.id} className="text-sm text-muted-foreground">
              Unknown field type: {field.type}
            </div>
          );
        }

        return (
          <Renderer
            key={field.id}
            field={field}
            value={values[field.name]}
            onChange={(value) => handleFieldChange(field.name, value)}
            error={errors[field.name]}
          />
        );
      })}

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          content.submitLabel
        )}
      </Button>
    </form>
  );
}
