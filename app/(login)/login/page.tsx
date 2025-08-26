import { Suspense } from 'react';
import { Login } from '../login';

export default function LoginPage() {
  return (
    <Suspense>
      <Login mode="signin" />
    </Suspense>
  );
}
