import { Suspense } from 'react';
import { Login } from '@/components/auth/Login';

export default function SignInPage() {
  return (
    <Suspense>
      <Login mode="signin" />
    </Suspense>
  );
}
