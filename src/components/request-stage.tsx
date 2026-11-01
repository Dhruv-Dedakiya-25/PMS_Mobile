import { IconCheck } from '@tabler/icons-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useLanguage } from '@/i18n';
import { longDate } from '@/lib/format';
import { stageOrder, type MaintenanceRequest, type RequestStage } from '@/mock/data';
import { accentColors, space, usePalette, type Accent } from '@/theme/tokens';

export const stageAccent: Record<RequestStage, Accent> = {
  submitted: 'primary',
  assigned: 'violet',
  inProgress: 'orange',
  completed: 'success',
};

/** A request's way from submitted to completed: each stage reached is ticked with its date. */
export function StageTracker({ request }: { request: MaintenanceRequest }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const current = stageOrder.indexOf(request.stage);
  return (
    <View>
      {stageOrder.map((stage, i) => {
        const reached = i <= current;
        const [, fg] = accentColors(palette, stageAccent[request.stage]);
        const at = request.stages[stage];
        return (
          <View key={stage} style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ alignItems: 'center', width: 24 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: reached ? fg : palette.card,
                  borderWidth: 2,
                  borderColor: reached ? fg : palette.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {reached ? <IconCheck size={14} color="#FFFFFF" strokeWidth={3} /> : null}
              </View>
              {i < stageOrder.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 22, backgroundColor: i < current ? fg : palette.border }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: space.lg }}>
              <AppText weight={i === current ? 'semibold' : 'medium'} tone={reached ? 'default' : 'muted'}>
                {t(`maint.stage.${stage}`)}
              </AppText>
              <AppText variant="caption" tone="muted">
                {at ? longDate(at, language.code) : t(`maint.stageHint.${stage}`)}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}
