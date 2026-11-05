import React, { useState } from 'react';
import { PageContainer, PageHeader, Tabs, TabsList, TabsTrigger } from '../ui';
import { WarehousesTab } from './WarehousesTab';
import { StockTab } from './StockTab';
import { StaffTab } from './StaffTab';
import { FulfilmentsTab } from './FulfilmentsTab';

/*
 * Warehouse operations, from the warehouse and fulfilment APIs: the
 * buildings orders ship from (and their courier pickup names), stock per
 * building with its ledger, the floor staff who use the warehouse app, and
 * the fulfilment board with overrides. Every number comes from the API.
 */

const TABS = [
  { id: 'warehouses', label: 'Warehouses' },
  { id: 'stock', label: 'Stock' },
  { id: 'staff', label: 'Staff' },
  { id: 'fulfilments', label: 'Fulfilments' },
];

export function WarehouseOperations({ onShowToast }) {
  const [tab, setTab] = useState('warehouses');
  return (
    <PageContainer>
      <PageHeader
        kicker="Logistics"
        title="Warehouse operations"
        description="Buildings, stock and its ledger, floor staff and the fulfilment board. Packing happens in the warehouse app."
      />
      <Tabs value={tab} onValueChange={setTab} className="gap-space-lg">
        <TabsList aria-label="Warehouse operations">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tab === 'warehouses' && <WarehousesTab onShowToast={onShowToast} />}
        {tab === 'stock' && <StockTab onShowToast={onShowToast} />}
        {tab === 'staff' && <StaffTab onShowToast={onShowToast} />}
        {tab === 'fulfilments' && <FulfilmentsTab onShowToast={onShowToast} />}
      </Tabs>
    </PageContainer>
  );
}
