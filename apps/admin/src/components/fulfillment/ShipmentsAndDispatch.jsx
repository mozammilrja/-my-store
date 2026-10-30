import React, { useState, useMemo, useEffect } from 'react';
import { Select } from '../ui/select';
import { shipmentList } from '../../data/mockData';
import { adminApi } from '../../lib/api';
import { useShipmentsQuery } from '../../hooks/useAdminQueries';

export function ShipmentsAndDispatch({ onNavigate, onShowToast }) {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'radar', 'ndr'
  const [selectedAwb, setSelectedAwb] = useState('8492019482');
  const [selectedParcels, setSelectedParcels] = useState(['8492019482']);
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [nodeFilter, setNodeFilter] = useState('all');
  const [speedFilter, setSpeedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDockScannerMode, setIsDockScannerMode] = useState(false);
  const [barcodeInputValue, setBarcodeInputValue] = useState('');
  const [shipmentsData, setShipmentsData] = useState(shipmentList);

  // TanStack Query for shipments
  const { data: shipmentsApiData, isLoading: isShipmentsLoading } = useShipmentsQuery();
  const [scannedLogs, setScannedLogs] = useState([
    {
      id: 'AWB #8492019481',
      tote: 'Tote #BG-BLR-093',
      time: '16:42:19'
    }
  ]);
  const [scanProgress, setScanProgress] = useState(92.8);
  const [isHandoverCompleted, setIsHandoverCompleted] = useState(false);

  useEffect(() => {
    if (shipmentsApiData?.shipments?.length) {
      const live = shipmentsApiData.shipments.map(s => ({
        awb: s.awb,
        orderId: `EVR-${s.displayId}`,
        carrier: s.carrier === 'delhivery' ? 'Delhivery Surface / Express' : s.carrier === 'bluedart' ? 'BlueDart Express' : 'Direct Dispatch',
        carrierCode: s.carrier,
        destination: `${s.customer?.city || 'Local'} (${s.customer?.postalCode || '560038'})`,
        node: 'BLR-FC1',
        speed: 'Express',
        status: s.status,
        stageBadge: s.status.toUpperCase(),
        bagNo: `BAG-${s.awb.slice(-4)}`,
        slaRemaining: 'On Track',
        slaHealthy: true,
        boxType: 'Eco-Kraft Box',
        weight: '480g',
        dispatchDock: 'Dock 4B',
        labelUrl: s.labelUrl,
      }));
      setShipmentsData(prev => [...live, ...prev.filter(p => !live.some(l => l.awb === p.awb))]);
    }
  }, [shipmentsApiData]);

  const filteredShipments = useMemo(() => {
    return shipmentsData.filter(item => {
      if (activeTab === 'ndr' && item.awb !== '1084920391') return false;
      if (activeTab === 'radar' && item.awb === 'SFX99201942') return false;

      if (carrierFilter !== 'all' && item.carrierCode !== carrierFilter) return false;
      if (nodeFilter !== 'all' && item.node !== nodeFilter) return false;
      if (speedFilter !== 'all' && item.speed !== speedFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !item.awb.toLowerCase().includes(q) &&
          !item.orderId.toLowerCase().includes(q) &&
          !item.destination.toLowerCase().includes(q) &&
          !item.bagNo.toLowerCase().includes(q) &&
          !item.carrier.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [activeTab, carrierFilter, nodeFilter, speedFilter, searchQuery]);

  const handleSelectParcel = (awb) => {
    setSelectedParcels(prev =>
      prev.includes(awb) ? prev.filter(x => x !== awb) : [...prev, awb]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedParcels(shipmentList.map(s => s.awb));
    } else {
      setSelectedParcels([]);
    }
  };

  const handleSimulateScan = () => {
    const awbToScan = barcodeInputValue.trim() || selectedAwb;
    setBarcodeInputValue('');
    if (onShowToast) onShowToast(`Scanning verification for AWB #${awbToScan}...`);

    setTimeout(() => {
      setScanProgress(100);
      setScannedLogs(prev => [
        {
          id: `AWB #${awbToScan}`,
          tote: 'Verified: Bag #BG-BLR-094',
          time: new Date().toLocaleTimeString('en-US', { hour12: false })
        },
        ...prev
      ]);
      if (onShowToast) onShowToast(`AWB #${awbToScan} verified ✓ 14 of 14 bags complete.`);
    }, 350);
  };

  const handleCompleteHandover = () => {
    setIsHandoverCompleted(true);
    if (onShowToast) {
      onShowToast('Carrier Handover Signed! Digital Gate Pass GP-BLR1-2405-9921 issued to Driver Ramesh Kumar. Bay 4B barrier unlocked.');
    }
  };

  return (
    <div className="space-y-space-md w-full">
      {/* Top Context Header & Actions */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-space-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              onClick={() => onNavigate && onNavigate('overview')}
              className="font-label-xs-caps text-label-xs-caps text-text-secondary tracking-wider cursor-pointer hover:text-text-primary transition-colors"
            >
              EVERWEAR ADMIN
            </span>
            <span className="text-text-secondary text-xs">/</span>
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary tracking-wider">
              FULFILLMENT &amp; ORDERS
            </span>
            <span className="text-text-secondary text-xs">/</span>
            <span className="font-label-xs-caps text-label-xs-caps text-primary-container font-semibold tracking-wider">
              SHIPMENTS &amp; DISPATCH
            </span>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap">
            <h1 className="font-headline-lg text-headline-lg text-text-primary tracking-tight font-semibold">
              Logistics Manifest, Carrier Allocation &amp; Dispatch Operations
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-status-success font-label-xs-caps text-label-xs-caps font-semibold">
              FC DOCK: ACTIVE
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-text-secondary max-w-3xl">
            Real-time courier allocation, automated manifest generation, automated AWB tracking, and carrier SLA compliance across primary FC dispatch docks.
          </p>
        </div>

        {/* Global CTA Cluster */}
        <div className="flex flex-wrap items-center gap-space-sm shrink-0">
          <button
            onClick={() => onShowToast && onShowToast('Generating bulk carrier manifest PDF document...')}
            className="h-9 px-3 rounded-xl bg-surface-container-lowest text-text-primary font-label-sm text-label-sm shadow-sm hover:bg-surface-subtle transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Generate Manifest Documentation"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px] text-secondary">picture_as_pdf</span>
            <span>Bulk Carrier Manifest (PDF)</span>
          </button>
          <button
            onClick={() => {
              setIsDockScannerMode(!isDockScannerMode);
              if (onShowToast) onShowToast(isDockScannerMode ? 'Exited Dock Scanner Mode.' : 'Dispatch Scan Dock Mode active.');
            }}
            className={`h-9 px-3 rounded-xl font-label-sm text-label-sm transition-colors flex items-center gap-1.5 cursor-pointer ${
              isDockScannerMode
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'bg-surface-subtle text-text-primary hover:bg-surface-container-high'
            }`}
            id="toggle-scanner-mode"
            title="Toggle Dock Mode"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px]">barcode_scanner</span>
            <span>Dispatch Scan Dock Mode</span>
          </button>
          <button
            onClick={() => onShowToast && onShowToast('Manual consignment wizard opened.')}
            className="h-9 px-3 rounded-xl bg-surface-container-lowest text-text-primary font-label-sm text-label-sm shadow-sm hover:bg-surface-subtle transition-colors flex items-center gap-1.5 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px] text-secondary">add_circle</span>
            <span>Manual Consignment</span>
          </button>
          <button
            onClick={() => onShowToast && onShowToast('AI Carrier SLA re-allocation run complete across 892 packages.')}
            className="h-9 px-3.5 rounded-xl bg-primary-container text-on-primary font-label-sm text-label-sm font-medium hover:bg-tertiary-container shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">autorenew</span>
            <span>Run Carrier SLA Re-Allocation</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip (Enterprise Operational Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-sm">
        {/* Stat 1 */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between space-y-space-sm relative overflow-hidden group hover:bg-surface-subtle transition-colors border border-border-subtle">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">Ready to Dispatch</span>
            <span className="material-symbols-outlined text-[18px] text-primary-container">package_2</span>
          </div>
          <div>
            <div className="font-metric-stat text-metric-stat text-text-primary tracking-tight font-bold">
              892 <span className="font-body-sm text-body-sm font-normal text-text-secondary">pkgs</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-status-warning"></span>
              <span className="font-label-xs-caps text-label-xs-caps text-status-warning font-medium">
                DOCK STAGED • BAYS 1-6
              </span>
            </div>
          </div>
          <div className="w-full bg-surface-subtle h-1 rounded-full overflow-hidden">
            <div className="bg-primary-container h-full rounded-full" style={{ width: '78%' }}></div>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between space-y-space-sm relative overflow-hidden group hover:bg-surface-subtle transition-colors border border-border-subtle">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">In-Transit Live</span>
            <span className="material-symbols-outlined text-[18px] text-status-info">local_shipping</span>
          </div>
          <div>
            <div className="font-metric-stat text-metric-stat text-text-primary tracking-tight font-bold">
              12,400 <span className="font-body-sm text-body-sm font-normal text-text-secondary">active</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="px-1.5 py-0.5 rounded-full bg-status-success-bg text-status-success font-label-xs-caps text-[10px] font-semibold">
                SLA 99.2% ON-TIME
              </span>
            </div>
          </div>
          <div className="w-full bg-surface-subtle h-1 rounded-full overflow-hidden">
            <div className="bg-status-success h-full rounded-full" style={{ width: '99.2%' }}></div>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between space-y-space-sm relative overflow-hidden group hover:bg-surface-subtle transition-colors border border-border-subtle">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">Out for Delivery</span>
            <span className="material-symbols-outlined text-[18px] text-fashion-magenta">electric_moped</span>
          </div>
          <div>
            <div className="font-metric-stat text-metric-stat text-text-primary tracking-tight font-bold">
              3,840 <span className="font-body-sm text-body-sm font-normal text-text-secondary">units</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary">Same-Day / Next-Day Target</span>
            </div>
          </div>
          <div className="w-full bg-surface-subtle h-1 rounded-full overflow-hidden">
            <div className="bg-fashion-magenta h-full rounded-full" style={{ width: '86%' }}></div>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between space-y-space-sm relative overflow-hidden group hover:bg-surface-subtle transition-colors border border-border-subtle">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps text-status-danger uppercase font-bold">3PL Carrier NDR</span>
            <span className="material-symbols-outlined text-[18px] text-status-danger">report_problem</span>
          </div>
          <div>
            <div className="font-metric-stat text-metric-stat text-status-danger tracking-tight font-bold">
              142 <span className="font-body-sm text-body-sm font-normal text-text-secondary">NDR</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="px-1.5 py-0.5 rounded-full bg-status-danger-bg text-status-danger font-label-xs-caps text-[10px] font-semibold">
                1.1% RATE • NEEDS TRIAGE
              </span>
            </div>
          </div>
          <div className="w-full bg-surface-subtle h-1 rounded-full overflow-hidden">
            <div className="bg-status-danger h-full rounded-full" style={{ width: '14%' }}></div>
          </div>
        </div>

        {/* Stat 5 */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between space-y-space-sm relative overflow-hidden group hover:bg-surface-subtle transition-colors border border-border-subtle">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">Manifested Today</span>
            <span className="material-symbols-outlined text-[18px] text-secondary">verified</span>
          </div>
          <div>
            <div className="font-metric-stat text-metric-stat text-text-primary tracking-tight font-bold">
              4,210 <span className="font-body-sm text-body-sm font-normal text-text-secondary">AWBs</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-text-secondary font-label-xs-caps text-[10px]">
              <span className="font-semibold text-text-primary">BLR</span> • BOM • DEL • CCU
            </div>
          </div>
          <div className="w-full bg-surface-subtle h-1 rounded-full overflow-hidden">
            <div className="bg-primary-container h-full rounded-full" style={{ width: '64%' }}></div>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Operational Table (8 cols) + Right Dock Handover Console (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Central Operational Column (8 cols) */}
        <div className="xl:col-span-8 space-y-4 min-w-0">
          {/* Tabs and Filters Container */}
          <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm space-y-3 border border-border-subtle">
            {/* Segmented Tab Bar */}
            <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2 border-b border-border-subtle">
              <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setActiveTab('queue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'queue'
                      ? 'bg-surface-container-lowest text-text-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary-container">outbox</span>
                  <span>Manifest Queue</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-bold">
                    892
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('radar')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'radar'
                      ? 'bg-surface-container-lowest text-text-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px] text-status-info">radar</span>
                  <span>In-Transit Radar</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-surface-subtle text-text-secondary text-[10px] font-bold">
                    12.4k
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('ndr')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'ndr'
                      ? 'bg-status-danger-bg text-status-danger shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px] text-status-danger">sync_problem</span>
                  <span>NDR &amp; Exceptions</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-status-danger-bg text-status-danger text-[10px] font-bold">
                    142
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onShowToast && onShowToast('Carrier dock telemetry synced.')}
                  className="p-1.5 text-secondary hover:text-text-primary rounded-lg bg-surface-subtle cursor-pointer"
                  title="Refresh Feed"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">sync</span>
                </button>
                <button
                  onClick={() => onShowToast && onShowToast('Column layout editor opened.')}
                  className="p-1.5 text-secondary hover:text-text-primary rounded-lg bg-surface-subtle cursor-pointer"
                  title="Column Layout"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">view_column</span>
                </button>
              </div>
            </div>

            {/* Filter Sub-Toolbar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm pt-space-xs">
              {/* AWB Search Input */}
              <div className="md:col-span-5 relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary text-[16px]">search</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-canvas font-body-sm text-body-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface-container-lowest shadow-sm transition-colors border border-border-subtle"
                  placeholder="Filter by AWB, Order ID, PIN code or Bag #..."
                  type="text"
                />
              </div>

              {/* FC Node Select */}
              <div className="md:col-span-2">
                <Select
                  value={nodeFilter}
                  onChange={(e) => setNodeFilter(e.target.value)}
                  className="h-9"
                >
                  <option value="all">Node: BLR-FC1</option>
                  <option value="bom">Node: BOM-FC2</option>
                  <option value="del">Node: DEL-FC3</option>
                  <option value="ccu">Node: CCU-FC4</option>
                </Select>
              </div>

              {/* 3PL Partner Filter */}
              <div className="md:col-span-3">
                <Select
                  value={carrierFilter}
                  onChange={(e) => setCarrierFilter(e.target.value)}
                  className="h-9"
                >
                  <option value="all">Carrier: All 3PLs</option>
                  <option value="bluedart">BlueDart Air (Priority)</option>
                  <option value="delhivery">Delhivery Direct Surface</option>
                  <option value="shadowfax">Shadowfax Hyperlocal</option>
                  <option value="xpressbees">XpressBees Express</option>
                </Select>
              </div>

              {/* Service SLA Filter */}
              <div className="md:col-span-2">
                <Select
                  value={speedFilter}
                  onChange={(e) => setSpeedFilter(e.target.value)}
                  className="h-9"
                >
                  <option value="all">Speed: All Tier</option>
                  <option value="express">Express 24h</option>
                  <option value="standard">Standard 48h</option>
                  <option value="surface">Surface Ground</option>
                </Select>
              </div>
            </div>

            {/* Quick Batch Actions Row */}
            <div className="flex flex-wrap items-center justify-between text-text-secondary pt-1 font-body-sm text-body-sm gap-2">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedParcels.length === shipmentList.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-primary-container focus:ring-0 accent-primary-container"
                  />
                  <span className="font-label-sm text-label-sm text-text-primary">Select All Pending (892)</span>
                </label>
                <span className="text-xs text-text-secondary">•</span>
                <span className="text-xs text-text-secondary">
                  Selected: <strong className="text-text-primary font-medium">{selectedParcels.length} Parcels</strong> (Total Weight: {(selectedParcels.length * 0.62).toFixed(1)} kg)
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onShowToast && onShowToast(`Printing shipping labels for ${selectedParcels.length} parcels...`)}
                  className="px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-surface-container-high text-text-primary font-label-xs-caps text-label-xs-caps tracking-wide transition-colors flex items-center gap-1 cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">local_printshop</span>
                  <span>Print Shipping Labels</span>
                </button>
                <button
                  onClick={() => onShowToast && onShowToast(`Batch assigning Bay for ${selectedParcels.length} parcels...`)}
                  className="px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-surface-container-high text-text-primary font-label-xs-caps text-label-xs-caps tracking-wide transition-colors flex items-center gap-1 cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">assignment_turned_in</span>
                  <span>Batch Assign Bay</span>
                </button>
                <button
                  onClick={() => onShowToast && onShowToast('Fast handover sequence initiated for selected batch.')}
                  className="px-2.5 py-1 rounded-lg bg-primary-container text-on-primary font-label-xs-caps text-label-xs-caps tracking-wide transition-colors flex items-center gap-1 cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">forklift</span>
                  <span>Fast Handover</span>
                </button>
              </div>
            </div>
          </div>

          {/* Core Logistics Manifest & Dispatch Table */}
          <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden border border-border-subtle">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[1020px]">
                <thead>
                  <tr className="bg-surface-subtle font-label-xs-caps text-label-xs-caps text-text-secondary uppercase select-none border-b border-border-subtle sticky top-0 z-10 backdrop-blur-sm">
                    <th className="py-2.5 px-3 w-10 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedParcels.length === shipmentList.length}
                        onChange={handleSelectAll}
                        className="w-3.5 h-3.5 rounded text-primary-container focus:ring-0 accent-primary-container cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap">AWB &amp; Carrier</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Order ID &amp; Destination PIN</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Garments / Weight</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Dispatch SLA Deadline</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Dock Status</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Handover State</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm divide-y divide-surface-subtle">
                  {filteredShipments.map(item => {
                    const isSelected = selectedAwb === item.awb;
                    const isChecked = selectedParcels.includes(item.awb);

                    return (
                      <tr
                        key={item.awb}
                        onClick={() => setSelectedAwb(item.awb)}
                        className={`transition-colors group cursor-pointer ${
                          isSelected ? 'bg-primary-fixed/20 hover:bg-primary-fixed/30' : 'bg-surface-container-lowest hover:bg-surface-subtle'
                        }`}
                      >
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleSelectParcel(item.awb)}
                            className="w-3.5 h-3.5 rounded text-primary-container focus:ring-0 accent-primary-container cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-lg ${item.carrierBg} ${item.carrierColor} flex items-center justify-center shrink-0`}>
                              <span className="material-symbols-outlined text-[18px]">{item.carrierIcon}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-label-sm text-label-sm font-semibold text-text-primary tracking-tight">
                                #{item.awb}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`font-label-xs-caps text-[10px] font-semibold ${item.carrierTextClass}`}>
                                  {item.carrier}
                                </span>
                                <span className="text-xs text-text-secondary">•</span>
                                <span className="font-label-xs-caps text-[10px] text-text-secondary uppercase">
                                  {item.carrierType}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-label-sm text-label-sm font-medium text-text-primary">
                              {item.orderId}
                            </span>
                            <span className="text-text-secondary text-xs flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[13px] text-secondary">location_on</span>
                              {item.destination}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-table-cell-num text-table-cell-num font-semibold text-text-primary">
                              {item.garments}
                            </span>
                            <span className="text-xs text-text-secondary font-table-cell-num">
                              {item.weight}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`material-symbols-outlined text-[16px] ${
                              item.slaUrgent ? 'text-status-danger animate-pulse' : 'text-status-warning'
                            }`}>
                              {item.slaUrgent ? 'timer' : 'schedule'}
                            </span>
                            <div className="flex flex-col">
                              <span className={`font-label-sm text-label-sm font-bold ${
                                item.slaUrgent ? 'text-status-danger' : 'text-status-warning'
                              }`}>
                                {item.slaCountdown}
                              </span>
                              <span className="font-label-xs-caps text-[10px] text-text-secondary">
                                {item.slaDeadline}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-xs-caps text-label-xs-caps font-semibold w-max ${item.dockStatusColor}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${item.dockDotColor}`}></span>
                              {item.dockStatus}
                            </span>
                            <span className="text-[11px] text-text-secondary">{item.bagNo}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-xs-caps text-[10px] font-medium ${item.handoverBadgeClass}`}>
                            {item.handoverState}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAwb(item.awb);
                              if (onShowToast) onShowToast(`Dock scan focused for AWB #${item.awb}`);
                            }}
                            className="h-8 px-2.5 rounded-lg bg-surface-subtle text-text-primary hover:bg-surface-container-high font-label-xs-caps text-label-xs-caps tracking-wider transition-colors inline-flex items-center gap-1 cursor-pointer"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[14px]">barcode_scanner</span>
                            <span>Scan Handover</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            <div className="p-space-sm bg-surface-canvas flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border-subtle">
              <div className="font-body-sm text-body-sm text-text-secondary">
                Showing <span className="font-medium text-text-primary">1–5</span> of <span className="font-medium text-text-primary">892</span> packages awaiting carrier departure
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-text-secondary hover:text-text-primary font-label-sm text-label-sm shadow-sm disabled:opacity-50 cursor-pointer"
                  disabled
                  type="button"
                >
                  Previous
                </button>
                <button className="px-2.5 py-1 rounded-lg bg-primary-container text-on-primary font-label-sm text-label-sm font-medium cursor-pointer" type="button">
                  1
                </button>
                <button className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-text-primary hover:bg-surface-subtle font-label-sm text-label-sm shadow-sm cursor-pointer" type="button">
                  2
                </button>
                <button className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-text-primary hover:bg-surface-subtle font-label-sm text-label-sm shadow-sm cursor-pointer" type="button">
                  3
                </button>
                <span className="text-text-secondary px-1">...</span>
                <button className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-text-primary hover:bg-surface-subtle font-label-sm text-label-sm shadow-sm cursor-pointer" type="button">
                  178
                </button>
                <button className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-text-secondary hover:text-text-primary font-label-sm text-label-sm shadow-sm cursor-pointer" type="button">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Inspector / Detail Drawer (4 cols) */}
        <div className="xl:col-span-4 space-y-space-md min-w-0">
          {/* Active Dock Manifest & Gate Pass Container */}
          <div className="rounded-xl bg-surface-container-lowest shadow-sm p-space-md space-y-space-md border border-border-subtle">
            {/* Manifest Header & Status */}
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <span className="font-label-xs-caps text-label-xs-caps text-primary-container uppercase font-bold tracking-wider">
                  LIVE DOCK DISPATCH
                </span>
                <h2 className="font-headline-sm text-headline-sm text-text-primary font-semibold">
                  Manifest #MNF-2024-BLR-0482
                </h2>
                <p className="font-body-sm text-body-sm text-text-secondary">
                  BlueDart Express Air • Priority Runway 04
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full font-label-xs-caps text-label-xs-caps font-semibold ${
                isHandoverCompleted
                  ? 'bg-status-success-bg text-status-success'
                  : 'bg-status-warning-bg text-status-warning'
              }`}>
                {isHandoverCompleted ? 'GATE PASS ISSUED' : 'IN SCANNING'}
              </span>
            </div>

            {/* Vehicle & Driver Verification Module */}
            <div className="p-space-sm rounded-xl bg-surface-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">
                  Carrier Gate Security Verification
                </span>
                <span className="flex items-center gap-1 font-label-xs-caps text-[10px] text-status-success font-semibold">
                  <span className="material-symbols-outlined text-[14px]">verified_user</span> OTP VERIFIED
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-text-primary">
                <div className="p-2 rounded-lg bg-surface-container-lowest shadow-sm">
                  <span className="text-xs text-text-secondary block">Vehicle Reg</span>
                  <span className="font-label-sm text-label-sm font-bold tracking-tight">KA-01-MJ-8821</span>
                  <span className="text-[10px] text-status-info block">E-Way Bill Linked</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-lowest shadow-sm">
                  <span className="text-xs text-text-secondary block">Assigned Driver</span>
                  <span className="font-label-sm text-label-sm font-semibold truncate block">Ramesh Kumar</span>
                  <span className="text-[10px] text-text-secondary block">DL: KA01-2018-9941</span>
                </div>
              </div>
            </div>

            {/* Consignment Load Metrics */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-surface-canvas shadow-sm">
                <span className="font-label-xs-caps text-[10px] text-text-secondary block uppercase">Bag Seal Tally</span>
                <span className="font-metric-stat text-headline-lg font-bold text-text-primary">
                  14 <span className="font-body-sm text-body-sm text-text-secondary font-normal">Bags</span>
                </span>
                <span className="text-[11px] text-status-success font-medium block">All Tamper-Evident</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-canvas shadow-sm">
                <span className="font-label-xs-caps text-[10px] text-text-secondary block uppercase">Gross Load Weight</span>
                <span className="font-metric-stat text-headline-lg font-bold text-text-primary">
                  218.4 <span className="font-body-sm text-body-sm text-text-secondary font-normal">kg</span>
                </span>
                <span className="text-[11px] text-text-secondary block">Dock Scale #2 Match</span>
              </div>
            </div>

            {/* Interactive Handover Dock Barcode Scanner Interface */}
            <div className="p-space-sm rounded-xl bg-surface-subtle space-y-space-sm border border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary-container">qr_code_scanner</span>
                  <span className="font-label-sm text-label-sm font-semibold text-text-primary">
                    Dock Handover Barcode Reader
                  </span>
                </div>
                <span className={`font-label-xs-caps text-[11px] font-semibold ${
                  scanProgress >= 100 ? 'text-status-success' : 'text-status-warning'
                }`}>
                  {scanProgress >= 100 ? '0 Pending' : '1 Pending'}
                </span>
              </div>

              {/* Live Scan Counter Progress */}
              <div>
                <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                  <span>Manifest Scan Completion</span>
                  <span className="font-medium text-text-primary">
                    {scanProgress >= 100 ? '14 / 14 Bags' : '13 / 14 Bags'} ({scanProgress.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      scanProgress >= 100 ? 'bg-status-success' : 'bg-primary-container'
                    }`}
                    style={{ width: `${scanProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* Barcode Input Simulator */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-2.5 top-2 text-text-secondary text-[16px]">
                    barcode
                  </span>
                  <input
                    value={barcodeInputValue}
                    onChange={(e) => setBarcodeInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSimulateScan()}
                    placeholder={scanProgress >= 100 ? 'All bags verified ✓' : `Scan AWB #${selectedAwb}...`}
                    className="w-full h-8 pl-8 pr-2 rounded-lg bg-surface-container-lowest text-xs text-text-primary placeholder:text-text-secondary focus:outline-none shadow-xs border border-border-subtle"
                    type="text"
                  />
                </div>
                <button
                  onClick={handleSimulateScan}
                  className="h-8 px-2.5 rounded-lg bg-primary-container text-on-primary font-label-xs-caps text-label-xs-caps font-semibold hover:bg-primary transition-all shrink-0 cursor-pointer"
                  type="button"
                >
                  Scan
                </button>
              </div>

              {/* Verified Bags Feed */}
              <div className="space-y-1 text-xs text-text-secondary">
                {scannedLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-surface-container-lowest text-status-success">
                    <div className="flex items-center gap-1 truncate">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      <span className="truncate">Verified: {log.id} ({log.tote})</span>
                    </div>
                    <span className="text-[10px] font-mono shrink-0 text-text-secondary">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Carrier Handoff Digital Gate Pass With QR */}
            <div className="p-space-sm rounded-xl bg-surface-canvas shadow-sm flex items-center justify-between gap-space-sm border border-border-subtle">
              <div className="space-y-1">
                <span className="font-label-xs-caps text-[10px] text-text-secondary uppercase">FC Gate Pass Token</span>
                <div className="font-mono text-xs font-semibold text-text-primary">GP-BLR1-2405-9921</div>
                <p className="text-[11px] text-text-secondary leading-tight">
                  Digital security validation code for FC perimeter boom barrier clearance.
                </p>
                <span className="font-label-xs-caps text-[10px] text-text-secondary">Sign-off: 24-MAY 16:40:02 IST</span>
              </div>
              {/* Real QR Code SVG Vector from code.html */}
              <div className="p-1.5 bg-surface-container-lowest rounded-lg shadow-sm shrink-0 border border-border-subtle">
                <svg className="w-16 h-16 text-text-primary" fill="currentColor" viewBox="0 0 100 100">
                  <rect fill="currentColor" height="28" width="28" x="10" y="10"></rect>
                  <rect fill="white" height="16" width="16" x="16" y="16"></rect>
                  <rect fill="currentColor" height="8" width="8" x="20" y="20"></rect>
                  <rect fill="currentColor" height="28" width="28" x="62" y="10"></rect>
                  <rect fill="white" height="16" width="16" x="68" y="16"></rect>
                  <rect fill="currentColor" height="8" width="8" x="72" y="20"></rect>
                  <rect fill="currentColor" height="28" width="28" x="10" y="62"></rect>
                  <rect fill="white" height="16" width="16" x="16" y="68"></rect>
                  <rect fill="currentColor" height="8" width="8" x="20" y="72"></rect>
                  <rect height="8" width="8" x="44" y="12"></rect>
                  <rect height="8" width="8" x="44" y="26"></rect>
                  <rect height="8" width="8" x="12" y="44"></rect>
                  <rect height="8" width="8" x="26" y="44"></rect>
                  <rect height="16" width="16" x="42" y="42"></rect>
                  <rect height="8" width="8" x="64" y="44"></rect>
                  <rect height="8" width="8" x="78" y="44"></rect>
                  <rect height="8" width="8" x="44" y="64"></rect>
                  <rect height="8" width="8" x="44" y="78"></rect>
                  <rect height="8" width="8" x="62" y="62"></rect>
                  <rect height="8" width="8" x="76" y="62"></rect>
                  <rect height="12" width="12" x="62" y="76"></rect>
                </svg>
              </div>
            </div>

            {/* Action Drawer CTAs */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleCompleteHandover}
                className={`w-full h-10 px-4 rounded-xl font-label-sm text-label-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isHandoverCompleted
                    ? 'bg-status-success text-white'
                    : 'bg-primary-container hover:bg-tertiary-container text-on-primary'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isHandoverCompleted ? 'done_all' : 'verified'}
                </span>
                <span>
                  {isHandoverCompleted ? 'Manifest Verified — Gate Pass Issued' : 'Complete Carrier Handover & Issue Gate Pass'}
                </span>
              </button>
              <button
                onClick={() => onShowToast && onShowToast('Manifest MNF-2024-BLR-0482 downloaded.')}
                className="w-full h-9 px-4 rounded-xl bg-surface-subtle hover:bg-surface-container-high text-text-primary font-label-sm text-label-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[17px] text-secondary">download</span>
                <span>Download Consignment Manifest (CSV/PDF)</span>
              </button>
            </div>
          </div>

          {/* Quick Dispatch Node Health Card */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm space-y-space-sm border border-border-subtle">
            <div className="flex items-center justify-between">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">
                FC Dock Dispatch Throughput
              </span>
              <span className="font-label-xs-caps text-[10px] text-status-success font-semibold">1,240 pkgs/hr</span>
            </div>
            {/* Live Sparkline Graphic (SVG) */}
            <div className="h-12 w-full pt-1">
              <svg className="w-full h-full text-primary-container" fill="none" viewBox="0 0 300 48">
                <path
                  d="M0,35 Q30,12 60,25 T120,8 T180,28 T240,14 T300,6"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                ></path>
                <path
                  d="M0,35 Q30,12 60,25 T120,8 T180,28 T240,14 T300,6 L300,48 L0,48 Z"
                  fill="currentColor"
                  fillOpacity="0.08"
                ></path>
                <circle cx="300" cy="6" fill="currentColor" r="3.5"></circle>
              </svg>
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary pt-1">
              <span>08:00 AM Shift</span>
              <span>Peak 14:00 (1,480 pkgs)</span>
              <span className="font-medium text-text-primary">Now (16:45)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Carrier Allocation Matrix (High Density Multi-Metric Bento Strip) */}
      <div className="rounded-xl bg-surface-container-lowest shadow-sm p-space-md space-y-space-md border border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-text-primary font-semibold">
              Carrier Performance Benchmarks &amp; Volume Allocation Matrix
            </h3>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Dynamic route-weighting algorithm allocates parcels based on delivery SLA adherence, RTO rates, and contract pricing.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary">
              Auto-Routing: <strong className="text-status-success">ACTIVE (AI V4.2)</strong>
            </span>
            <button
              onClick={() => onShowToast && onShowToast('Route-weighting rules editor opened.')}
              className="px-2.5 py-1 rounded-lg bg-surface-subtle text-text-primary text-xs hover:bg-surface-container-high transition-colors cursor-pointer"
              type="button"
            >
              Configure Rules
            </button>
          </div>
        </div>

        {/* 4 Carrier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-sm">
          {/* Carrier 1: BlueDart */}
          <div className="p-space-sm rounded-xl bg-surface-canvas shadow-sm space-y-space-sm group hover:bg-surface-subtle transition-colors border border-border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-info"></span>
                <span className="font-label-sm text-label-sm font-bold text-text-primary">BlueDart Express Air</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-status-info-bg text-status-info font-label-xs-caps text-[10px] font-bold">
                42% ALLOCATED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-text-primary pt-1">
              <div>
                <span className="text-[11px] text-text-secondary block">On-Time SLA</span>
                <span className="font-label-sm text-label-sm font-semibold text-status-success">99.4%</span>
              </div>
              <div>
                <span className="text-[11px] text-text-secondary block">Avg Freight</span>
                <span className="font-label-sm text-label-sm font-semibold text-text-primary">₹84 / kg</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-text-secondary">
                <span>Daily Volume Target</span>
                <span className="font-medium text-text-primary">5,208 / 6,000</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                <div className="bg-status-info h-full rounded-full" style={{ width: '86%' }}></div>
              </div>
            </div>
          </div>

          {/* Carrier 2: Delhivery Direct */}
          <div className="p-space-sm rounded-xl bg-surface-canvas shadow-sm space-y-space-sm group hover:bg-surface-subtle transition-colors border border-border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                <span className="font-label-sm text-label-sm font-bold text-text-primary">Delhivery Surface</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-xs-caps text-[10px] font-bold">
                34% ALLOCATED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-text-primary pt-1">
              <div>
                <span className="text-[11px] text-text-secondary block">On-Time SLA</span>
                <span className="font-label-sm text-label-sm font-semibold text-text-primary">98.6%</span>
              </div>
              <div>
                <span className="text-[11px] text-text-secondary block">Avg Freight</span>
                <span className="font-label-sm text-label-sm font-semibold text-text-primary">₹62 / kg</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-text-secondary">
                <span>Daily Volume Target</span>
                <span className="font-medium text-text-primary">4,216 / 4,500</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary-container h-full rounded-full" style={{ width: '93%' }}></div>
              </div>
            </div>
          </div>

          {/* Carrier 3: Shadowfax Local */}
          <div className="p-space-sm rounded-xl bg-surface-canvas shadow-sm space-y-space-sm group hover:bg-surface-subtle transition-colors border border-border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-fashion-magenta"></span>
                <span className="font-label-sm text-label-sm font-bold text-text-primary">Shadowfax Hyperlocal</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-fashion-magenta/10 text-fashion-magenta font-label-xs-caps text-[10px] font-bold">
                14% ALLOCATED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-text-primary pt-1">
              <div>
                <span className="text-[11px] text-text-secondary block">On-Time SLA</span>
                <span className="font-label-sm text-label-sm font-semibold text-status-success">99.1%</span>
              </div>
              <div>
                <span className="text-[11px] text-text-secondary block">Avg Freight</span>
                <span className="font-label-sm text-label-sm font-semibold text-text-primary">₹48 / drop</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-text-secondary">
                <span>Hyperlocal 2h Route</span>
                <span className="font-medium text-text-primary">1,736 / 2,000</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                <div className="bg-fashion-magenta h-full rounded-full" style={{ width: '86%' }}></div>
              </div>
            </div>
          </div>

          {/* Carrier 4: XpressBees */}
          <div className="p-space-sm rounded-xl bg-surface-canvas shadow-sm space-y-space-sm group hover:bg-surface-subtle transition-colors border border-border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-warning"></span>
                <span className="font-label-sm text-label-sm font-bold text-text-primary">XpressBees Surface</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-status-warning-bg text-status-warning font-label-xs-caps text-[10px] font-bold">
                10% ALLOCATED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-text-primary pt-1">
              <div>
                <span className="text-[11px] text-text-secondary block">On-Time SLA</span>
                <span className="font-label-sm text-label-sm font-semibold text-status-warning">97.8%</span>
              </div>
              <div>
                <span className="text-[11px] text-text-secondary block">Avg Freight</span>
                <span className="font-label-sm text-label-sm font-semibold text-text-primary">₹58 / kg</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-text-secondary">
                <span>Daily Volume Target</span>
                <span className="font-medium text-text-primary">1,240 / 1,500</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                <div className="bg-status-warning h-full rounded-full" style={{ width: '82%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
