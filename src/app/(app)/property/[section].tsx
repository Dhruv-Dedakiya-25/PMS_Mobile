import { IconCar, IconInfoCircle, IconParking } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BuildingScene } from '@/components/art';
import { Page } from '@/components/page';
import { Button, Card, Details, IconTile, Note, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { longDate, num } from '@/lib/format';
import { lease, parking, property, tenant, unit } from '@/mock/data';
import { radius, space } from '@/theme/tokens';

type Section = 'unit' | 'building' | 'parking';

/** The facts about the home: the unit itself, the building around it, or the parking that comes with it. */
export default function PropertySection() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { section } = useLocalSearchParams<{ section: Section }>();
  const code = language.code;
  const yes = (v: boolean) => t(v ? 'property.yes' : 'property.no');

  if (section === 'parking')
    return (
      <Page title={t('property.parking')}>
        {parking.map((p) => (
          <Card key={p.bay}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <IconTile icon={IconParking} size={48} />
              <View style={{ flex: 1 }}>
                <AppText variant="title" weight="bold">
                  {t('property.bay', { bay: p.bay })}
                </AppText>
                <AppText variant="small" tone="secondary">
                  {p.level}
                </AppText>
              </View>
              <Pill label={t(`property.bayKind.${p.kind}`)} accent="success" />
            </View>
            <Details
              rows={[
                [t('property.vehicle'), p.vehicle],
                [t('property.plate'), p.plate],
                [t('property.tag'), p.tag],
              ]}
            />
          </Card>
        ))}
        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconTile icon={IconCar} accent="violet" />
          <View style={{ flex: 1 }}>
            <AppText weight="semibold">{t('property.guestParking')}</AppText>
            <AppText variant="small" tone="secondary">
              {t('property.guestParkingDetail')}
            </AppText>
          </View>
        </Card>
        <Button label={t('property.inviteVisitor')} tone="outline" onPress={() => router.push('/requests/visitors')} />
      </Page>
    );

  if (section === 'building')
    return (
      <Page title={t('property.propertyDetails')}>
        <BuildingScene style={{ height: 180, borderRadius: radius.xl }} />
        <View>
          <AppText variant="title" weight="bold">
            {property.name}
          </AppText>
          <AppText tone="secondary">{property.address}</AppText>
        </View>
        <Details
          rows={[
            [t('property.developer'), property.developer],
            [t('property.completed'), String(property.completed)],
            [t('property.floors'), num(property.floors, code)],
            [t('property.totalUnits'), num(property.units, code)],
            [t('property.lifts'), num(property.lifts, code)],
            [t('property.office'), property.managementOffice],
          ]}
        />
        <Button label={t('property.seeFacilities')} tone="outline" onPress={() => router.push('/requests/facilities')} />
      </Page>
    );

  return (
    <Page title={t('property.unitInfo')}>
      <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" tone="muted">
            {property.name}
          </AppText>
          <AppText variant="title" weight="bold">
            {t('property.unitNo', { unit: property.unitNo })}
          </AppText>
          <AppText variant="small" tone="secondary">
            {t('property.buildingFloor', { building: property.building, floor: property.floor })}
          </AppText>
        </View>
        <Pill label={t('property.occupied')} accent="success" />
      </Card>
      <Details
        title={t('property.unitDetails')}
        rows={[
          [t('property.unitType'), t(`property.type.${unit.type}`)],
          [t('property.area'), `${num(unit.areaSqm, code)} m²`],
          [t('property.bedrooms'), num(unit.bedrooms, code)],
          [t('property.bathrooms'), num(unit.bathrooms, code)],
          [t('property.balcony'), yes(unit.balcony)],
          [t('property.furnishing'), t(`property.furnished.${unit.furnishing}`)],
          [t('property.view'), unit.view],
        ]}
      />
      <Details
        title={t('property.occupancy')}
        rows={[
          [t('property.tenant'), tenant.name],
          [t('property.tenantCode'), tenant.tenantCode],
          [t('property.occupants'), num(tenant.occupants, code)],
          [t('property.moveIn'), longDate(unit.moveIn, code)],
          [t('property.leaseNo'), lease.leaseNo],
        ]}
      />
      <Note icon={IconInfoCircle} text={t('property.changeNote')} />
    </Page>
  );
}
