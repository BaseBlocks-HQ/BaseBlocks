export type FormFieldType =
  | "short-text"
  | "long-text"
  | "email"
  | "number"
  | "select"
  | "checkbox"
  | "radio"
  | "date";

export interface FieldOption {
  id: string;
  value: string;
  label: string;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

export interface BaseField {
  id: string;
  type: FormFieldType;
  label: string;
  name: string;
  placeholder?: string;
  description?: string;
  validation?: FieldValidation;
  width?: "full" | "half";
}

export interface ShortTextField extends BaseField {
  type: "short-text";
}

export interface LongTextField extends BaseField {
  type: "long-text";
  rows?: number;
}

export interface EmailField extends BaseField {
  type: "email";
}

export interface NumberField extends BaseField {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
}

export interface SelectField extends BaseField {
  type: "select";
  options: FieldOption[];
}

export interface CheckboxField extends BaseField {
  type: "checkbox";
}

export interface RadioField extends BaseField {
  type: "radio";
  options: FieldOption[];
}

export interface DateField extends BaseField {
  type: "date";
}

export type FormField =
  | ShortTextField
  | LongTextField
  | EmailField
  | NumberField
  | SelectField
  | CheckboxField
  | RadioField
  | DateField;

export interface FormContent {
  fields: FormField[];
  submitLabel: string;
  successMessage: string;
}

export type FormType = "form";

export const DEFAULT_FORM_CONTENT: FormContent = {
  fields: [],
  submitLabel: "Submit",
  successMessage: "Thank you for your submission!",
};

export function generateFieldId(): string {
  return `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createField(type: FormFieldType): FormField {
  const id = generateFieldId();
  const base = {
    id,
    label: "",
    name: id,
    width: "full" as const,
  };

  switch (type) {
    case "short-text":
      return { ...base, type: "short-text", placeholder: "" };
    case "long-text":
      return { ...base, type: "long-text", placeholder: "", rows: 4 };
    case "email":
      return { ...base, type: "email", placeholder: "" };
    case "number":
      return { ...base, type: "number" };
    case "select":
      return { ...base, type: "select", options: [] };
    case "checkbox":
      return { ...base, type: "checkbox" };
    case "radio":
      return { ...base, type: "radio", options: [] };
    case "date":
      return { ...base, type: "date" };
  }
}

export function getFieldTypeLabel(type: FormFieldType): string {
  const labels: Record<FormFieldType, string> = {
    "short-text": "Short Text",
    "long-text": "Long Text",
    email: "Email",
    number: "Number",
    select: "Dropdown",
    checkbox: "Checkbox",
    radio: "Radio",
    date: "Date",
  };
  return labels[type];
}
