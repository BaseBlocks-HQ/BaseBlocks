"use client";

/**
 * Form Editor
 * Main component for building forms in the editor
 */

import type { ElementEditorProps } from "@/modules/elements/framework/registry";
import { useAutoSave } from "@/modules/elements/hooks/use-auto-save";
import type { FormContent } from "@baseblocks/types/elements";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@baseblocks/ui/tabs";
import { useState } from "react";
import { BuilderCanvas } from "./builder/builder-canvas";
import { FieldPicker } from "./builder/field-picker";
import { FieldSettingsPanel } from "./builder/field-settings";
import { FormBuilderProvider } from "./builder/form-builder-context";

export function FormEditor({
  id,
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"form">) {
  void id;
  const [localContent, setLocalContent] = useState<FormContent>(content);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const save = useAutoSave(onUpdate, onSaveStatusChange);

  const handleUpdate = (newContent: FormContent) => {
    setLocalContent(newContent);
    onSaveStatusChange?.("pending");
    save(newContent);
  };

  return (
    <FormBuilderProvider
      form={localContent}
      selectedFieldId={selectedFieldId}
      onSelectField={setSelectedFieldId}
      onUpdate={handleUpdate}
    >
      <div className="border rounded-lg bg-background overflow-hidden">
        <div className="flex h-[500px] min-h-0">
          {/* Left: Field Picker */}
          <div className="w-48 border-r bg-muted/30 flex-shrink-0 min-h-0 flex flex-col overflow-hidden">
            <FieldPicker />
          </div>

          {/* Center: Canvas */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <BuilderCanvas />
          </div>

          {/* Right: Settings */}
          <div className="w-64 border-l bg-muted/30 flex-shrink-0 min-h-0 flex flex-col overflow-hidden">
            <Tabs defaultValue="field" className="h-full flex flex-col min-h-0">
              <TabsList className="w-full rounded-none border-b h-10 bg-transparent p-0">
                <TabsTrigger
                  value="field"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Field
                </TabsTrigger>
                <TabsTrigger
                  value="form"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Form
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="field"
                className="flex-1 min-h-0 m-0 overflow-hidden flex flex-col"
              >
                <FieldSettingsPanel />
              </TabsContent>
              <TabsContent
                value="form"
                className="flex-1 min-h-0 m-0 overflow-hidden flex flex-col"
              >
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div className="p-3 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Submit Button Label</Label>
                      <Input
                        value={localContent.submitLabel}
                        onChange={(e) =>
                          handleUpdate({
                            ...localContent,
                            submitLabel: e.target.value,
                          })
                        }
                        placeholder="Submit"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Success Message</Label>
                      <Input
                        value={localContent.successMessage}
                        onChange={(e) =>
                          handleUpdate({
                            ...localContent,
                            successMessage: e.target.value,
                          })
                        }
                        placeholder="Thank you!"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </FormBuilderProvider>
  );
}
