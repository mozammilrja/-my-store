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
import { EmptyState } from '../shared/FeedbackAndOverlays';
import { SectionCard } from '../shared/Layout';

/** The states a purchase order can really be in. */
const PO_STATUS = {
  draft: { label: 'Draft', badge: 'bg-surface-subtle text-muted' },
  submitted: { label: 'Submitted', badge: 'bg-status-info-bg text-info' },
  partially_received: { label: 'Partly received', badge: 'bg-status-warning-bg text-warning' },
  received: { label: 'Received', badge: 'bg-status-success-bg text-success' },
  canceled: { label: 'Cancelled', badge: 'bg-status-danger-bg text-danger' },
};

export function PurchaseOrdersAndSuppliers({ onNavigate, onShowToast }) {
  const [selectedPoId, setSelectedPoId] = useState(null);
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
      const mapped = posData.purchaseOrders.map((po) => {
        const ordered = po.items.reduce((n, i) => n + i.quantity, 0);
        const received = po.items.reduce((n, i) => n + (i.received ?? 0), 0);
        const due = po.expectedDate ? new Date(po.expectedDate) : null;
        const open = po.status !== 'received' && po.status !== 'canceled';
        const overdue = Boolean(open && due && due.getTime() < Date.now());

        return {
          id: po.poNumber,
          code: `#${po.poNumber}`,
          supplier: po.supplierName,
          supplierId: po.supplierId,
          origin: po.hubId,
          hubId: po.hubId,
          orderedDate: new Date(po.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          }),
          promisedDate: due
            ? due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : null,
          // Measured against the date the supplier promised, not asserted.
          daysNotice: !due ? 'No date agreed' : overdue ? 'Overdue' : open ? 'On schedule' : 'Closed',
          noticeColor: overdue ? 'text-danger' : open ? 'text-success' : 'text-muted',
          qtyPcs: `${ordered.toLocaleString('en-IN')} pcs`,
          qtyNum: ordered,
          receivedNum: received,
          receivedLabel: ordered > 0 ? `${Math.round((received / ordered) * 100)}% received` : '—',
          skuBreakdown: `${po.items.length} ${po.items.length === 1 ? 'line' : 'lines'}`,
          cost: `₹${Math.round(po.totalAmount / 100).toLocaleString('en-IN')}`,
          costShort: `₹${Math.round(po.totalAmount / 100).toLocaleString('en-IN')}`,
          status: po.status,
          statusLabel: PO_STATUS[po.status]?.label ?? po.status,
          milestoneBadge: PO_STATUS[po.status]?.badge ?? 'bg-surface-subtle text-muted',
          items: po.items,
        };
      });
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
    return livePos;
  }, [livePos]);

  const poTabs = useMemo(() => {
    const count = (id) => allPos.filter((p) => p.status === id).length;
    return [
      { id: 'ALL', label: 'All', count: allPos.length },
      ...Object.entries(PO_STATUS)
        .map(([id, meta]) => ({ id, label: meta.label, count: count(id) }))
        .filter((t) => t.count > 0),
    ];
  }, [allPos]);

  const supplierOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All suppliers' },
      ...[...new Set(allPos.map((p) => p.supplier).filter(Boolean))]
        .sort()
        .map((name) => ({ value: name, label: name })),
    ],
    [allPos]
  );

  const hubOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All hubs' },
      ...[...new Set(allPos.map((p) => p.hubId).filter(Boolean))]
        .sort()
        .map((hub) => ({ value: hub, label: hub })),
    ],
    [allPos]
  );

  const supplierSpend = useMemo(() => {
    const byName = new Map();
    for (const po of allPos) {
      const row = byName.get(po.supplier) ?? { supplier: po.supplier, total: 0, count: 0 };
      row.total += Math.round((po.qtyNum > 0 ? 0 : 0) + Number(String(po.costShort).replace(/[^0-9]/g, '')));
      row.count += 1;
      byName.set(po.supplier, row);
    }
    const rows = [...byName.values()].sort((a, b) => b.total - a.total).slice(0, 8);
    const max = Math.max(...rows.map((r) => r.total), 1);
    return rows.map((r) => ({ ...r, share: Math.round((r.total / max) * 100) }));
  }, [allPos]);

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
    return allPos.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (supplierFilter !== 'ALL' && p.supplier !== supplierFilter) return false;
      if (targetHubFilter !== 'ALL' && p.hubId !== targetHubFilter) return false;
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
      header: 'Status',
      cell: (po) => (
        <span
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-micro font-semibold ${po.milestoneBadge}`}
        >
          {po.statusLabel}
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
        tabs={poTabs}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              value={supplierFilter}
              onChange={setSupplierFilter}
              options={supplierOptions}
              className="w-56"
            />
            <FilterDropdown
              value={targetHubFilter}
              onChange={setTargetHubFilter}
              options={hubOptions}
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
                    Showing {filteredPoList.length} of {allPos.length}
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
        {!selectedPo ? (
          <div className="lg:col-span-4">
            <EmptyState icon="local_shipping" title="No purchase order selected" message="Pick a purchase order from the ledger to inspect it." />
          </div>
        ) : (
          <div className="sticky top-20 flex flex-col gap-space-md lg:col-span-4">
            {/* The panel carried a vendor code, an advance percentage, a five
                stage production lifecycle and a GRN discrepancy checker. A
                purchase order records none of those; it has a supplier, a hub,
                line items, what was ordered, what has been received and a
                status. */}
            <SectionCard
              title={selectedPo.code}
              description={`${selectedPo.supplier} / ${selectedPo.hubId}`}
              action={
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-micro font-semibold ${selectedPo.milestoneBadge}`}
                >
                  {selectedPo.statusLabel}
                </span>
              }
            >
              <dl className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between gap-space-md">
                  <dt className="text-meta text-muted">Ordered</dt>
                  <dd className="text-body text-primary">{selectedPo.orderedDate}</dd>
                </div>
                <div className="flex items-center justify-between gap-space-md">
                  <dt className="text-meta text-muted">Promised</dt>
                  <dd className="text-body text-primary">
                    {selectedPo.promisedDate ?? <span className="text-faint">No date agreed</span>}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-space-md">
                  <dt className="text-meta text-muted">Delivery</dt>
                  <dd className={`text-body ${selectedPo.noticeColor}`}>{selectedPo.daysNotice}</dd>
                </div>
                <div className="flex items-center justify-between gap-space-md border-t border-subtle pt-space-sm">
                  <dt className="text-body font-semibold text-primary">Order value</dt>
                  <dd className="text-num font-semibold tabular-nums text-primary">
                    {selectedPo.costShort}
                  </dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard
              title="Line items"
              description={`${selectedPo.receivedNum.toLocaleString('en-IN')} of ${selectedPo.qtyNum.toLocaleString('en-IN')} units received`}
            >
              <ul className="flex flex-col gap-space-sm">
                {selectedPo.items.map((item, idx) => (
                  <li key={`${item.sku}-${idx}`} className="flex items-start justify-between gap-space-md">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-body text-primary" title={item.name}>
                        {item.name}
                      </span>
                      <span className="font-mono text-micro text-muted">{item.sku}</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="text-num tabular-nums text-primary">
                        {item.received} / {item.quantity}
                      </span>
                      <span className="text-micro text-muted">
                        ₹{Math.round(item.unitCost / 100).toLocaleString('en-IN')} each
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        )}
      </div>

      <SectionCard
        title="Suppliers by order value"
        description="Totalled from the purchase orders raised with each supplier."
      >
        {supplierSpend.length === 0 ? (
          <EmptyState
            icon="store"
            title="No purchase orders yet"
            message="Suppliers appear here once an order is raised with them."
          />
        ) : (
          <ul className="flex flex-col gap-space-sm">
            {supplierSpend.map((row) => (
              <li key={row.supplier} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-space-md">
                  <span className="truncate text-body text-primary" title={row.supplier}>
                    {row.supplier}
                  </span>
                  <span className="shrink-0 text-num tabular-nums text-secondary">
                    ₹{row.total.toLocaleString('en-IN')}
                    <span className="ml-2 text-meta text-muted">
                      {row.count} {row.count === 1 ? 'order' : 'orders'}
                    </span>
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle"
                  role="progressbar"
                  aria-valuenow={row.share}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${row.supplier}: ${row.share}% of purchase order value`}
                  title={`${row.share}% of all purchase order value`}
                >
                  <div className="h-full rounded-full bg-primary-container" style={{ width: `${row.share}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

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
