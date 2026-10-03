'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProductionIssue, FinishedGoodsStock } from '@/types/inventory';
import { useAuth } from '@/context/AuthContext';
import {
  Layers,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Factory,
  Package,
  User,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileCheck,
  Upload,
  ExternalLink,
} from 'lucide-react';

interface ApprovedStoreItem {
  id: string;
  itemCode: string;
  description: string;
  category: string;
  unit: string;
  availableStoreStock: number;
  acceptedQty: number;
}

export const ProductionFloorView: React.FC = () => {
  const { profile, role } = useAuth();
  const isViewer = role === 'VIEWER';
  const isAdmin = role === 'ADMIN';
  const isProductionOfficer = role === 'PRODUCTION' || role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'issues' | 'finishedGoods'>('issues');
  const [issues, setIssues] = useState<ProductionIssue[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodsStock[]>([]);
  const [approvedItems, setApprovedItems] = useState<ApprovedStoreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modals
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedIssueForReport, setSelectedIssueForReport] = useState<ProductionIssue | null>(null);

  // Send to Production Form State (Admin)
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [jobCard, setJobCard] = useState('');
  const [station, setStation] = useState('CNC Machining Line 1');
  const [qtyToIssue, setQtyToIssue] = useState<number>(10);
  const [prodOfficer, setProdOfficer] = useState('Sudhakar Magar (Production Officer)');
  const [issueRemarks, setIssueRemarks] = useState('');

  // Production Report Form State (Production Officer)
  const [readyToUseQty, setReadyToUseQty] = useState<number>(0);
  const [failedProcessingQty, setFailedProcessingQty] = useState<number>(0);
  const [supplierFailedQty, setSupplierFailedQty] = useState<number>(0);
  const [fileUrl1, setFileUrl1] = useState('');
  const [fileUrl2, setFileUrl2] = useState('');
  const [fileUrl3, setFileUrl3] = useState('');
  const [reportRemarks, setReportRemarks] = useState('');

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Fetch production data
  const fetchProductionData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/production');
      if (res.ok) {
        const data = await res.json();
        if (data.issues) setIssues(data.issues);
        if (data.finishedGoods) setFinishedGoods(data.finishedGoods);
        if (data.approvedStoreItems) setApprovedItems(data.approvedStoreItems);
      }
    } catch (err) {
      console.error('Error fetching production data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductionData();
  }, [fetchProductionData]);

  // Set default item when approvedItems load
  useEffect(() => {
    if (approvedItems.length > 0 && !selectedItemCode) {
      setSelectedItemCode(approvedItems[0].itemCode);
      setQtyToIssue(Math.min(10, approvedItems[0].availableStoreStock || 10));
    }
  }, [approvedItems, selectedItemCode]);

  const selectedItemObj = approvedItems.find((i) => i.itemCode === selectedItemCode);
  const availableStoreStock = selectedItemObj?.availableStoreStock ?? 0;

  // Handle Admin sending stock to Production Officer
  const handleSendToProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemCode || qtyToIssue <= 0) {
      showToast('⚠️ Please specify item and valid quantity to issue');
      return;
    }
    if (qtyToIssue > availableStoreStock) {
      showToast(`⚠️ Cannot issue ${qtyToIssue} units: Only ${availableStoreStock} units available in Store`);
      return;
    }

    try {
      const res = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCode: selectedItemCode,
          itemName: selectedItemObj?.description || 'Approved Store Material',
          quantityIssued: qtyToIssue,
          uom: selectedItemObj?.unit || 'PCS',
          productionOfficer: prodOfficer,
          productionManager: profile?.fullName || 'Plant Admin',
          responsiblePerson: prodOfficer,
          jobCardNumber: jobCard || `JC-${Math.floor(1000 + Math.random() * 9000)}`,
          station,
          remarks: issueRemarks,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✓ Issued ${qtyToIssue} units of ${selectedItemCode} to ${prodOfficer}! Notification sent.`);
        setIsSendModalOpen(false);
        setJobCard('');
        setIssueRemarks('');
        await fetchProductionData();
      } else {
        showToast(`⚠️ ${data.error || 'Failed to issue material'}`);
      }
    } catch {
      showToast('⚠️ Error submitting production issue');
    }
  };

  // Handle Production Officer Acknowledging Receipt of Stock
  const handleAcknowledgeReceipt = async (issue: ProductionIssue) => {
    try {
      const res = await fetch('/api/production', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECEIVE',
          issueId: issue.id,
          receivedBy: profile?.fullName || issue.productionOfficer || 'Production Officer',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✓ Stock for voucher ${issue.voucherNumber} marked RECEIVED on shopfloor!`);
        await fetchProductionData();
      } else {
        showToast(`⚠️ ${data.error || 'Failed to receive stock'}`);
      }
    } catch {
      showToast('⚠️ Error receiving stock');
    }
  };

  // Open Report Modal
  const openReportModal = (issue: ProductionIssue) => {
    setSelectedIssueForReport(issue);
    setReadyToUseQty(issue.quantityIssued);
    setFailedProcessingQty(0);
    setSupplierFailedQty(0);
    setFileUrl1('');
    setFileUrl2('');
    setFileUrl3('');
    setReportRemarks('');
    setIsReportModalOpen(true);
  };

  // Handle Production Officer Submitting Final Report
  const handleSubmitProductionReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssueForReport) return;

    const totalReported = readyToUseQty + failedProcessingQty + supplierFailedQty;
    if (totalReported > selectedIssueForReport.quantityIssued) {
      showToast(`⚠️ Total reported units (${totalReported}) exceeds issued quantity (${selectedIssueForReport.quantityIssued})`);
      return;
    }

    try {
      const files = [fileUrl1.trim(), fileUrl2.trim(), fileUrl3.trim()].filter(Boolean);
      const res = await fetch('/api/production', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REPORT',
          issueId: selectedIssueForReport.id,
          readyToUseQty,
          failedProcessingQty,
          supplierFailedQty,
          fileUrls: files,
          remarks: reportRemarks,
          reportedBy: profile?.fullName || selectedIssueForReport.productionOfficer || 'Production Officer',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✓ Production report submitted! ${readyToUseQty} Ready units transferred to Finished Goods.`);
        setIsReportModalOpen(false);
        setSelectedIssueForReport(null);
        await fetchProductionData();
      } else {
        showToast(`⚠️ ${data.error || 'Failed to submit report'}`);
      }
    } catch {
      showToast('⚠️ Error submitting production report');
    }
  };

  const filteredIssues = issues.filter(
    (i) =>
      i.voucherNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.jobCardNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.itemName.toLowerCase().includes(search.toLowerCase()) ||
      i.station.toLowerCase().includes(search.toLowerCase()) ||
      (i.productionOfficer && i.productionOfficer.toLowerCase().includes(search.toLowerCase())) ||
      i.responsiblePerson.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGoods = finishedGoods.filter(
    (g) =>
      g.productCode.toLowerCase().includes(search.toLowerCase()) ||
      g.productName.toLowerCase().includes(search.toLowerCase()) ||
      g.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      g.storageLocation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: '8px',
            background: '#0f172a',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#9333ea',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Factory size={18} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Production Floor & Material Processing
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                Store issues QC-approved stock to production officers, who receive on shopfloor and submit batch reports.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Send to Production (Admin only) */}
        {isAdmin && (
          <button
            onClick={() => setIsSendModalOpen(true)}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              background: '#9333ea',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 3px 10px rgba(147, 51, 234, 0.3)',
            }}
          >
            <Plus size={16} />
            <span>Send Stock to Production</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('issues')}
          style={{
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'issues' ? '#faf5ff' : 'transparent',
            color: activeTab === 'issues' ? '#9333ea' : '#64748b',
            border: activeTab === 'issues' ? '1px solid #e9d5ff' : '1px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Layers size={15} />
          <span>Shopfloor Requisitions ({issues.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('finishedGoods')}
          style={{
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'finishedGoods' ? '#ecfdf5' : 'transparent',
            color: activeTab === 'finishedGoods' ? '#059669' : '#64748b',
            border: activeTab === 'finishedGoods' ? '1px solid #a7f3d0' : '1px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Package size={15} />
          <span>Finished Goods Stock ({finishedGoods.length})</span>
        </button>
      </div>

      {/* TAB 1: SHOPFLOOR MATERIAL ISSUES */}
      {activeTab === 'issues' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Search bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search Voucher, Job Card, Item, Officer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  fontSize: '12.5px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {filteredIssues.length} assigned production jobs
            </div>
          </div>

          {/* Desktop Issues Table */}
          <div className="desktop-table-view" style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12.5px', minWidth: '850px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>Voucher & Job Card</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#475569' }}>Material SKU</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>Qty Issued</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#475569' }}>Assigned Officer & Station</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#475569' }}>Report & Remarks</th>
                  {!isViewer && (
                    <th style={{ textAlign: 'center', padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>Action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      No production requisitions recorded. Click &apos;Send Stock to Production&apos; to dispatch materials from store.
                    </td>
                  </tr>
                ) : (
                  filteredIssues.map((iss) => {
                    const isPendingReceipt = iss.status === 'PENDING_RECEIPT';
                    const isInProcess = iss.status === 'IN_PROCESS' || iss.status === 'ISSUED';
                    const isCompleted = iss.status === 'COMPLETED';

                    return (
                      <tr key={iss.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                            {iss.voucherNumber}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>JC: {iss.jobCardNumber}</div>
                        </td>

                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#2563eb' }}>{iss.itemCode}</div>
                          <div style={{ fontSize: '11.5px', color: '#475569' }}>{iss.itemName}</div>
                        </td>

                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                          {iss.quantityIssued} {iss.uom}
                        </td>

                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{iss.productionOfficer || iss.productionManager}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{iss.station}</div>
                        </td>

                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              background: isCompleted ? '#dcfce7' : isInProcess ? '#fef3c7' : '#e0e7ff',
                              color: isCompleted ? '#166534' : isInProcess ? '#b45309' : '#3730a3',
                            }}
                          >
                            {isCompleted ? '✓ REPORTED' : isInProcess ? '⚙️ IN PROCESS' : '⏳ PENDING RECEIPT'}
                          </span>
                        </td>

                        <td style={{ padding: '10px 12px' }}>
                          {iss.report ? (
                            <div style={{ fontSize: '11.5px' }}>
                              <div style={{ color: '#166534', fontWeight: 700 }}>
                                Ready: {iss.report.readyToUseQty} | Process Fail: {iss.report.failedProcessingQty} | Supplier Fail: {iss.report.supplierFailedQty}
                              </div>
                              <div style={{ color: '#64748b', fontStyle: 'italic' }}>&quot;{iss.report.remarks}&quot;</div>
                              {iss.report.fileUrls && iss.report.fileUrls.length > 0 && (
                                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                  {iss.report.fileUrls.map((url, idx) => (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ fontSize: '10.5px', color: '#2563eb', textDecoration: 'underline' }}
                                    >
                                      File {idx + 1}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>{iss.remarks || 'Awaiting shopfloor progress'}</span>
                          )}
                        </td>

                        {!isViewer && (
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {isPendingReceipt && (
                              <button
                                onClick={() => handleAcknowledgeReceipt(iss)}
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  borderRadius: '6px',
                                  background: '#2563eb',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                ✓ Receive Stock
                              </button>
                            )}

                            {isInProcess && (
                              <button
                                onClick={() => openReportModal(iss)}
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  borderRadius: '6px',
                                  background: '#059669',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                📝 Submit Report
                              </button>
                            )}

                            {isCompleted && (
                              <span style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: 700 }}>
                                Completed
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View for Issues */}
          <div className="mobile-card-view">
            {filteredIssues.length === 0 ? (
              <div className="mobile-card-item" style={{ textAlign: 'center', color: '#94a3b8' }}>
                No production requisitions recorded.
              </div>
            ) : (
              filteredIssues.map((iss) => {
                const isPendingReceipt = iss.status === 'PENDING_RECEIPT';
                const isInProcess = iss.status === 'IN_PROCESS' || iss.status === 'ISSUED';
                const isCompleted = iss.status === 'COMPLETED';

                return (
                  <div key={`m-iss-${iss.id}`} className="mobile-card-item">
                    <div className="mobile-card-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#0f172a' }}>
                            {iss.voucherNumber}
                          </span>
                          <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 600 }}>
                            JC: {iss.jobCardNumber}
                          </span>
                        </div>
                        <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '13.5px' }}>{iss.itemCode}</div>
                        <div style={{ fontSize: '12px', color: '#475569' }}>{iss.itemName}</div>
                      </div>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          background:
                            iss.status === 'COMPLETED'
                              ? '#dcfce7'
                              : iss.status === 'IN_PROCESS' || iss.status === 'ISSUED'
                              ? '#eff6ff'
                              : '#fef3c7',
                          color:
                            iss.status === 'COMPLETED'
                              ? '#15803d'
                              : iss.status === 'IN_PROCESS' || iss.status === 'ISSUED'
                              ? '#1d4ed8'
                              : '#b45309',
                        }}
                      >
                        {iss.status === 'PENDING_RECEIPT'
                          ? '⏳ Awaiting Receipt'
                          : iss.status === 'IN_PROCESS' || iss.status === 'ISSUED'
                          ? '⚙️ On Floor'
                          : '✓ Completed'}
                      </span>
                    </div>

                    <div className="mobile-card-grid">
                      <div className="mobile-card-field">
                        <span className="mobile-card-field-label">QTY ISSUED</span>
                        <span className="mobile-card-field-val" style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>
                          {iss.quantityIssued} {iss.uom}
                        </span>
                      </div>
                      <div className="mobile-card-field">
                        <span className="mobile-card-field-label">WORKSTATION</span>
                        <span className="mobile-card-field-val">{iss.station}</span>
                      </div>
                      <div className="mobile-card-field" style={{ gridColumn: 'span 2' }}>
                        <span className="mobile-card-field-label">ASSIGNED OFFICER</span>
                        <span className="mobile-card-field-val">{iss.productionOfficer || iss.responsiblePerson}</span>
                      </div>
                    </div>

                    {iss.remarks && (
                      <div style={{ fontSize: '11.5px', color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                        Note: {iss.remarks}
                      </div>
                    )}

                    {!isViewer && (
                      <div className="mobile-card-actions">
                        {isPendingReceipt && (
                          <button
                            onClick={() => handleAcknowledgeReceipt(iss)}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              borderRadius: '6px',
                              background: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            ✓ Receive Stock on Floor
                          </button>
                        )}

                        {isInProcess && (
                          <button
                            onClick={() => openReportModal(iss)}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              borderRadius: '6px',
                              background: '#059669',
                              color: '#ffffff',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            📝 Submit Production Report
                          </button>
                        )}

                        {isCompleted && (
                          <div style={{ flex: 1, textAlign: 'center', padding: '6px', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '12px', borderRadius: '6px' }}>
                            ✓ Job Order Completed
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FINISHED GOODS STOCK */}
      {activeTab === 'finishedGoods' && (
        <>
          {/* Desktop Table View */}
          <div className="desktop-table-view" style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12.5px', minWidth: '780px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>Product Code</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#475569' }}>Product Name</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>Batch Number</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>Available for Dispatch</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#475569' }}>Location</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#475569' }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredGoods.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      No Finished Goods stock available. Completed production jobs will automatically appear here.
                    </td>
                  </tr>
                ) : (
                  filteredGoods.map((fg) => (
                    <tr key={fg.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {fg.productCode}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{fg.productName}</td>
                      <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{fg.batchNumber}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#16a34a', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        {fg.availableQuantity} {fg.uom}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>{fg.storageLocation}</td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '11.5px' }}>{fg.remarks || 'Ready for Dispatch Entry'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View for Finished Goods */}
          <div className="mobile-card-view">
            {filteredGoods.length === 0 ? (
              <div className="mobile-card-item" style={{ textAlign: 'center', color: '#94a3b8' }}>
                No Finished Goods stock available.
              </div>
            ) : (
              filteredGoods.map((fg) => (
                <div key={`m-fg-${fg.id}`} className="mobile-card-item">
                  <div className="mobile-card-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 800, color: '#059669', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                          {fg.productCode}
                        </span>
                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontSize: '10.5px' }}>
                          Lot: {fg.batchNumber}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{fg.productName}</div>
                    </div>
                    <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                      Ready
                    </span>
                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-card-field">
                      <span className="mobile-card-field-label">AVAILABLE FOR DISPATCH</span>
                      <span className="mobile-card-field-val" style={{ color: '#16a34a', fontWeight: 800, fontSize: '13.5px' }}>
                        {fg.availableQuantity} {fg.uom}
                      </span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-field-label">STORAGE LOCATION</span>
                      <span className="mobile-card-field-val">{fg.storageLocation}</span>
                    </div>
                    <div className="mobile-card-field" style={{ gridColumn: 'span 2' }}>
                      <span className="mobile-card-field-label">REMARKS</span>
                      <span className="mobile-card-field-val">{fg.remarks || 'Ready for Dispatch Entry'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* MODAL 1: SEND STOCK TO PRODUCTION (Admin) */}
      {isSendModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0' }}>
              ⚙️ Issue Store Stock to Production
            </h3>

            <form onSubmit={handleSendToProduction}>
              {/* Select SKU from Approved Store Stock */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Select Material from Store Stock *
                </label>
                <select
                  value={selectedItemCode}
                  onChange={(e) => setSelectedItemCode(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  {approvedItems.map((it) => (
                    <option key={it.id} value={it.itemCode}>
                      {it.itemCode} - {it.description} ({it.availableStoreStock} units in Store)
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '11.5px', color: '#2563eb', marginTop: '4px' }}>
                  Available in Store: <strong>{availableStoreStock}</strong> {selectedItemObj?.unit || 'units'}
                </div>
              </div>

              {/* Choose Production Officer */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Assign Production Officer *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sudhakar Magar (Production Officer)"
                  value={prodOfficer}
                  onChange={(e) => setProdOfficer(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              {/* Quantity to Issue */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Quantity to Issue (from available stock) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={availableStoreStock || 9999}
                  required
                  value={qtyToIssue}
                  onChange={(e) => setQtyToIssue(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 800 }}
                />
              </div>

              {/* Workstation & Job Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Station / Line
                  </label>
                  <input
                    type="text"
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Job Card # (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="JC-AUTO"
                    value={jobCard}
                    onChange={(e) => setJobCard(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Issue Notes / Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Precision machining required per drawing Rev B."
                  value={issueRemarks}
                  onChange={(e) => setIssueRemarks(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsSendModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', background: '#9333ea', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  Confirm Issue to Production
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMIT PRODUCTION REPORT (Production Officer) */}
      {isReportModalOpen && selectedIssueForReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '560px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              📋 Submit Batch Production Report
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px 0' }}>
              Material: <strong>{selectedIssueForReport.itemName}</strong> ({selectedIssueForReport.itemCode}) | Total Issued: <strong>{selectedIssueForReport.quantityIssued} units</strong>
            </p>

            <form onSubmit={handleSubmitProductionReport}>
              {/* 3 Outcome Quantities */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Ready to Use (FG) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={readyToUseQty}
                    onChange={(e) => setReadyToUseQty(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #10b981', fontSize: '15px', fontWeight: 800, color: '#065f46' }}
                  />
                  <div style={{ fontSize: '10px', color: '#047857', marginTop: '2px' }}>Goes to Finished Goods</div>
                </div>

                <div style={{ background: '#fff1f2', padding: '10px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Failed in Processing *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={failedProcessingQty}
                    onChange={(e) => setFailedProcessingQty(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ef4444', fontSize: '15px', fontWeight: 800, color: '#991b1b' }}
                  />
                  <div style={{ fontSize: '10px', color: '#b91c1c', marginTop: '2px' }}>In-house machine defect</div>
                </div>

                <div style={{ background: '#fffbeb', padding: '10px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Supplier Failed *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={supplierFailedQty}
                    onChange={(e) => setSupplierFailedQty(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #f59e0b', fontSize: '15px', fontWeight: 800, color: '#92400e' }}
                  />
                  <div style={{ fontSize: '10px', color: '#b45309', marginTop: '2px' }}>Raw material defect</div>
                </div>
              </div>

              {/* 3 Proof Files / Attachments */}
              <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  📎 Attach Up to 3 Proof Files / Defect Photos (Optional)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="File 1 URL or Photo Name (e.g. https://... or defect-photo-1.jpg)"
                    value={fileUrl1}
                    onChange={(e) => setFileUrl1(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                  <input
                    type="text"
                    placeholder="File 2 URL or Photo Name (Optional)"
                    value={fileUrl2}
                    onChange={(e) => setFileUrl2(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                  <input
                    type="text"
                    placeholder="File 3 URL or Test Certificate (Optional)"
                    value={fileUrl3}
                    onChange={(e) => setFileUrl3(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Production Remarks / Failure Causes *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. 180 units turned cleanly. 12 units shattered due to internal porosity (supplier flaw). 8 units ruined on tool failure."
                  value={reportRemarks}
                  onChange={(e) => setReportRemarks(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '6px', background: '#059669', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  Submit Report & Notify Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
