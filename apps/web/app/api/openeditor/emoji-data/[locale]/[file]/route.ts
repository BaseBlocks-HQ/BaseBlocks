import { createOpenEditorEmojiDataResponse } from "@openeditor/emoji/data";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { locale: "en", file: "data.json" },
    { locale: "en", file: "messages.json" },
  ];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; file: string }> },
) {
  const { locale, file } = await params;
  return createOpenEditorEmojiDataResponse(locale, file);
}
