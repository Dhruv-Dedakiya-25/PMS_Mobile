import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/screen';
import { StaffApprovals } from '@/components/staff-approvals';

/**
 * Approvals for the maintenance team, who can be a step's approver but have no
 * Operations screen. Property managers find the same list under Operations.
 */
export default function StaffApprovalsTab() {
  const { t } = useTranslation();
  return (
    <Screen title={t('staff.approvals')}>
      <StaffApprovals />
    </Screen>
  );
}
