export type ReleaseChange = {
  entityType: "site" | "page" | "library" | "folder" | "file";
  entityId: string;
  changeType: "added" | "updated" | "deleted" | "moved";
  label: string;
  details: string[];
};

function same(valueA: unknown, valueB: unknown) {
  return JSON.stringify(valueA) === JSON.stringify(valueB);
}

export function diffReleaseEntities<
  TCurrent extends { _id: string },
  TReleased,
>(options: {
  entityType: ReleaseChange["entityType"];
  current: TCurrent[];
  released: TReleased[];
  releasedId: (value: TReleased) => string;
  label: (value: TCurrent | TReleased) => string;
  fields: Array<{
    name: string;
    current: (value: TCurrent) => unknown;
    released: (value: TReleased) => unknown;
    movement?: boolean;
  }>;
}): ReleaseChange[] {
  const changes: ReleaseChange[] = [];
  const currentById = new Map(
    options.current.map((value) => [value._id, value]),
  );
  const releasedById = new Map(
    options.released.map((value) => [options.releasedId(value), value]),
  );

  for (const value of options.current) {
    const previous = releasedById.get(value._id);
    if (!previous) {
      changes.push({
        entityType: options.entityType,
        entityId: value._id,
        changeType: "added",
        label: options.label(value),
        details: ["Added"],
      });
      continue;
    }
    const changedFields = options.fields.filter(
      (field) => !same(field.current(value), field.released(previous)),
    );
    if (changedFields.length === 0) continue;
    changes.push({
      entityType: options.entityType,
      entityId: value._id,
      changeType: changedFields.every((field) => field.movement)
        ? "moved"
        : "updated",
      label: options.label(value),
      details: changedFields.map((field) => field.name),
    });
  }

  for (const value of options.released) {
    const id = options.releasedId(value);
    if (currentById.has(id)) continue;
    changes.push({
      entityType: options.entityType,
      entityId: id,
      changeType: "deleted",
      label: options.label(value),
      details: ["Deleted"],
    });
  }
  return changes;
}
