type Messages = Record<string, unknown>;

export function selectMessages(
  messages: Messages,
  namespaces: readonly string[],
): Messages {
  return Object.fromEntries(
    namespaces.flatMap((namespace) =>
      namespace in messages ? [[namespace, messages[namespace]]] : [],
    ),
  );
}
