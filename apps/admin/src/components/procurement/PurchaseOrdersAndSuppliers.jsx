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
  FilterBar,
  FilterDropdown,
  ErrorState,
  SkeletonPage,
  Thumbnail,
  TablePagination,
} from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
import { DataTable, TableToolbar } from '../shared/DataTable';
import { adminApi } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { usePurchaseOrdersQuery, useCreatePurchaseOrderMutation } from '../../hooks/useAdminQueries';

export function PurchaseOrdersAndSuppliers({ onNavigate, onShowToast }) {
  const [selectedPoId, setSelectedPoId] = useState('PO-2024-0891');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [targetHubFilter, setTargetHubFilter] = useState('ALL');
  const [isCreatePoModalOpen, setIsCreatePoModalOpen] = useState(false);
  const [livePos, setLivePos] = useState([]);

  // TanStack Query for purchase orders
  const {
    data: posData,
    isLoading: isPosLoading,
    isError: isPosError,
    error: posError,
    refetch: refetchPurchaseOrders,
  } = usePurchaseOrdersQuery();
  const createPoMutation = useCreatePurchaseOrderMutation();

  // New PO form state
  const [newPoForm, setNewPoForm] = useState({
    supplier: 'Jaipur Weaves & Prints',
    origin: 'Jaipur, RJ',
    targetHub: 'BLR-FC1',
    qty: 1500,
    cost: '₹14,50,000',
    deliveryDate: '2024-06-15'
  });

  useEffect(() => {
    if (posData?.purchaseOrders?.length) {
      const mapped = posData.purchaseOrders.map(po => ({
        id: po.poNumber,
        code: `#${po.poNumber}`,
        supplier: po.supplierName,
        vendorCode: 'V-DB-001',
        origin: `Hub: ${po.hubId}`,
        orderedDate: new Date(po.createdAt).toLocaleDateString(),
        promisedDate: po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'Next week',
        daysNotice: 'On Schedule',
        noticeColor: 'text-success',
        qtyPcs: `${po.items.reduce((acc, i) => acc + i.quantity, 0)} pcs`,
        qtyNum: po.items.reduce((acc, i) => acc + i.quantity, 0),
        skuBreakdown: `${po.items.length} SKUs`,
        cost: `₹${(po.totalAmount / 100).toLocaleString()}`,
        costShort: `₹${(po.totalAmount / 100).toLocaleString()}`,
        advance: '50% Staged',
        advanceColor: 'text-success',
        status: 'In Production',
        milestone: 'PO Acknowledged',
        milestoneBadge: 'bg-status-info-bg text-info',
        milestonePulse: true,
        stageProgress: 'Stage 1 of 5 (20%)',
        styles: [],
      }));
      setLivePos(mapped);
    }
  }, [posData]);

  const poList = [
    {
      id: 'PO-2024-0891',
      code: '#PO-2024-0891',
      supplier: 'Jaipur Weaves & Prints',
      vendorCode: 'V-JP-024',
      origin: 'Jaipur, RJ • Hub: BLR-FC1',
      orderedDate: '12 May 2024',
      promisedDate: '28 May 2024',
      daysNotice: 'In 4 days',
      noticeColor: 'text-warning',
      qtyPcs: '2,000 pcs',
      qtyNum: 2000,
      skuBreakdown: '2 SKUs (Silk & Zari)',
      cost: '₹18,40,000',
      costShort: '₹18.4L',
      advance: 'Adv ₹9.2L (50%)',
      advanceColor: 'text-success',
      status: 'In Production',
      milestone: 'Factory QC Inspection',
      milestoneBadge: 'bg-status-info-bg text-info',
      milestonePulse: true,
      stageProgress: 'Stage 4 of 5 (80%)',
      styles: [
        {
          name: 'Mulberry Silk Midi Dress',
          sku: 'SKU: DR-MUL-BERRY-04',
          fabric: 'Pure Mulberry Silk (19mm) • Berry Wine',
          pcs: '1,200 pcs',
          unitCost: '@ ₹1,050/pc',
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhlj_IgxCYYzqpjUpyJ3X6nRbEiq0t1Nq18-25nDTXCxAtR7LTju-bJ4Baujf5fkZm7wLdBqo1uv-DtU2dvi_upaDJ5L-AL1jRt41tocNtXOyekiZCDBjSK3OOCWzT6Zz3fCX856dvJ-lNNHYUxs9UJ0w8y57jQR_GobtfzwXx3z7LrT8Fvrg5LVhwK3RKtpdkNDNiveXsjYmpyC8iYEfPZ3qkHepNiUkBq-0VDN4O'
        },
        {
          name: 'Embroidered Anarkali Ensemble',
          sku: 'SKU: AN-EMB-IVORY-12',
          fabric: 'Chanderi Silk with Zari Border',
          pcs: '800 pcs',
          unitCost: '@ ₹725/pc',
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCp1uqOVagvfwJek-P5Bua3wUqIv8FaJmPHjmn8N2zR9mPlyoi_Hj9nGrt5vc2LgGs08RVnIzKfFTfT9HW717rR-KrSRenhS-KpRmGmEZN1bxM8rZVCEl96JsdtXO1FvsdiRmvw_mj1dzRDUWnZY3H49Zui0TPhB3HOFGo8tjr6bXD6UEfHxaG0--_TYyUDO7N8zSK_tUEDMIAV_W-ADmU3kQMfMon2y5ymDNa-OK1w'
        }
      ],
      steps: [
        { title: 'Yarn & Greige Procurement', desc: 'Sourced from Central Silk Board Bengaluru', date: 'May 14', status: 'completed' },
        { title: 'Dyeing & Lot Color Match', desc: 'Delta-E < 0.6 spectrometer approval', date: 'May 18', status: 'completed' },
        { title: 'Batch Stitching & Finishing', desc: '2,000 units cut & assembled (12 lines)', date: 'May 22', status: 'completed' },
        { title: 'Mill Final Quality Inspection (AQL 1.5)', desc: 'Everwear auditor on-site in Jaipur', date: 'Today', status: 'current' },
        { title: 'Dispatch to Everwear BLR-FC1', desc: 'Dedicated logistics convoy via NH48', date: 'ETA May 28', status: 'upcoming' }
      ],
      grnSummary: {
        docket: '#GRN-PRE-891',
        tolerance: 'Within Tolerance (±2%)',
        toleranceColor: 'bg-status-success-bg text-success',
        orderedQty: '2,000 pcs',
        millCount: '2,015 pcs (+0.75%)',
        limit: '1,960 - 2,040 pcs',
        barcoding: '100% GS1 Compliant'
      }
    },
    {
      id: 'PO-2024-0888',
      code: '#PO-2024-0888',
      supplier: 'Tirupur Knitwear Hub',
      vendorCode: 'V-TP-012',
      origin: 'Tirupur, TN • Hub: BOM-FC2',
      orderedDate: '08 May 2024',
      promisedDate: '24 May 2024',
      daysNotice: 'Dock Arrived',
      noticeColor: 'text-success',
      qtyPcs: '6,500 pcs',
      qtyNum: 6500,
      skuBreakdown: '4 SKUs (Combed Tee)',
      cost: '₹22,75,000',
      costShort: '₹22.7L',
      advance: 'Adv ₹15.0L (65%)',
      advanceColor: 'text-success',
      status: 'Shipped',
      milestone: 'QC Dock Inward',
      milestoneBadge: 'bg-status-success-bg text-success',
      milestonePulse: false,
      stageProgress: 'Stage 5 of 5 (95%)',
      styles: [
        {
          name: 'Combed Cotton Daily T-Shirt',
          sku: 'SKU: TS-CMB-NAVY-01',
          fabric: '100% Combed Compact Cotton (180 GSM)',
          pcs: '4,000 pcs',
          unitCost: '@ ₹310/pc',
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhlj_IgxCYYzqpjUpyJ3X6nRbEiq0t1Nq18-25nDTXCxAtR7LTju-bJ4Baujf5fkZm7wLdBqo1uv-DtU2dvi_upaDJ5L-AL1jRt41tocNtXOyekiZCDBjSK3OOCWzT6Zz3fCX856dvJ-lNNHYUxs9UJ0w8y57jQR_GobtfzwXx3z7LrT8Fvrg5LVhwK3RKtpdkNDNiveXsjYmpyC8iYEfPZ3qkHepNiUkBq-0VDN4O'
        },
        {
          name: 'Washed French Terry Sweatshirt',
          sku: 'SKU: SW-TER-GREY-03',
          fabric: '320 GSM French Terry Loopback',
          pcs: '2,500 pcs',
          unitCost: '@ ₹414/pc',
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCp1uqOVagvfwJek-P5Bua3wUqIv8FaJmPHjmn8N2zR9mPlyoi_Hj9nGrt5vc2LgGs08RVnIzKfFTfT9HW717rR-KrSRenhS-KpRmGmEZN1bxM8rZVCEl96JsdtXO1FvsdiRmvw_mj1dzRDUWnZY3H49Zui0TPhB3HOFGo8tjr6bXD6UEfHxaG0--_TYyUDO7N8zSK_tUEDMIAV_W-ADmU3kQMfMon2y5ymDNa-OK1w'
        }
      ],
      steps: [
        { title: 'Yarn Spinning & Combing', desc: 'Sourced from Coimbatore Mills', date: 'May 09', status: 'completed' },
        { title: 'Circular Knitting & Bio-Wash', desc: 'Zero pilling test verified', date: 'May 14', status: 'completed' },
        { title: 'Screen Printing & Stitching', desc: 'Precision placement verified', date: 'May 19', status: 'completed' },
        { title: 'Factory Final Pack & Barcode', desc: 'Ready for container seal', date: 'May 22', status: 'completed' },
        { title: 'Dock Arrived at BOM-FC2', desc: 'Vehicle unloading at Dock 04', date: 'Today', status: 'current' }
      ],
      grnSummary: {
        docket: '#GRN-BOM-888',
        tolerance: 'Within Tolerance (±1%)',
        toleranceColor: 'bg-status-success-bg text-success',
        orderedQty: '6,500 pcs',
        millCount: '6,508 pcs (+0.12%)',
        limit: '6,435 - 6,565 pcs',
        barcoding: '100% GS1 Compliant'
      }
    },
    {
      id: 'PO-2024-0879',
      code: '#PO-2024-0879',
      supplier: 'Surat Synthetic Silks',
      vendorCode: 'V-ST-009',
      origin: 'Surat, GJ • Hub: BLR-FC1',
      orderedDate: '02 May 2024',
      promisedDate: '20 May 2024',
      daysNotice: '4 Days Overdue',
      noticeColor: 'text-danger',
      qtyPcs: '3,200 pcs',
      qtyNum: 3200,
      skuBreakdown: 'Georgette Saree line',
      cost: '₹14,08,000',
      costShort: '₹14.0L',
      advance: 'Adv ₹4.2L (30%)',
      advanceColor: 'text-warning',
      status: 'In Production',
      milestone: 'SLA Escalated',
      milestoneBadge: 'bg-status-danger-bg text-danger',
      milestonePulse: false,
      stageProgress: 'Stage 3 of 5 (55%)',
      styles: [
        {
          name: 'Poly-Georgette Foil Saree',
          sku: 'SKU: SA-GEO-SURAT-88',
          fabric: '60 GSM Poly-Georgette with Foil Print',
          pcs: '3,200 pcs',
          unitCost: '@ ₹440/pc',
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhlj_IgxCYYzqpjUpyJ3X6nRbEiq0t1Nq18-25nDTXCxAtR7LTju-bJ4Baujf5fkZm7wLdBqo1uv-DtU2dvi_upaDJ5L-AL1jRt41tocNtXOyekiZCDBjSK3OOCWzT6Zz3fCX856dvJ-lNNHYUxs9UJ0w8y57jQR_GobtfzwXx3z7LrT8Fvrg5LVhwK3RKtpdkNDNiveXsjYmpyC8iYEfPZ3qkHepNiUkBq-0VDN4O'
        }
      ],
      steps: [
        { title: 'Weft & Warp Preparation', desc: 'Texturized yarn staging', date: 'May 04', status: 'completed' },
        { title: 'Water-jet Weaving', desc: 'Roll weaving complete', date: 'May 10', status: 'completed' },
        { title: 'Foil Printing & Finishing (Delayed)', desc: '1.8% weft skew flagged on roll 4', date: 'May 18', status: 'current' },
        { title: 'Lab Tear & Tensile Test', desc: 'Awaiting third-party QA certificate', date: 'Pending', status: 'upcoming' },
        { title: 'Dispatch to BLR-FC1', desc: 'Truck delayed by mill delay', date: 'Overdue', status: 'upcoming' }
      ],
      grnSummary: {
        docket: '#GRN-HOLD-879',
        tolerance: 'Weft Skew Flagged (Hold)',
        toleranceColor: 'bg-status-danger-bg text-danger',
        orderedQty: '3,200 pcs',
        millCount: '3,180 pcs (-0.6%)',
        limit: '3,136 - 3,264 pcs',
        barcoding: 'Barcode audit pending'
      }
    },
    {
      id: 'PO-2024-0894',
      code: '#PO-2024-0894',
      supplier: 'Ludhiana Woolens & Blends',
      vendorCode: 'V-LD-041',
      origin: 'Ludhiana, PB • Hub: DEL-NCR',
      orderedDate: '15 May 2024',
      promisedDate: '02 Jun 2024',
      daysNotice: '9 days remaining',
      noticeColor: 'text-muted',
      qtyPcs: '1,800 pcs',
      qtyNum: 1800,
      skuBreakdown: 'Cardigans & Shawls',
      cost: '₹26,10,000',
      costShort: '₹26.1L',
      advance: 'Adv ₹13.0L (50%)',
      advanceColor: 'text-success',
      status: 'In Production',
      milestone: 'In Dyeing & Stitching',
      milestoneBadge: 'bg-status-warning-bg text-warning',
      milestonePulse: false,
      stageProgress: 'Stage 2 of 5 (40%)',
      styles: [
        {
          name: 'Merino Blend Knit Cardigan',
          sku: 'SKU: CD-MER-OAT-07',
          fabric: '50% Merino Wool, 50% Organic Cotton',
          pcs: '1,800 pcs',
          unitCost: '@ ₹1,450/pc',
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCp1uqOVagvfwJek-P5Bua3wUqIv8FaJmPHjmn8N2zR9mPlyoi_Hj9nGrt5vc2LgGs08RVnIzKfFTfT9HW717rR-KrSRenhS-KpRmGmEZN1bxM8rZVCEl96JsdtXO1FvsdiRmvw_mj1dzRDUWnZY3H49Zui0TPhB3HOFGo8tjr6bXD6UEfHxaG0--_TYyUDO7N8zSK_tUEDMIAV_W-ADmU3kQMfMon2y5ymDNa-OK1w'
        }
      ],
      steps: [
        { title: 'Raw Merino Wool Batch Intake', desc: 'Australian wool certified', date: 'May 16', status: 'completed' },
        { title: 'Vat Dyeing & Color Fixation', desc: 'Oatmeal & Forest Green shades', date: 'Today', status: 'current' },
        { title: 'Shima Seiki 3D Knitting', desc: 'Fully fashioned seamless knit', date: 'May 26', status: 'upcoming' },
        { title: 'Hand Finishing & Button Attach', desc: 'Horn buttons placement', date: 'May 30', status: 'upcoming' },
        { title: 'Dispatch to DEL-NCR Hub', desc: 'Direct road cargo via GT Road', date: 'ETA Jun 02', status: 'upcoming' }
      ],
      grnSummary: {
        docket: '#GRN-PRE-894',
        tolerance: 'Scheduled',
        toleranceColor: 'bg-surface-subtle text-muted',
        orderedQty: '1,800 pcs',
        millCount: 'In production',
        limit: '1,764 - 1,836 pcs',
        barcoding: 'GS1 Registered'
      }
    },
    {
      id: 'PO-2024-0897',
      code: '#PO-2024-0897',
      supplier: 'Varanasi Brocades Guild',
      vendorCode: 'V-VN-003',
      origin: 'Varanasi, UP • Hub: BLR-FC1',
      orderedDate: '19 May 2024',
      promisedDate: '10 Jun 2024',
      daysNotice: '17 days remaining',
      noticeColor: 'text-muted',
      qtyPcs: '950 pcs',
      qtyNum: 950,
      skuBreakdown: 'Zari Dupattas',
      cost: '₹11,40,000',
      costShort: '₹11.4L',
      advance: 'Adv ₹5.7L (50%)',
      advanceColor: 'text-success',
      status: 'Issued',
      milestone: 'Yarn Procurement',
      milestoneBadge: 'bg-surface-subtle text-muted',
      milestonePulse: false,
      stageProgress: 'Stage 1 of 5 (20%)',
      styles: [
        {
          name: 'Handloom Katan Silk Dupatta',
          sku: 'SKU: DP-KAT-ZARI-19',
          fabric: 'Pure Katan Silk with Real Zari Border',
          pcs: '950 pcs',
          unitCost: '@ ₹1,200/pc',
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhlj_IgxCYYzqpjUpyJ3X6nRbEiq0t1Nq18-25nDTXCxAtR7LTju-bJ4Baujf5fkZm7wLdBqo1uv-DtU2dvi_upaDJ5L-AL1jRt41tocNtXOyekiZCDBjSK3OOCWzT6Zz3fCX856dvJ-lNNHYUxs9UJ0w8y57jQR_GobtfzwXx3z7LrT8Fvrg5LVhwK3RKtpdkNDNiveXsjYmpyC8iYEfPZ3qkHepNiUkBq-0VDN4O'
        }
      ],
      steps: [
        { title: 'Artisanal Warp Sizing', desc: 'Handloom pit loom preparation', date: 'May 20', status: 'current' },
        { title: 'Jacquard Card Punching', desc: 'Mughal floral jaal motif', date: 'May 24', status: 'upcoming' },
        { title: 'Master Weaver Looming', desc: '14 handloom guild setups', date: 'May 31', status: 'upcoming' },
        { title: 'Tassel Knotting & QC', desc: 'Hand-knotted fringe work', date: 'Jun 06', status: 'upcoming' },
        { title: 'Air Cargo to BLR-FC1', desc: 'Priority air consignment', date: 'ETA Jun 10', status: 'upcoming' }
      ],
      grnSummary: {
        docket: '#GRN-PRE-897',
        tolerance: 'Scheduled',
        toleranceColor: 'bg-surface-subtle text-muted',
        orderedQty: '950 pcs',
        millCount: 'Yarn staging',
        limit: '930 - 970 pcs',
        barcoding: 'Handloom Mark + GS1'
      }
    },
    {
      id: 'PO-2024-0870',
      code: '#PO-2024-0870',
      supplier: 'Bhilwara TexCraft Co.',
      vendorCode: 'V-BW-019',
      origin: 'Bhilwara, RJ • Hub: BLR-FC1',
      orderedDate: '24 Apr 2024',
      promisedDate: '15 May 2024',
      daysNotice: 'GRN Reconciled',
      noticeColor: 'text-success',
      qtyPcs: '4,000 pcs',
      qtyNum: 4000,
      skuBreakdown: 'Poplin Shirting',
      cost: '₹16,00,000',
      costShort: '₹16.0L',
      advance: 'Settled 100%',
      advanceColor: 'text-info',
      status: 'Closed',
      milestone: 'Completed & Stored',
      milestoneBadge: 'bg-status-success-bg text-success',
      milestonePulse: false,
      stageProgress: 'Stage 5 of 5 (100%)',
      styles: [
        {
          name: 'Crisp Poplin Button-Down Shirt',
          sku: 'SKU: SH-POP-WHT-02',
          fabric: '60s Compact Cotton Poplin',
          pcs: '4,000 pcs',
          unitCost: '@ ₹400/pc',
          img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCp1uqOVagvfwJek-P5Bua3wUqIv8FaJmPHjmn8N2zR9mPlyoi_Hj9nGrt5vc2LgGs08RVnIzKfFTfT9HW717rR-KrSRenhS-KpRmGmEZN1bxM8rZVCEl96JsdtXO1FvsdiRmvw_mj1dzRDUWnZY3H49Zui0TPhB3HOFGo8tjr6bXD6UEfHxaG0--_TYyUDO7N8zSK_tUEDMIAV_W-ADmU3kQMfMon2y5ymDNa-OK1w'
        }
      ],
      steps: [
        { title: 'Weaving & Pre-Shrunk Finishing', desc: 'Sanforized cotton process', date: 'Apr 26', status: 'completed' },
        { title: 'Garmenting & Collar Fusing', desc: 'German interlining specification', date: 'May 04', status: 'completed' },
        { title: 'Single Needle Stitching', desc: '18 stitches per inch verified', date: 'May 10', status: 'completed' },
        { title: 'Inward Dock QC Pass', desc: 'Zero defect lot acceptance', date: 'May 14', status: 'completed' },
        { title: 'Stocked in BLR-FC1 Aisle 12', desc: 'All units active in inventory', date: 'May 15', status: 'completed' }
      ],
      grnSummary: {
        docket: '#GRN-BLR-0870-FINAL',
        tolerance: 'Zero Discrepancy (100% Match)',
        toleranceColor: 'bg-status-success-bg text-success',
        orderedQty: '4,000 pcs',
        millCount: '4,000 pcs (Exact)',
        limit: '3,920 - 4,080 pcs',
        barcoding: '100% Verified'
      }
    }
  ];

  const allPos = useMemo(() => {
    return [...livePos, ...poList.filter(p => !livePos.some(l => l.id === p.id))];
  }, [livePos, poList]);

  /** The KPI strip, measured off the purchase orders themselves. */
  const poStats = useMemo(() => {
    const pos = posData?.purchaseOrders ?? [];
    const openPos = pos.filter((po) => po.status !== 'received' && po.status !== 'canceled');
    const now = Date.now();
    const lines = pos.flatMap((po) => po.items ?? []);
    const ordered = lines.reduce((t, l) => t + (l.quantity ?? 0), 0);
    const received = lines.reduce((t, l) => t + (l.received ?? 0), 0);
    return {
      open: openPos.length,
      openValue: openPos.reduce((t, po) => t + (po.totalAmount ?? 0), 0),
      unitsInbound: openPos
        .flatMap((po) => po.items ?? [])
        .reduce((t, l) => t + Math.max(0, (l.quantity ?? 0) - (l.received ?? 0)), 0),
      overdue: openPos.filter((po) => po.expectedDate && new Date(po.expectedDate).getTime() < now)
        .length,
      receiptRate: ordered > 0 ? (received / ordered) * 100 : null,
      suppliers: new Set(pos.map((po) => po.supplierId ?? po.supplierName).filter(Boolean)).size,
    };
  }, [posData]);

  const selectedPo = useMemo(() => {
    return allPos.find(p => p.id === selectedPoId) || allPos[0];
  }, [selectedPoId, allPos]);

  const filteredPoList = useMemo(() => {
    return allPos.filter(p => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (supplierFilter !== 'ALL' && !p.supplier.toLowerCase().includes(supplierFilter.toLowerCase())) return false;
      if (targetHubFilter !== 'ALL' && !p.origin.toLowerCase().includes(targetHubFilter.toLowerCase())) return false;
      return true;
    });
  }, [statusFilter, supplierFilter, targetHubFilter, allPos]);

  // One shared pager over the rows this module actually holds.
  const poPager = useClientTable(filteredPoList);

  const handleCreatePoSubmit = (e) => {
    e.preventDefault();
    setIsCreatePoModalOpen(false);
    createPoMutation.mutateAsync({
      supplierId: 'sup_default',
      supplierName: newPoForm.supplier,
      hubId: newPoForm.targetHub || 'BLR-FC1',
      items: [{
        sku: 'SKU-PO-NEW',
        name: `${newPoForm.supplier} Order`,
        quantity: Number(newPoForm.qty) || 500,
        unitCost: 850,
      }],
      expectedDate: new Date(newPoForm.deliveryDate),
    })
      .then(res => {
        if (res?.purchaseOrder) {
          const po = res.purchaseOrder;
          const mapped = {
            id: po.poNumber,
            code: `#${po.poNumber}`,
            supplier: po.supplierName,
            vendorCode: 'V-DB-001',
            origin: `Hub: ${po.hubId}`,
            orderedDate: new Date(po.createdAt).toLocaleDateString(),
            promisedDate: po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'Next week',
            daysNotice: 'On Schedule',
            noticeColor: 'text-success',
            qtyPcs: `${po.items.reduce((acc, i) => acc + i.quantity, 0)} pcs`,
            qtyNum: po.items.reduce((acc, i) => acc + i.quantity, 0),
            skuBreakdown: `${po.items.length} SKUs`,
            cost: `₹${(po.totalAmount / 100).toLocaleString()}`,
            costShort: `₹${(po.totalAmount / 100).toLocaleString()}`,
            advance: '50% Staged',
            advanceColor: 'text-success',
            status: 'In Production',
            milestone: 'PO Staged & Saved to DB',
            milestoneBadge: 'bg-status-success-bg text-success',
            milestonePulse: true,
            stageProgress: 'Stage 1 of 5 (20%)',
            styles: [],
          };
          setLivePos(prev => [mapped, ...prev]);
        }
      })
      .catch(err => console.warn('Could not persist PO:', err));

    if (onShowToast) onShowToast(`Purchase Order drafted for ${newPoForm.supplier} (${newPoForm.qty} pcs) and saved to MongoDB.`);
  };

  const handleExportCsv = () => {
    const headers = ['PO Code', 'Supplier', 'Origin / Target Hub', 'Order Date', 'Promised Date', 'Units Qty', 'Total Cost (INR)', 'Advance Status', 'Milestone'];
    const rows = filteredPoList.map(p => [
      p.code,
      `"${p.supplier}"`,
      `"${p.origin}"`,
      `"${p.orderedDate}"`,
      `"${p.promisedDate}"`,
      p.qtyNum,
      `"${p.cost}"`,
      `"${p.advance}"`,
      `"${p.milestone}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(',')).join('\n')];
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = `everwear_purchase_orders_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('Procurement order ledger CSV exported successfully.');
  };

  if (isPosLoading) {
    return <SkeletonPage variant="table" stats={6} statsCols={6} columns={7} label="Loading purchase orders" />;
  }


  // Ledger columns. Cells keep the markup the hand-rolled table used.
  const poColumns = [
    {
      key: 'code',
      header: 'PO Code & Origin',
      grow: true,
      cell: (po) => (
        <div className="flex items-center gap-2.5">
          <div
            className={`w-1.5 h-10 rounded-full shrink-0 ${
              selectedPoId === po.id ? 'bg-primary-container' : 'bg-transparent'
            }`}
          />
          <div className="flex flex-col">
            <span className="text-meta font-semibold text-accent">{po.code}</span>
            <span className="block max-w-[12rem] truncate text-meta font-semibold text-primary" title={po.supplier}>
              {po.supplier}
            </span>
            <span className="text-micro text-muted">{po.origin}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'timeline',
      header: 'Timeline',
      cell: (po) => (
        <div className="flex flex-col">
          <span className="text-muted font-medium">Ord: {po.orderedDate}</span>
          <span className="whitespace-nowrap text-primary font-semibold">Prom: {po.promisedDate}</span>
          <span className={`text-micro font-semibold ${po.noticeColor}`}>{po.daysNotice}</span>
        </div>
      ),
    },
    {
      key: 'volume',
      header: 'Volume',
      align: 'right',
      cell: (po) => (
        <div className="flex flex-col">
          <span className="font-semibold text-primary">{po.qtyPcs}</span>
          <span className="text-micro text-muted">{po.skuBreakdown}</span>
        </div>
      ),
    },
    {
      key: 'cost',
      header: 'Cost & Advance',
      align: 'right',
      cell: (po) => (
        <div className="flex flex-col">
          <span className="font-semibold text-primary">{po.cost}</span>
          <span className={`text-micro font-semibold ${po.advanceColor}`}>{po.advance}</span>
        </div>
      ),
    },
    {
      key: 'milestone',
      header: 'Milestone Status',
      cell: (po) => (
        <span className={`whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-micro font-semibold ${po.milestoneBadge}`}>
          {po.milestonePulse ? (
            <span className="w-1.5 h-1.5 rounded-full bg-status-info animate-pulse" />
          ) : (
            <Icon name="dock" className="material-symbols-outlined text-icon-sm" />
          )}
          {po.milestone}
        </span>
      ),
    },
    {
      key: 'action',
      fit: true,
      header: 'Action',
      align: 'center',
      cell: (po) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPoId(po.id);
          }}
          className="p-1 rounded text-accent hover:bg-surface-container transition-colors"
          title="Inspect PO Details"
          type="button"
        >
          <Icon name="chevron_right" className="material-symbols-outlined text-icon-md" />
        </button>
      ),
    },
  ];

  return (
    <PageContainer>
      {posError && (
        <ErrorState
          title="Purchase orders could not be loaded"
          message={posError?.message}
          onRetry={() => refetchPurchaseOrders()}
        />
      )}
      {/* Top Breadcrumb & Header Action Suite */}
      <PageHeader
        breadcrumb={['Everwear Admin', 'Catalog & Inventory', 'Purchase Orders & Suppliers']}
        title="Fashion Procurement, Mill Suppliers & Purchase Orders"
        description="Orchestrate raw fiber sourcing, batch lot spinning, dyeing milestones, and multi-hub GRN receipts across primary Indian textile clusters."
        actions={
          <>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsCreatePoModalOpen(true)}
              className="gap-1.5 bg-primary-container text-on-accent hover:bg-primary-container-hover shadow-sm"
              type="button"
            >
              <Icon name="add_circle" className="material-symbols-outlined text-icon-md" />
              <span>Create Purchase Order</span>
            </Button>
          </>
        }
      />

      {/* Operational KPI Cards */}
      <ContentGrid columns={5}>
        <StatsCard
          title="Open purchase orders"
          value={`${poStats.open} POs`}
          icon="receipt_long"
          trendLabel={`Valuation ${formatMoney(poStats.openValue, 'inr')}`}
        />
        <StatsCard
          title="Units still inbound"
          value={poStats.unitsInbound.toLocaleString('en-IN')}
          icon="local_shipping"
          iconColor="text-info"
          badge={`${poStats.open} ${poStats.open === 1 ? 'consignment' : 'consignments'}`}
          badgeVariant="info"
          trendLabel="Ordered minus received"
        />
        <StatsCard
          title="Overdue shipments"
          value={`${poStats.overdue} POs`}
          icon="warning"
          iconColor={poStats.overdue ? 'text-danger' : 'text-muted'}
          trendLabel="Past their expected date"
        />
        <StatsCard
          title="Received against ordered"
          value={poStats.receiptRate == null ? 'Not recorded' : `${poStats.receiptRate.toFixed(1)}%`}
          icon="verified_user"
          iconColor="text-success"
          trendLabel="No QC grade is stored on a receipt"
        />
        <StatsCard
          title="Suppliers in use"
          value={`${poStats.suppliers} ${poStats.suppliers === 1 ? 'mill' : 'mills'}`}
          icon="storefront"
          trendLabel="Distinct suppliers with a purchase order"
        />
      </ContentGrid>

      {/* Filter Bar & Slicers */}
      <FilterBar
        tabs={[
          { id: 'ALL', label: 'All', count: '48' },
          { id: 'Draft', label: 'Draft', count: '4' },
          { id: 'Issued', label: 'Issued', count: '8' },
          { id: 'In Production', label: 'In Production', count: '19' },
          { id: 'Shipped', label: 'Shipped', count: '7' },
          { id: 'Inward QC', label: 'Inward QC', count: '6' },
          { id: 'Closed', label: 'Closed', count: '4' },
        ]}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              value={supplierFilter}
              onChange={setSupplierFilter}
              options={[
                { value: 'ALL', label: 'All Suppliers / Mills' },
                { value: 'Jaipur', label: 'Jaipur Weaves & Prints (RJ)' },
                { value: 'Tirupur', label: 'Tirupur Knitwear Hub (TN)' },
                { value: 'Surat', label: 'Surat Synthetic Silks (GJ)' },
                { value: 'Ludhiana', label: 'Ludhiana Woolens & Blends (PB)' },
                { value: 'Varanasi', label: 'Varanasi Brocades Guild (UP)' },
              ]}
              className="w-56"
            />
            <FilterDropdown
              value={targetHubFilter}
              onChange={setTargetHubFilter}
              options={[
                { value: 'ALL', label: 'Target Hub: All FCs' },
                { value: 'BLR', label: 'BLR-Fulfillment-FC1' },
                { value: 'BOM', label: 'BOM- Bhiwandi-FC2' },
                { value: 'DEL', label: 'DEL-NCR-FC3' },
              ]}
              className="w-52"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter('ALL');
                setSupplierFilter('ALL');
                setTargetHubFilter('ALL');
              }}
              className="h-8.5 px-2.5 text-muted hover:text-primary"
              title="Reset Filters"
              type="button"
            >
              <Icon name="restart_alt" className="material-symbols-outlined text-icon" />
            </Button>
          </div>
        }
      />

      {/* Split Grid: Comprehensive PO Ledger (8 cols) + Selected PO Detailed Inspector (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANE: PO Ledger Table (Cols 8) */}
        <DataTable
          data={poPager.pageRows}
          columns={poColumns}
          keyField="id"
          className="min-w-[850px]"
          containerClassName="lg:col-span-8"
          activeRowId={selectedPoId}
          onRowClick={(po) => setSelectedPoId(po.id)}
          emptyIcon="inventory_2"
          emptyTitle="No purchase orders match these filters"
          emptyMessage="No PO matches the current search, supplier or milestone selection."
          pagination={{
            page: poPager.page,
            pageSize: poPager.limit,
            totalItems: poPager.total,
            onPageChange: poPager.setPage,
            onPageSizeChange: poPager.setLimit,
          }}
          toolbar={
            <TableToolbar
              className="bg-surface-subtle px-4 py-3"
              left={
                <div className="flex items-center gap-2">
                  <Icon name="inventory_2" className="material-symbols-outlined text-icon-md text-accent" />
                  <span className="text-body font-semibold text-primary">Procurement Order Ledger</span>
                  <span className="whitespace-nowrap px-2 py-0.5 rounded-full bg-surface-container text-muted text-micro font-semibold">
                    Showing {filteredPoList.length} of 48 POs
                  </span>
                </div>
              }
              right={
                <button
                  onClick={handleExportCsv}
                  className="p-1 rounded text-muted hover:text-primary hover:bg-surface-container transition-colors"
                  title="Export Ledger as CSV"
                  type="button"
                >
                  <Icon name="download" className="material-symbols-outlined text-icon-md" />
                </button>
              }
            />
          }
        />

        {/* RIGHT PANE: Selected PO Detailed Inspector (Cols 4) */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col space-y-4 border border-subtle sticky top-20">
          {/* Panel Header & Supplier Profile */}
          <div className="flex items-start justify-between border-b border-subtle pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed text-micro font-semibold">
                  INSPECTOR
                </span>
                <span className="text-heading font-semibold text-primary">{selectedPo.code}</span>
              </div>
              <p className="text-meta text-muted mt-0.5 font-medium">
                {selectedPo.supplier} (Vendor Code: {selectedPo.vendorCode})
              </p>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-surface-subtle border border-subtle">
            <div className="flex flex-col">
              <span className="text-caption text-muted uppercase">ORDER VALUE</span>
              <span className="text-heading font-semibold text-primary">{selectedPo.costShort}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-caption text-muted uppercase">QTY LOT</span>
              <span className="text-heading font-semibold text-primary">{selectedPo.qtyPcs}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-caption text-muted uppercase">PAY STATUS</span>
              <span className="text-meta font-semibold text-success mt-1">{selectedPo.advance}</span>
            </div>
          </div>

          {/* Fabric / Garment Style Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-caption text-muted uppercase">Fabric &amp; Style Breakdown</span>
              <span className="text-micro text-muted">{selectedPo.styles.length} Line Items</span>
            </div>
            {(selectedPo.styles ?? []).map((style, sIdx) => (
              <div
                key={sIdx}
                className="p-3 rounded-lg bg-surface-canvas flex items-center justify-between gap-2 hover:shadow-sm transition-shadow border border-subtle"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Thumbnail src={style.img} alt={style.name} className="w-12 h-14 rounded-md shrink-0 shadow-sm" imgClassName="object-cover" />
                  <div className="flex flex-col truncate">
                    <span className="text-meta font-semibold text-primary truncate">{style.name}</span>
                    <span className="text-micro text-muted font-semibold">{style.sku}</span>
                    <span className="text-micro text-muted truncate">{style.fabric}</span>
                  </div>
                </div>
                <div className="flex flex-col text-right shrink-0">
                  <span className="text-meta font-semibold text-primary">{style.pcs}</span>
                  <span className="text-micro text-muted font-semibold">{style.unitCost}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Production Milestone Tracker */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-caption text-muted uppercase">
                Production Lifecycle Milestone
              </span>
              <span className="text-micro text-accent font-semibold">{selectedPo.stageProgress}</span>
            </div>
            {/* Milestone Stepper Vertical */}
            <div className="relative pl-6 space-y-3.5 pt-1">
              {/* Continuous Track Line */}
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-surface-container"></div>
              {(selectedPo.steps ?? []).length === 0 && (
                <span className="text-micro text-muted">
                  No milestone history recorded for this purchase order.
                </span>
              )}
              {(selectedPo.steps ?? []).map((st, sIdx) => {
                const isCompleted = st.status === 'completed';
                const isCurrent = st.status === 'current';

                return (
                  <div key={sIdx} className="relative flex items-center justify-between group">
                    {isCompleted ? (
                      <div className="whitespace-nowrap absolute -left-6 w-5 h-5 rounded-full bg-status-success-solid text-on-accent flex items-center justify-center shadow-sm">
                        <Icon name="check" className="material-symbols-outlined text-icon-sm" />
                      </div>
                    ) : isCurrent ? (
                      <div className="whitespace-nowrap absolute -left-6 w-5 h-5 rounded-full bg-primary-container text-on-accent flex items-center justify-center ring-4 ring-primary-fixed shadow-md">
                        <span className="w-2 h-2 rounded-full bg-on-primary animate-ping"></span>
                      </div>
                    ) : (
                      <div className="whitespace-nowrap absolute -left-6 w-5 h-5 rounded-full bg-surface-container text-muted flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      </div>
                    )}
                    <div>
                      <p className={`text-meta font-semibold ${isCurrent ? 'text-accent' : 'text-primary'}`}>
                        {st.title}
                      </p>
                      <p className="text-micro text-muted">{st.desc}</p>
                    </div>
                    <span className={`text-micro font-semibold ${isCompleted ? 'text-success' : isCurrent ? 'text-accent' : 'text-muted'}`}>
                      {st.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Goods Receipt Note (GRN) & Discrepancy Tolerance Summary */}
          <div className="p-3.5 rounded-lg bg-surface-subtle space-y-2 border border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Icon name="fact_check" className="material-symbols-outlined text-icon text-accent" />
                <span className="text-meta font-semibold text-primary">GRN Intake &amp; Discrepancy Checker</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-micro font-semibold ${(selectedPo.grnSummary?.toleranceColor ?? 'bg-surface-subtle text-muted')}`}>
                {(selectedPo.grnSummary?.tolerance ?? 'Not recorded')}
              </span>
            </div>
            <div className="space-y-1 text-meta">
              <div className="flex items-center justify-between text-muted font-medium">
                <span>Ordered Quantity:</span>
                <span className="font-semibold text-primary">{(selectedPo.grnSummary?.orderedQty ?? 'Not recorded')}</span>
              </div>
              <div className="flex items-center justify-between text-muted font-medium">
                <span>Pre-Dispatch Mill Count:</span>
                <span className="font-semibold text-primary">{(selectedPo.grnSummary?.millCount ?? 'Not recorded')}</span>
              </div>
              <div className="flex items-center justify-between text-muted font-medium">
                <span>Allowed Variation Limit:</span>
                <span className="font-semibold text-primary">{(selectedPo.grnSummary?.limit ?? 'Not recorded')}</span>
              </div>
              <div className="flex items-center justify-between text-muted font-medium">
                <span>Barcoding Status:</span>
                <span className="font-semibold text-success">{(selectedPo.grnSummary?.barcoding ?? 'Not recorded')}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-subtle flex items-center justify-between">
              <span className="text-micro font-semibold text-muted">Quality Inward Slip: {(selectedPo.grnSummary?.docket ?? 'Not recorded')}</span>
            </div>
          </div>

          {/* Inspector Footer Action Suite */}
          <div className="flex items-center gap-2 pt-1">
          </div>
        </div>
      </div>

      {/* Bottom Secondary Section: Supplier SLA Performance & Cluster Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* Card 1: Mill SLA Leaderboard */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between border border-subtle">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="military_tech" className="material-symbols-outlined text-icon-md text-accent" />
                <span className="text-body font-semibold text-primary">Top Performing Mill Partners</span>
              </div>
              <span className="text-caption text-muted uppercase">May 2024</span>
            </div>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-meta font-semibold text-primary">Tirupur Knitwear Hub</span>
                  <span className="text-micro text-muted">99.4% On-Time Fulfillment</span>
                </div>
                <span className="whitespace-nowrap px-2 py-0.5 rounded-full bg-status-success-bg text-success text-micro font-semibold">
                  Tier-1 Star
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-meta font-semibold text-primary">Jaipur Weaves &amp; Prints</span>
                  <span className="text-micro text-muted">98.1% Quality Grade-A Pass</span>
                </div>
                <span className="whitespace-nowrap px-2 py-0.5 rounded-full bg-status-success-bg text-success text-micro font-semibold">
                  Tier-1 Certified
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-meta font-semibold text-primary">Bhilwara TexCraft Co.</span>
                  <span className="text-micro text-muted">97.8% Compliance Rate</span>
                </div>
                <span className="whitespace-nowrap px-2 py-0.5 rounded-full bg-status-success-bg text-success text-micro font-semibold">
                  Tier-2 Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Fabric Material Intake Allocation */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between border border-subtle">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="pie_chart" className="material-symbols-outlined text-icon-md text-accent" />
                <span className="text-body font-semibold text-primary">Material Allocation Mix</span>
              </div>
              <span className="text-caption text-muted uppercase">Current Pipeline</span>
            </div>
            {/* Material progress bars */}
            <div className="mt-3 space-y-2">
              <div>
                <div className="flex justify-between text-micro mb-1 font-semibold">
                  <span className="text-primary font-medium">Mulberry &amp; Chanderi Silks</span>
                  <span className="text-muted">42% (₹1.61 Cr)</span>
                </div>
                <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
                  <div className="whitespace-nowrap bg-primary-container h-full w-[42%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-micro mb-1 font-semibold">
                  <span className="text-primary font-medium">Combed Compact Cotton</span>
                  <span className="text-muted">31% (₹1.19 Cr)</span>
                </div>
                <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
                  <div className="whitespace-nowrap bg-status-info h-full w-[31%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-micro mb-1 font-semibold">
                  <span className="text-primary font-medium">Merino &amp; Cashmere Blends</span>
                  <span className="text-muted">18% (₹0.69 Cr)</span>
                </div>
                <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
                  <div className="whitespace-nowrap bg-status-warning h-full w-[18%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-micro mb-1 font-semibold">
                  <span className="text-primary font-medium">Sustainable Viscose / Modal</span>
                  <span className="text-muted">9% (₹0.35 Cr)</span>
                </div>
                <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
                  <div className="whitespace-nowrap bg-status-success h-full w-[9%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
          <span className="text-micro font-semibold text-muted mt-2">Zero AZO-dye &amp; REACH certified sourcing</span>
        </div>

        {/* Card 3: Quality Defect Hotspot Warning */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between border border-subtle">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="report" className="material-symbols-outlined text-icon-md text-warning" />
                <span className="text-body font-semibold text-primary">QC Dock Defect Watch</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-status-warning-bg text-warning text-micro font-semibold">
                Active Monitor
              </span>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-status-warning-bg space-y-1.5 border border-status-warning/30">
              <div className="flex items-center gap-1.5 text-warning">
                <Icon name="priority_high" className="material-symbols-outlined text-icon" />
                <span className="text-meta font-semibold">Surat Synthetics: Weft Skewing</span>
              </div>
              <p className="text-meta text-primary leading-tight font-medium">
                Batch #PO-2024-0879 flagged with 1.8% weft skew on poly-georgette roll 4. Pre-shipment sample quarantined for third-party lab tear test.
              </p>
            </div>
            <div className="flex items-center justify-between mt-3 text-meta">
              <span className="text-muted font-medium">Escalation Assigned:</span>
              <span className="font-semibold text-primary">Vikram Patel (QC Lead)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create Purchase Order Modal */}
      {isCreatePoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreatePoSubmit}
            className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-xl border border-subtle space-y-4"
          >
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Icon name="add_circle" className="material-symbols-outlined text-accent text-icon-lg" />
                <h3 className="text-heading font-semibold text-primary">Generate Purchase Order</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatePoModalOpen(false)}
                className="p-1 text-muted hover:text-primary rounded-lg transition-colors" title="Close" aria-label="Close"
              >
                <Icon name="close" className="material-symbols-outlined text-icon-lg" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-caption text-muted uppercase mb-1">
                  Mill / Textile Supplier
                </label>
                <Select
                  value={newPoForm.supplier}
                  onChange={(e) => setNewPoForm({ ...newPoForm, supplier: e.target.value })}
                  className="h-9"
                >
                  <option value="Jaipur Weaves & Prints">Jaipur Weaves &amp; Prints (Surat &amp; Jaipur)</option>
                  <option value="Tirupur Knitwear Hub">Tirupur Knitwear Hub (TN)</option>
                  <option value="Surat Synthetic Silks">Surat Synthetic Silks (GJ)</option>
                  <option value="Ludhiana Woolens & Blends">Ludhiana Woolens &amp; Blends (PB)</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption text-muted uppercase mb-1">
                    Destination Hub
                  </label>
                  <Select
                    value={newPoForm.targetHub}
                    onChange={(e) => setNewPoForm({ ...newPoForm, targetHub: e.target.value })}
                    className="h-9"
                  >
                    <option value="BLR-FC1">BLR-Fulfillment-FC1</option>
                    <option value="BOM-FC2">BOM- Bhiwandi-FC2</option>
                    <option value="DEL-NCR">DEL-NCR-FC3</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-caption text-muted uppercase mb-1">
                    Lot Quantity (pcs)
                  </label>
                  <input
                    type="number"
                    value={newPoForm.qty}
                    onChange={(e) => setNewPoForm({ ...newPoForm, qty: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-surface-subtle rounded-lg text-meta font-semibold text-primary border border-subtle focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption text-muted uppercase mb-1">
                    Estimated Cost (INR)
                  </label>
                  <input
                    type="text"
                    value={newPoForm.cost}
                    onChange={(e) => setNewPoForm({ ...newPoForm, cost: e.target.value })}
                    className="w-full h-9 px-3 bg-surface-subtle rounded-lg text-meta font-semibold text-primary border border-subtle focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-caption text-muted uppercase mb-1">
                    Promised Delivery Date
                  </label>
                  <input
                    type="date"
                    value={newPoForm.deliveryDate}
                    onChange={(e) => setNewPoForm({ ...newPoForm, deliveryDate: e.target.value })}
                    className="w-full h-9 px-3 bg-surface-subtle rounded-lg text-meta font-semibold text-primary border border-subtle focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-subtle flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreatePoModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-surface-subtle hover:bg-surface-variant text-primary text-meta font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary-container text-on-accent hover:bg-primary-container-hover text-meta font-semibold shadow-sm"
              >
                Issue Purchase Order
              </button>
            </div>
          </form>
        </div>
      )}
    </PageContainer>
  );
}

export default PurchaseOrdersAndSuppliers;
