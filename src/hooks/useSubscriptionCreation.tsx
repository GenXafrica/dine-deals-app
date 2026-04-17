import { useMemo } from 'react';

export const useSubscriptionCreation = () => {
  return useMemo(
    () => ({
      loading: false,
      error: null,
      createSubscription: async () => {
        throw new Error('Legacy subscription creation removed. Use the current paid subscription flow.');
      },
      createStarterSubscription: async () => {
        throw new Error('Free starter path removed. Use the current paid subscription flow.');
      },
      refetchSubscription: async () => null,
    }),
    []
  );
};

export default useSubscriptionCreation;