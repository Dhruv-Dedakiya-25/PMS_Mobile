import type { TFunction } from 'i18next';
import { useEffect, useRef, useState } from 'react';

import type {
  InspectionCondition,
  InspectionItemDto,
  InspectionStatus,
  InspectionType,
} from '@/api/types';
import type { Accent } from '@/theme/tokens';

export const TYPE_LABEL: Record<InspectionType, string> = {
  MoveIn: 'inspection.type.MoveIn',
  MoveOut: 'inspection.type.MoveOut',
  Routine: 'inspection.type.Routine',
  Emergency: 'inspection.type.Emergency',
};

export const STATUS_LABEL: Record<InspectionStatus, string> = {
  Scheduled: 'inspection.status.Scheduled',
  InProgress: 'inspection.status.InProgress',
  Completed: 'inspection.status.Completed',
  Cancelled: 'inspection.status.Cancelled',
};

export const STATUS_ACCENT: Record<InspectionStatus, Accent> = {
  Scheduled: 'teal',
  InProgress: 'warning',
  Completed: 'success',
  Cancelled: 'danger',
};

export const CONDITION_ACCENT: Record<InspectionCondition, Accent> = {
  Good: 'success',
  Fair: 'warning',
  Damaged: 'danger',
  NotApplicable: 'primary',
  Unchecked: 'primary',
};

export const CONDITION_LABEL: Record<InspectionCondition, string> = {
  Good: 'inspection.condition.good',
  Fair: 'inspection.condition.fair',
  Damaged: 'inspection.condition.damaged',
  NotApplicable: 'inspection.condition.notApplicable',
  Unchecked: 'inspection.condition.unchecked',
};

export const CONDITIONS: Exclude<InspectionCondition, 'Unchecked'>[] = [
  'Good',
  'Fair',
  'Damaged',
  'NotApplicable',
];

/** Standard item area in the reader's language; custom typed area stays as typed. */
export const itemArea = (t: TFunction, item: Pick<InspectionItemDto, 'area' | 'templateKey'>) =>
  item.templateKey
    ? t(`inspection.areas.${item.templateKey.split('.')[0]}`, { defaultValue: item.area })
    : item.area;

/** Standard item name in the reader's language; custom typed name stays as typed. */
export const itemName = (t: TFunction, item: Pick<InspectionItemDto, 'name' | 'templateKey'>) =>
  item.templateKey ? t(`inspection.items.${item.templateKey}`, { defaultValue: item.name }) : item.name;

/** Items grouped by area, in checklist order. */
export const byArea = (t: TFunction, items: InspectionItemDto[]) => {
  const groups = new Map<string, InspectionItemDto[]>();
  [...items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach((item) => {
      const area = itemArea(t, item);
      groups.set(area, [...(groups.get(area) ?? []), item]);
    });
  return [...groups.entries()];
};

/** Each item photo as a data URI by photo id, each one requested once (a failed one again on the next load). */
export function usePhotoUris(items: InspectionItemDto[] | undefined, load: (photoId: string) => Promise<string>) {
  const [uris, setUris] = useState<Record<string, string>>({});
  const requested = useRef(new Set<string>());
  useEffect(() => {
    items?.flatMap((item) => item.photos ?? []).forEach(({ id }) => {
      if (requested.current.has(id)) return;
      requested.current.add(id);
      load(id)
        .then((uri) => setUris((prev) => ({ ...prev, [id]: uri })))
        .catch(() => requested.current.delete(id));
    });
  }, [items, load]);
  return uris;
}
