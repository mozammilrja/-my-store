import React, { useState, useMemo, useEffect } from 'react';
import {
  Icon,
  Button,
  Badge,
  Select,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  ErrorState,
  SkeletonPage,
  SearchInput,
  TablePagination,
} from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
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
  const {
    data: shipmentsApiData,
    isLoading: isShipmentsLoading,
    isError: isShipmentsError,
    error: shipmentsError,
    refetch: refetchShipments,
  } = useShipmentsQuery();
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

  // One shared pager over the rows this module actually holds.
  const shipmentsPager = useClientTable(filteredShipments);

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

  if (isShipmentsLoading) {
    return <SkeletonPage variant="table" stats={6} statsCols={6} columns={7} label="Loading shipments" />;
  }

  return (
    <PageContainer>
      {shipmentsError && (
        <ErrorState
          title="Shipments could not be loaded"
          message={shipmentsError?.message}
          onRetry={() => refetchShipments()}
        />
      )}
      {/* Top Context Header & Actions */}
      <PageHeader
        breadcrumb={['Everwear Admin', 'Fulfillment & Orders', 'Shipments & Dispatch']}
        title="Logistics Manifest, Carrier Allocation & Dispatch Operations"
        badge="FC DOCK: ACTIVE"
        badgeVariant="success"
        description="Real-time courier allocation, automated manifest generation, automated AWB tracking, and carrier SLA compliance across primary FC dispatch docks."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast && onShowToast('Generating bulk carrier manifest PDF document...')}
              className="gap-1.5 shadow-sm"
              title="Generate Manifest Documentation"
              type="button"
            >
              <Icon name="picture_as_pdf" className="material-symbols-outlined text-icon text-muted" />
              <span>Bulk Manifest (PDF)</span>
            </Button>
            <Button
              variant={isDockScannerMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsDockScannerMode(!isDockScannerMode);
                if (onShowToast) onShowToast(isDockScannerMode ? 'Exited Dock Scanner Mode.' : 'Dispatch Scan Dock Mode active.');
              }}
              className="gap-1.5"
              id="toggle-scanner-mode"
              type="button"
            >
              <Icon name="barcode_scanner" className="material-symbols-outlined text-icon" />
              <span>Dispatch Scan Mode</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast && onShowToast('Manual consignment wizard opened.')}
              className="gap-1.5 shadow-sm"
              type="button"
            >
              <Icon name="add_circle" className="material-symbols-outlined text-icon text-muted" />
              <span>Manual Consignment</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => onShowToast && onShowToast('AI Carrier SLA re-allocation run complete across 892 packages.')}
              className="gap-1.5 bg-primary-container text-on-accent hover:bg-primary-container-hover shadow-sm"
              type="button"
            >
              <Icon name="autorenew" className="material-symbols-outlined text-icon" />
              <span>Carrier Re-Allocation</span>
            </Button>
          </>
        }
      />

      {/* KPI Metric Strip */}
      <ContentGrid columns={5}>
        <StatsCard
          title="Ready to Dispatch"
          value="892 pkgs"
          icon="package_2"
          badge="Bays 1-6"
          badgeVariant="warning"
          trendLabel="Dock staged"
        />
        <StatsCard
          title="In-Transit Live"
          value="12,400 active"
          icon="local_shipping"
          iconColor="text-info"
          badge="SLA 99.2%"
          badgeVariant="success"
          trendLabel="On-time transit"
        />
        <StatsCard
          title="Out for Delivery"
          value="3,840 units"
          icon="electric_moped"
          iconColor="text-accent"
          trendLabel="Same-Day / Next-Day Target"
        />
        <StatsCard
          title="3PL Carrier NDR"
          value="142 NDR"
          icon="report_problem"
          iconColor="text-danger"
          badge="1.1% Rate"
          badgeVariant="destructive"
          trendLabel="Needs Triage"
        />
        <StatsCard
          title="Manifested Today"
          value="4,210 AWBs"
          icon="verified"
          trendLabel="BLR • BOM • DEL • CCU"
        />
      </ContentGrid>

      {/* Main Split Layout: Left Operational Table (8 cols) + Right Dock Handover Console (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Central Operational Column (8 cols) */}
        <div className="xl:col-span-8 space-y-4 min-w-0">
          {/* Tabs and Filters Container */}
          <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm space-y-3 border border-subtle">
            {/* Segmented Tab Bar */}
            <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2 border-b border-subtle">
              <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setActiveTab('queue')}
                  className={`px-3 py-1.5 rounded-lg text-meta font-semibold flex items-center gap-2 transition-all cursor-pointer ${
 activeTab === 'queue'
 ? 'bg-surface-container-lowest text-primary shadow-xs'
 : 'text-muted hover:text-primary'
 }`}
                  type="button"
                >
                  <Icon name="outbox" className="material-symbols-outlined text-icon text-accent" />
                  <span>Manifest Queue</span>
                  <span className="px-1.5 py-px rounded-full bg-primary-fixed text-on-primary-fixed text-micro font-semibold">
                    892
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('radar')}
                  className={`px-3 py-1.5 rounded-lg text-meta font-semibold flex items-center gap-2 transition-all cursor-pointer ${
 activeTab === 'radar'
 ? 'bg-surface-container-lowest text-primary shadow-xs'
 : 'text-muted hover:text-primary'
 }`}
                  type="button"
                >
                  <Icon name="radar" className="material-symbols-outlined text-icon text-info" />
                  <span>In-Transit Radar</span>
                  <span className="px-1.5 py-px rounded-full bg-surface-subtle text-muted text-micro font-semibold">
                    12.4k
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('ndr')}
                  className={`px-3 py-1.5 rounded-lg text-meta font-semibold flex items-center gap-2 transition-all cursor-pointer ${
 activeTab === 'ndr'
 ? 'bg-status-danger-bg text-danger shadow-xs'
 : 'text-muted hover:text-primary'
 }`}
                  type="button"
                >
                  <Icon name="sync_problem" className="material-symbols-outlined text-icon text-danger" />
                  <span>NDR &amp; Exceptions</span>
                  <span className="px-1.5 py-px rounded-full bg-status-danger-bg text-danger text-micro font-semibold">
                    142
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onShowToast && onShowToast('Carrier dock telemetry synced.')}
                  className="p-1.5 text-muted hover:text-primary rounded-lg bg-surface-subtle cursor-pointer"
                  title="Refresh Feed"
                  type="button"
                >
                  <Icon name="sync" className="material-symbols-outlined text-icon-md" />
                </button>
                <button
                  onClick={() => onShowToast && onShowToast('Column layout editor opened.')}
                  className="p-1.5 text-muted hover:text-primary rounded-lg bg-surface-subtle cursor-pointer"
                  title="Column Layout"
                  type="button"
                >
                  <Icon name="view_column" className="material-symbols-outlined text-icon-md" />
                </button>
              </div>
            </div>

            {/* Filter Sub-Toolbar */}
            <div className="flex flex-wrap items-center gap-space-sm pt-space-xs">
              {/* AWB Search Input */}
              <SearchInput
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
                onClear={() => setSearchQuery('')}
                placeholder="Filter by AWB, order ID, PIN or bag"
                label="Filter shipments"
                className="min-w-[16rem] flex-1"
              />

              {/* FC Node Select */}
              <div className="min-w-[10rem]">
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
              <div className="min-w-[13rem]">
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
              <div className="min-w-[11rem]">
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
            <div className="flex flex-wrap items-center justify-between text-secondary pt-1 text-body gap-2">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedParcels.length === shipmentList.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-accent focus:ring-0 accent-primary-container"
                  />
                  <span className="text-label text-primary">Select All Pending (892)</span>
                </label>
                <span className="text-meta text-muted">•</span>
                <span className="text-meta text-muted">
                  Selected: <strong className="text-primary font-medium">{selectedParcels.length} Parcels</strong> (Total Weight: {(selectedParcels.length * 0.62).toFixed(1)} kg)
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onShowToast && onShowToast(`Printing shipping labels for ${selectedParcels.length} parcels...`)}
                  className="px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-surface-container-high text-primary text-caption tracking-wide transition-colors flex items-center gap-1 cursor-pointer"
                  type="button"
                >
                  <Icon name="local_printshop" className="material-symbols-outlined text-icon-sm" />
                  <span>Print Shipping Labels</span>
                </button>
                <button
                  onClick={() => onShowToast && onShowToast(`Batch assigning Bay for ${selectedParcels.length} parcels...`)}
                  className="px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-surface-container-high text-primary text-caption tracking-wide transition-colors flex items-center gap-1 cursor-pointer"
                  type="button"
                >
                  <Icon name="assignment_turned_in" className="material-symbols-outlined text-icon-sm" />
                  <span>Batch Assign Bay</span>
                </button>
                <button
                  onClick={() => onShowToast && onShowToast('Fast handover sequence initiated for selected batch.')}
                  className="px-2.5 py-1 rounded-lg bg-primary-container text-on-accent text-caption tracking-wide transition-colors flex items-center gap-1 cursor-pointer"
                  type="button"
                >
                  <Icon name="forklift" className="material-symbols-outlined text-icon-sm" />
                  <span>Fast Handover</span>
                </button>
              </div>
            </div>
          </div>

          {/* Core Logistics Manifest & Dispatch Table */}
          <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden border border-subtle">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[1020px]">
                <thead>
                  <tr className="bg-surface-subtle text-muted text-caption uppercase tracking-wider border-b border-subtle select-none sticky top-0 z-10">
                    <th className="py-2.5 px-3 w-10 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedParcels.length === shipmentList.length}
                        onChange={handleSelectAll}
                        className="w-3.5 h-3.5 rounded text-accent focus:ring-0 accent-primary-container cursor-pointer"
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
                <tbody className="text-body divide-y divide-border-subtle">
                  {shipmentsPager.pageRows.map(item => {
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
                            className="w-3.5 h-3.5 rounded text-accent focus:ring-0 accent-primary-container cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-lg ${item.carrierBg} ${item.carrierColor} flex items-center justify-center shrink-0`}>
                              <Icon name={item.carrierIcon} className="material-symbols-outlined text-icon-md" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-label font-semibold text-primary tracking-tight">
                                #{item.awb}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-micro font-semibold ${item.carrierTextClass}`}>
                                  {item.carrier}
                                </span>
                                <span className="text-meta text-muted">•</span>
                                <span className="text-caption text-muted uppercase">
                                  {item.carrierType}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="text-label font-medium text-primary">
                              {item.orderId}
                            </span>
                            <span className="text-muted text-meta flex items-center gap-1 mt-0.5">
                              <Icon name="location_on" className="material-symbols-outlined text-icon-sm text-muted" />
                              {item.destination}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="text-num font-semibold text-primary">
                              {item.garments}
                            </span>
                            <span className="text-meta text-muted">
                              {item.weight}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <Icon name={item.slaUrgent ? 'timer' : 'schedule'} className={`material-symbols-outlined text-icon ${
 item.slaUrgent ? 'text-danger animate-pulse' : 'text-warning'
 }`} />
                            <div className="flex flex-col">
                              <span className={`text-label font-semibold ${
 item.slaUrgent ? 'text-danger' : 'text-warning'
 }`}>
                                {item.slaCountdown}
                              </span>
                              <span className="text-micro text-muted">
                                {item.slaDeadline}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-semibold w-max ${item.dockStatusColor}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${item.dockDotColor}`}></span>
                              {item.dockStatus}
                            </span>
                            <span className="text-micro text-muted">{item.bagNo}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-micro ${item.handoverBadgeClass}`}>
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
                            className="h-8 px-2.5 rounded-lg bg-surface-subtle text-primary hover:bg-surface-container-high text-caption tracking-wider transition-colors inline-flex items-center gap-1 cursor-pointer"
                            type="button"
                          >
                            <Icon name="barcode_scanner" className="material-symbols-outlined text-icon-sm" />
                            <span>Scan Handover</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={shipmentsPager.page}
              pageSize={shipmentsPager.limit}
              totalItems={shipmentsPager.total}
              onPageChange={shipmentsPager.setPage}
              onPageSizeChange={shipmentsPager.setLimit}
            />
          </div>
        </div>

        {/* Right Inspector / Detail Drawer (4 cols) */}
        <div className="xl:col-span-4 space-y-space-md min-w-0">
          {/* Active Dock Manifest & Gate Pass Container */}
          <div className="rounded-xl bg-surface-container-lowest shadow-sm p-space-md space-y-space-md border border-subtle">
            {/* Manifest Header & Status */}
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <span className="text-caption text-accent uppercase font-semibold tracking-wider">
                  LIVE DOCK DISPATCH
                </span>
                <h2 className="text-subheading text-primary font-semibold">
                  Manifest #MNF-2024-BLR-0482
                </h2>
                <p className="text-body text-secondary">
                  BlueDart Express Air • Priority Runway 04
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-caption font-semibold ${
 isHandoverCompleted
 ? 'bg-status-success-bg text-success'
 : 'bg-status-warning-bg text-warning'
 }`}>
                {isHandoverCompleted ? 'GATE PASS ISSUED' : 'IN SCANNING'}
              </span>
            </div>

            {/* Vehicle & Driver Verification Module */}
            <div className="p-space-sm rounded-xl bg-surface-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-caption text-muted uppercase">
                  Carrier Gate Security Verification
                </span>
                <span className="flex items-center gap-1 text-micro text-success font-semibold">
                  <Icon name="verified_user" className="material-symbols-outlined text-icon-sm" /> OTP VERIFIED
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-primary">
                <div className="p-2 rounded-lg bg-surface-container-lowest shadow-sm">
                  <span className="text-meta text-muted block">Vehicle Reg</span>
                  <span className="text-label font-semibold tracking-tight">KA-01-MJ-8821</span>
                  <span className="text-micro text-info block">E-Way Bill Linked</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-lowest shadow-sm">
                  <span className="text-meta text-muted block">Assigned Driver</span>
                  <span className="text-label font-semibold truncate block">Ramesh Kumar</span>
                  <span className="text-micro text-muted block">DL: KA01-2018-9941</span>
                </div>
              </div>
            </div>

            {/* Consignment Load Metrics */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-surface-canvas shadow-sm">
                <span className="text-caption text-muted block uppercase">Bag Seal Tally</span>
                <span className="text-title font-semibold text-primary">
                  14 <span className="text-body text-secondary font-normal">Bags</span>
                </span>
                <span className="text-micro text-success block">All Tamper-Evident</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-canvas shadow-sm">
                <span className="text-caption text-muted block uppercase">Gross Load Weight</span>
                <span className="text-title font-semibold text-primary">
                  218.4 <span className="text-body text-secondary font-normal">kg</span>
                </span>
                <span className="text-micro text-muted block">Dock Scale #2 Match</span>
              </div>
            </div>

            {/* Interactive Handover Dock Barcode Scanner Interface */}
            <div className="p-space-sm rounded-xl bg-surface-subtle space-y-space-sm border border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon name="qr_code_scanner" className="material-symbols-outlined text-icon-md text-accent" />
                  <span className="text-label font-semibold text-primary">
                    Dock Handover Barcode Reader
                  </span>
                </div>
                <span className={`text-micro font-semibold ${
 scanProgress >= 100 ? 'text-success' : 'text-warning'
 }`}>
                  {scanProgress >= 100 ? '0 Pending' : '1 Pending'}
                </span>
              </div>

              {/* Live Scan Counter Progress */}
              <div>
                <div className="flex items-center justify-between text-meta text-muted mb-1">
                  <span>Manifest Scan Completion</span>
                  <span className="font-medium text-primary">
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
                  <Icon name="barcode" className="material-symbols-outlined absolute left-2.5 top-2 text-muted text-icon" />
                  <input
                    value={barcodeInputValue}
                    onChange={(e) => setBarcodeInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSimulateScan()}
                    placeholder={scanProgress >= 100 ? 'All bags verified ✓' : `Scan AWB #${selectedAwb}...`}
                    className="w-full h-8 pl-8 pr-2 rounded-lg bg-surface-container-lowest text-meta text-primary placeholder:text-muted focus:outline-none shadow-xs border border-subtle"
                    type="text"
                  />
                </div>
                <button
                  onClick={handleSimulateScan}
                  className="h-8 px-2.5 rounded-lg bg-primary-container text-on-accent text-caption font-semibold hover:bg-primary-container-hover transition-all shrink-0 cursor-pointer"
                  type="button"
                >
                  Scan
                </button>
              </div>

              {/* Verified Bags Feed */}
              <div className="space-y-1 text-meta text-muted">
                {scannedLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-surface-container-lowest text-success">
                    <div className="flex items-center gap-1 truncate">
                      <Icon name="check_circle" className="material-symbols-outlined text-icon-sm" />
                      <span className="truncate">Verified: {log.id} ({log.tote})</span>
                    </div>
                    <span className="text-micro font-mono shrink-0 text-muted whitespace-nowrap">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Carrier Handoff Digital Gate Pass With QR */}
            <div className="p-space-sm rounded-xl bg-surface-canvas shadow-sm flex items-center justify-between gap-space-sm border border-subtle">
              <div className="space-y-1">
                <span className="text-caption text-muted uppercase">FC Gate Pass Token</span>
                <div className="font-mono text-meta font-semibold text-primary whitespace-nowrap">GP-BLR1-2405-9921</div>
                <p className="text-micro text-muted leading-tight">
                  Digital security validation code for FC perimeter boom barrier clearance.
                </p>
                <span className="text-micro text-muted">Sign-off: 24-MAY 16:40:02 IST</span>
              </div>
              {/* Real QR Code SVG Vector from code.html */}
              <div className="p-1.5 bg-surface-container-lowest rounded-lg shadow-sm shrink-0 border border-subtle">
                <svg className="w-16 h-16 text-primary" fill="currentColor" viewBox="0 0 100 100">
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
                className={`w-full h-10 px-4 rounded-xl text-label font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
 isHandoverCompleted
 ? 'bg-status-success-solid text-on-accent'
 : 'bg-primary-container hover:bg-tertiary-container text-on-accent'
 }`}
                type="button"
              >
                <Icon name={isHandoverCompleted ? 'done_all' : 'verified'} className="material-symbols-outlined text-icon-md" />
                <span>
                  {isHandoverCompleted ? 'Manifest Verified — Gate Pass Issued' : 'Complete Carrier Handover & Issue Gate Pass'}
                </span>
              </button>
              <button
                onClick={() => onShowToast && onShowToast('Manifest MNF-2024-BLR-0482 downloaded.')}
                className="w-full h-9 px-4 rounded-xl bg-surface-subtle hover:bg-surface-container-high text-primary text-label transition-colors flex items-center justify-center gap-2 cursor-pointer"
                type="button"
              >
                <Icon name="download" className="material-symbols-outlined text-icon text-muted" />
                <span>Download Consignment Manifest (CSV/PDF)</span>
              </button>
            </div>
          </div>

          {/* Quick Dispatch Node Health Card */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm space-y-space-sm border border-subtle">
            <div className="flex items-center justify-between">
              <span className="text-caption text-muted uppercase">
                FC Dock Dispatch Throughput
              </span>
              <span className="text-micro text-success font-semibold">1,240 pkgs/hr</span>
            </div>
            {/* Live Sparkline Graphic (SVG) */}
            <div className="h-12 w-full pt-1">
              <svg className="w-full h-full text-accent" fill="none" viewBox="0 0 300 48">
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
            <div className="flex items-center justify-between text-meta text-muted pt-1">
              <span>08:00 AM Shift</span>
              <span>Peak 14:00 (1,480 pkgs)</span>
              <span className="font-medium text-primary">Now (16:45)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Carrier Allocation Matrix (High Density Multi-Metric Bento Strip) */}
      <div className="rounded-xl bg-surface-container-lowest shadow-sm p-space-md space-y-space-md border border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-subheading text-primary font-semibold">
              Carrier Performance Benchmarks &amp; Volume Allocation Matrix
            </h3>
            <p className="text-body text-secondary">
              Dynamic route-weighting algorithm allocates parcels based on delivery SLA adherence, RTO rates, and contract pricing.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-caption text-muted">
              Auto-Routing: <strong className="text-success">ACTIVE (AI V4.2)</strong>
            </span>
            <button
              onClick={() => onShowToast && onShowToast('Route-weighting rules editor opened.')}
              className="px-2.5 py-1 rounded-lg bg-surface-subtle text-primary text-meta hover:bg-surface-container-high transition-colors cursor-pointer"
              type="button"
            >
              Configure Rules
            </button>
          </div>
        </div>

        {/* 4 Carrier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-sm">
          {/* Carrier 1: BlueDart */}
          <div className="p-space-sm rounded-xl bg-surface-canvas shadow-sm space-y-space-sm group hover:bg-surface-subtle transition-colors border border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-info"></span>
                <span className="text-label font-semibold text-primary">BlueDart Express Air</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-status-info-bg text-info text-micro font-semibold">
                42% ALLOCATED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-primary pt-1">
              <div>
                <span className="text-micro text-muted block">On-Time SLA</span>
                <span className="text-label font-semibold text-success">99.4%</span>
              </div>
              <div>
                <span className="text-micro text-muted block">Avg Freight</span>
                <span className="text-label font-semibold text-primary">₹84 / kg</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-micro text-muted">
                <span>Daily Volume Target</span>
                <span className="font-medium text-primary">5,208 / 6,000</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                <div className="bg-status-info h-full rounded-full" style={{ width: '86%' }}></div>
              </div>
            </div>
          </div>

          {/* Carrier 2: Delhivery Direct */}
          <div className="p-space-sm rounded-xl bg-surface-canvas shadow-sm space-y-space-sm group hover:bg-surface-subtle transition-colors border border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                <span className="text-label font-semibold text-primary">Delhivery Surface</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-micro font-semibold">
                34% ALLOCATED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-primary pt-1">
              <div>
                <span className="text-micro text-muted block">On-Time SLA</span>
                <span className="text-label font-semibold text-primary">98.6%</span>
              </div>
              <div>
                <span className="text-micro text-muted block">Avg Freight</span>
                <span className="text-label font-semibold text-primary">₹62 / kg</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-micro text-muted">
                <span>Daily Volume Target</span>
                <span className="font-medium text-primary">4,216 / 4,500</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary-container h-full rounded-full" style={{ width: '93%' }}></div>
              </div>
            </div>
          </div>

          {/* Carrier 3: Shadowfax Local */}
          <div className="p-space-sm rounded-xl bg-surface-canvas shadow-sm space-y-space-sm group hover:bg-surface-subtle transition-colors border border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-fashion-magenta"></span>
                <span className="text-label font-semibold text-primary">Shadowfax Hyperlocal</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-micro font-semibold">
                14% ALLOCATED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-primary pt-1">
              <div>
                <span className="text-micro text-muted block">On-Time SLA</span>
                <span className="text-label font-semibold text-success">99.1%</span>
              </div>
              <div>
                <span className="text-micro text-muted block">Avg Freight</span>
                <span className="text-label font-semibold text-primary">₹48 / drop</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-micro text-muted">
                <span>Hyperlocal 2h Route</span>
                <span className="font-medium text-primary">1,736 / 2,000</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                <div className="bg-fashion-magenta h-full rounded-full" style={{ width: '86%' }}></div>
              </div>
            </div>
          </div>

          {/* Carrier 4: XpressBees */}
          <div className="p-space-sm rounded-xl bg-surface-canvas shadow-sm space-y-space-sm group hover:bg-surface-subtle transition-colors border border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-warning"></span>
                <span className="text-label font-semibold text-primary">XpressBees Surface</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-status-warning-bg text-warning text-micro font-semibold">
                10% ALLOCATED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-primary pt-1">
              <div>
                <span className="text-micro text-muted block">On-Time SLA</span>
                <span className="text-label font-semibold text-warning">97.8%</span>
              </div>
              <div>
                <span className="text-micro text-muted block">Avg Freight</span>
                <span className="text-label font-semibold text-primary">₹58 / kg</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-micro text-muted">
                <span>Daily Volume Target</span>
                <span className="font-medium text-primary">1,240 / 1,500</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                <div className="bg-status-warning h-full rounded-full" style={{ width: '82%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
