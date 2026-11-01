import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { utilityLook } from '@/components/utility-look';
import { Button, Card, IconTile, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { daysUntil, longDate, monthName, num, omr } from '@/lib/format';
import { monthStart } from '@/mock/clock';
import { payUtility, unpaidUtilities, useMockState } from '@/mock/store';
import { accentColors, radius, space, usePalette } from '@/theme/tokens';

/** Electricity, water, cooling and the service charge: this month's bill, six months of use, and paying it. */
export default function Utilities() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const state = useMockState();
  const code = language.code;
  const due = unpaidUtilities(state).reduce((sum, u) => sum + u.amount, 0);
  const months = [5, 4, 3, 2, 1, 0].map((back) => monthName(monthStart(back), code));

  return (
    <Page title={t('util.title')}>
      <View style={{ backgroundColor: palette.hero, borderRadius: radius.xl, padding: space.lg, gap: 2 }}>
        <AppText variant="small" style={{ color: palette.heroMuted }}>
          {t('util.totalDue')}
        </AppText>
        <AppText variant="heading" weight="bold" style={{ color: palette.heroText }}>
          {omr(due, code, true)}
        </AppText>
        <AppText variant="caption" style={{ color: palette.heroMuted }}>
          {t('util.billMonth', { month: monthName(monthStart(0), code) })}
        </AppText>
      </View>

      {state.utilities.map((u) => {
        const look = utilityLook[u.kind];
        const [, color] = accentColors(palette, look.accent);
        const top = Math.max(...u.usage);
        const days = daysUntil(u.due);
        return (
          <Card key={u.kind}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <IconTile icon={look.icon} accent={look.accent} size={44} />
              <View style={{ flex: 1 }}>
                <AppText weight="semibold">{t(`util.kind.${u.kind}`)}</AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  {u.provider} · {u.account}
                </AppText>
              </View>
              <AppText variant="bodyLarge" weight="bold">
                {omr(u.amount, code, true)}
              </AppText>
            </View>

            {u.kind !== 'service' ? (
              <View style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 64 }}>
                  {u.usage.map((value, i) => (
                    <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                      <View style={{ width: '70%', height: (value / top) * 48, borderRadius: 4, backgroundColor: color, opacity: i === u.usage.length - 1 ? 1 : 0.35 }} />
                      <AppText variant="caption" tone="muted" style={{ fontSize: 10, lineHeight: 12 }}>
                        {months[i]}
                      </AppText>
                    </View>
                  ))}
                </View>
                <AppText variant="caption" tone="secondary">
                  {t('util.usedThisMonth', { amount: num(u.usage[u.usage.length - 1], code), unit: u.unit })}
                </AppText>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Pill label={u.paid ? t('util.paid') : t('util.dueIn', { count: days })} accent={u.paid ? 'success' : days <= 7 ? 'warning' : 'primary'} />
                {!u.paid ? (
                  <AppText variant="caption" tone="muted">
                    {t('pay.dueOn', { date: longDate(u.due, code) })}
                  </AppText>
                ) : null}
              </View>
              {!u.paid ? (
                <Button
                  label={t('pay.payNow')}
                  compact
                  onPress={() => {
                    payUtility(u.kind);
                    router.push({ pathname: '/done', params: { kind: 'utility', ref: u.account } });
                  }}
                />
              ) : null}
            </View>
          </Card>
        );
      })}
    </Page>
  );
}
