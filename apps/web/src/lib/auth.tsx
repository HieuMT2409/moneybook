'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { tokenStore } from './api';
import { useMe } from './queries';

/** Redirects to /login when there is no token. Renders children only once we know the user is signed in. */
export function useAuthGate() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tokenStore.get()) router.replace('/login');
    else setReady(true);
  }, [router]);

  const me = useMe(ready);
  return { ready, user: me.data };
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useCallback(() => {
    tokenStore.clear();
    queryClient.clear();
    router.replace('/login');
  }, [router, queryClient]);
}
