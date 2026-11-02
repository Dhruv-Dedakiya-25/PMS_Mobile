import { Redirect } from 'expo-router';

import { useSession } from '@/hooks/use-tenancy';

/** An old or mistyped link (such as the retired /welcome) opens the app's start instead of an error page. */
export default function NotFound() {
  const { signedIn } = useSession();
  return <Redirect href={signedIn ? '/' : '/sign-in'} />;
}
