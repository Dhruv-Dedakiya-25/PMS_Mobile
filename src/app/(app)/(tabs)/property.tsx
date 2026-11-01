import {
  IconBolt, IconBuildingCommunity, IconCreditCard, IconFileText, IconFolder, IconHome, IconParking, IconSwimming, type Icon,
} from '@tabler/icons-react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BuildingScene } from '@/components/art';
import { Screen } from '@/components/screen';
import { Card, Details, IconTile, ListRow, Onward } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, num, omr } from '@/lib/format';
import { lease, parking, property, unit } from '@/mock/data';
import { nextRentMonth, unpaidUtilities, useMockState } from '@/mock/store';
import { radius, space, type Accent } from '@/theme/tokens';

/** The tenant's home: the building, the unit's facts, and the lease, rent, bills and papers that go with it. */
export default function MyProperty() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const state = useMockState();
  const code = language.code;

  const tiles: { icon: Icon; label: string; href: Href }[] = [
    { icon: IconHome, label: t('property.unitInfo'), href: '/property/unit' },
    { icon: IconBuildingCommunity, label: t('property.propertyDetails'), href: '/property/building' },
    { icon: IconSwimming, label: t('property.facilities'), href: '/requests/facilities' },
    { icon: IconParking, label: t('property.parking'), href: '/property/parking' },
  ];
  const unpaid = unpaidUtilities(state);
  const manage: { icon: Icon; accent: Accent; label: string; detail: string; href: Href }[] = [
    { icon: IconFileText, accent: 'success', label: t('lease.title'), detail: t('property.leaseDetail', { date: longDate(lease.end, code) }), href: '/lease' },
    { icon: IconCreditCard, accent: 'primary', label: t('pay.title'), detail: t('property.rentDetail', { amount: omr(lease.rent, code), date: longDate(nextRentMonth(state), code) }), href: '/payments' },
    {
      icon: IconBolt, accent: 'orange', label: t('util.title'),
      detail: unpaid.length ? t('property.billsDue', { count: unpaid.length }) : t('property.billsPaid'), href: '/utilities',
    },
    { icon: IconFolder, accent: 'teal', label: t('docs.title'), detail: t('property.docsDetail'), href: '/documents' },
  ];

  return (
    <Screen title={t('tabs.property')}>
      <Card padded={false} onPress={() => router.push('/property/building')} style={{ overflow: 'hidden', gap: 0 }}>
        <BuildingScene style={{ height: 150 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: space.lg, gap: space.md }}>
          <View style={{ flex: 1 }}>
            <AppText weight="semibold">{property.name}</AppText>
            <AppText variant="small" tone="secondary">
              {t('home.unitLine', { building: property.building, floor: property.floor, unit: property.unitNo })}
            </AppText>
          </View>
          <Onward />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {tiles.map((tile) => (
          <Card key={tile.label} onPress={() => router.push(tile.href)} style={{ width: '47%', flexGrow: 1, alignItems: 'center', paddingVertical: space.xl, gap: space.sm }}>
            <IconTile icon={tile.icon} size={46} />
            <AppText variant="small" weight="semibold" align="center">
              {tile.label}
            </AppText>
          </Card>
        ))}
      </View>

      <Details
        title={t('property.unitDetails')}
        rows={[
          [t('property.unitType'), t(`property.type.${unit.type}`)],
          [t('property.area'), `${num(unit.areaSqm, code)} m²`],
          [t('property.parking'), parking.map((p) => t('property.parkingLine', { level: p.level, bay: p.bay })).join(', ')],
          [t('property.moveIn'), longDate(unit.moveIn, code)],
        ]}
      />

      <View style={{ gap: space.md }}>
        <AppText variant="bodyLarge" weight="semibold">
          {t('property.manage')}
        </AppText>
        <Card padded={false} style={{ gap: 0, overflow: 'hidden', borderRadius: radius.xl }}>
          {manage.map((m, i) => (
            <ListRow key={m.label} icon={m.icon} accent={m.accent} label={m.label} detail={m.detail} onPress={() => router.push(m.href)} first={i === 0} />
          ))}
        </Card>
      </View>
    </Screen>
  );
}

