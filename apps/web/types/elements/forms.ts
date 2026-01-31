/**
 * Form element types and content definitions
 * Form elements for building interactive forms
 */

// Form element types (stubs for future implementation)
export type FormType =
  | "form" // Form container
  | "text-input" // Text input field
  | "textarea" // Multi-line text input
  | "select" // Dropdown select
  | "checkbox" // Checkbox input
  | "radio" // Radio button group
  | "submit-button"; // Form submit button

// Form content interfaces

export interface FormContent {
  action?: string;
  method?: "GET" | "POST";
  submitLabel?: string;
  successMessage?: string;
}

export interface TextInputContent {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "email" | "password" | "tel" | "url";
}

export interface TextareaContent {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

export interface SelectContent {
  label: string;
  name: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  required?: boolean;
  placeholder?: string;
}

export interface CheckboxContent {
  label: string;
  name: string;
  checked?: boolean;
  required?: boolean;
}

export interface RadioContent {
  label: string;
  name: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  required?: boolean;
}

export interface SubmitButtonContent {
  label: string;
  variant?: "primary" | "secondary" | "outline";
}

// Union of all form content types
export type FormContentUnion =
  | FormContent
  | TextInputContent
  | TextareaContent
  | SelectContent
  | CheckboxContent
  | RadioContent
  | SubmitButtonContent;

// Default content for new form elements
export const DEFAULT_FORM_CONTENT: Record<FormType, FormContentUnion> = {
  form: {
    method: "POST",
    submitLabel: "Submit",
    successMessage: "Form submitted successfully!",
  },
  "text-input": {
    label: "Text Field",
    name: "text_field",
    placeholder: "Enter text...",
    type: "text",
  },
  textarea: {
    label: "Message",
    name: "message",
    placeholder: "Enter your message...",
    rows: 4,
  },
  select: {
    label: "Select Option",
    name: "select_field",
    options: [],
    placeholder: "Choose an option...",
  },
  checkbox: {
    label: "Checkbox",
    name: "checkbox_field",
    checked: false,
  },
  radio: {
    label: "Radio Group",
    name: "radio_field",
    options: [],
  },
  "submit-button": {
    label: "Submit",
    variant: "primary",
  },
};
