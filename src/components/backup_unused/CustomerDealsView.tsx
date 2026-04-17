// src/components/CustomerDealsView.tsx
// Lightweight compatibility wrapper so any import of CustomerDealsView
// resolves to the real CustomerDealsViewComponent (Hot Deals 2x2 grid).
import React from 'react';
import CustomerDealsViewComponent from '@/components/CustomerDealsViewComponent';

// Named export for imports that expect { CustomerDealsView }
export { CustomerDealsViewComponent as CustomerDealsView };

type Props = any;

export default function CustomerDealsView(props: Props) {
  return <CustomerDealsViewComponent {...props} />;
}