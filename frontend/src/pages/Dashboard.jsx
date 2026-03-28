import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "../App";
import { useAuth } from "../context/AuthContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Dashboard() {
  const navigate = useNavigate();
  const { user, canDo } = useAuth();
  const currentUserId = user?.id || user?._id || "";
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPending: 0, totalAmount: 0 });
  const [markPaidModal, setMarkPaidModal] = useState({
    open: false,
    payment: null,
    date: new Date().toISOString().split("T")[0],
    cashCollected: "",
    useAdvanceChecked: false,
    advanceUsed: "",
  });
  const [markingPaid, setMarkingPaid] = useState(false);

  // --- Quick Add Tenant FAB ---
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [addTenantStep, setAddTenantStep] = useState(1); // 1=property, 2=room+details
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [savingTenant, setSavingTenant] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    propertyId: '', roomId: '', bedNumber: '',
    name: '', mobile: '',
    rentAmount: '', advanceAmount: '',
    joiningDate: new Date().toISOString().split('T')[0],
  });
  const selectedAddRoom = rooms.find(r => r._id === tenantForm.roomId);

  const openAddTenant = async () => {
    setTenantForm({ propertyId: '', roomId: '', bedNumber: '', name: '', mobile: '', rentAmount: '', advanceAmount: '', joiningDate: new Date().toISOString().split('T')[0] });
    setAddTenantStep(1);
    setShowAddTenant(true);
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/properties`, { withCredentials: true });
      setProperties(data || []);
    } catch { toast.error('Failed to load properties'); }
  };

  const handleSelectProperty = async (propertyId) => {
    setTenantForm(prev => ({ ...prev, propertyId, roomId: '', bedNumber: '', rentAmount: '' }));
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/rooms?propertyId=${propertyId}`, { withCredentials: true });
      setRooms(data || []);
      setAddTenantStep(2);
    } catch { toast.error('Failed to load rooms'); }
  };

  const handleAddTenantSubmit = async (e) => {
    e.preventDefault();
    if (!tenantForm.propertyId || !tenantForm.roomId || !tenantForm.name || !tenantForm.mobile) {
      toast.error('Please fill all required fields');
      return;
    }
    const userId = currentUserId;
    if (!userId) { toast.error('Not authenticated'); return; }
    try {
      setSavingTenant(true);
      await axios.post(`${BACKEND_URL}/api/tenants`,
        { userId, ...tenantForm },
        { withCredentials: true }
      );
      toast.success(`${tenantForm.name} added successfully!`);
      setShowAddTenant(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add tenant');
    } finally {
      setSavingTenant(false);
    }
  };

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${BACKEND_URL}/api/payments/dashboard/pending`, { withCredentials: true });
      setPendingPayments(data?.data || []);
      setStats(data?.stats || { totalPending: 0, totalAmount: 0 });
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Error loading payments");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMarkPaid = (payment) => {
    const balance = Math.max(0, payment.rentAmount - (payment.amountPaid || 0));
    setMarkPaidModal({
      open: true,
      payment,
      date: new Date().toISOString().split("T")[0],
      cashCollected: String(balance),
      useAdvanceChecked: false,
      advanceUsed: "",
    });
  };

  const closeMarkPaidModal = () => setMarkPaidModal({
    open: false, payment: null,
    date: new Date().toISOString().split("T")[0],
    cashCollected: "", useAdvanceChecked: false, advanceUsed: "",
  });

  const handleConfirmMarkAsPaid = async () => {
    if (!markPaidModal.payment?._id) return;
    if (!currentUserId) { toast.error("User not authenticated."); return; }

    const { payment, date, cashCollected, advanceUsed, useAdvanceChecked } = markPaidModal;

    let newAmountPaid, newAdvanceUsed, newAdvanceAdded, newStatus;

    if (useAdvanceChecked) {
      // MODE: Adjust advance against rent — ignore cash collected
      const advUsed = parseFloat(advanceUsed) || 0;
      newAmountPaid = Math.min(payment.rentAmount, (payment.amountPaid || 0) + advUsed);
      newAdvanceUsed = advUsed;
      newAdvanceAdded = undefined;
      newStatus = newAmountPaid >= payment.rentAmount ? "PAID" : advUsed > 0 ? "PARTIAL" : "PENDING";
    } else {
      // MODE: Cash payment — excess auto-goes to advance
      const cash = parseFloat(cashCollected) || 0;
      const balance = payment.rentAmount - (payment.amountPaid || 0);
      const cashForRent = Math.min(cash, balance);
      const excessCash = Math.max(0, cash - balance);
      newAmountPaid = (payment.amountPaid || 0) + cashForRent;
      newAdvanceUsed = 0;
      newAdvanceAdded = excessCash > 0 ? excessCash : undefined;
      newStatus = newAmountPaid >= payment.rentAmount ? "PAID" : newAmountPaid > 0 ? "PARTIAL" : "PENDING";
    }

    try {
      setMarkingPaid(true);
      await axios.patch(
        `${BACKEND_URL}/api/payments/${payment._id}`,
        {
          userId: currentUserId,
          amountPaid: newAmountPaid,
          advanceUsed: newAdvanceUsed,
          advanceAdded: newAdvanceAdded,
          paymentDate: date,
          status: newStatus,
        },
        { withCredentials: true }
      );
      const msgs = [];
      if (newStatus === "PAID") msgs.push("Rent marked as Paid ✅");
      else if (newStatus === "PARTIAL") msgs.push("Partial payment recorded");
      if (newAdvanceAdded > 0) msgs.push(`₹${newAdvanceAdded.toLocaleString()} added to advance`);
      if (newAdvanceUsed > 0) msgs.push(`₹${newAdvanceUsed.toLocaleString()} advance used`);
      toast.success(msgs.join(" • "));
      closeMarkPaidModal();
      fetchPendingPayments();
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.response?.data?.message || "Error recording payment");
    } finally {
      setMarkingPaid(false);
    }
  };


  const handleWhatsAppReminder = async (payment) => {
    const tenant = payment.tenant;
    const amount = payment.rentAmount - (payment.amountPaid || 0);
    const monthYear = new Date(payment.year, payment.month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

    try {
      await axios.post(`${BACKEND_URL}/api/payments/${payment._id}/track-reminder`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Error tracking reminder:", error);
    }

    const propertyName = tenant?.propertyId?.name || tenant?.roomId?.propertyId?.name || "Our Property";
    const message = `Hello ${tenant?.name || "Tenant"},\n\nThis is a friendly reminder that your rent payment of *₹${amount.toLocaleString()}* for *${monthYear}* is pending.\n\nProperty: ${propertyName}\nRoom: ${tenant?.roomId?.roomNumber ? `Room ${tenant.roomId.roomNumber}` : "N/A"}${tenant?.bedNumber ? ` - Bed ${tenant.bedNumber}` : ""}\n\nPlease make the payment at your earliest convenience.\n\nThank you!`;
    const whatsappUrl = `https://wa.me/91${tenant?.mobile}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    fetchPendingPayments();
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB");
  };

  const getPaymentStatus = (payment) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(payment.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: "bg-red-100 text-red-700" };
    if (diffDays === 0) return { label: "Due today", color: "bg-orange-100 text-orange-700" };
    if (diffDays <= 3) return { label: `Due in ${diffDays}d`, color: "bg-yellow-100 text-yellow-700" };
    return { label: `Due in ${diffDays}d`, color: "bg-blue-100 text-blue-700" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  // Modal shorthand
  const mp = markPaidModal.payment;
  const mpAdvLeft = mp?.tenant?.advanceLeft || 0;
  const mpBalance = mp ? mp.rentAmount - (mp.amountPaid || 0) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-1 py-1.5 sm:p-4">
      <div className="w-full sm:max-w-7xl mx-auto space-y-1.5 sm:space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-1 sm:gap-4">
          <div className="bg-white rounded-md sm:rounded-2xl shadow-sm border border-blue-500 p-1.5 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[7px] sm:text-xs font-bold text-gray-500 uppercase">Pending</p>
                <h3 className="text-sm sm:text-3xl font-black text-blue-600">{stats.totalPending}</h3>
              </div>
              <div className="w-5 h-5 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded sm:rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-xs sm:text-2xl">📋</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-md sm:rounded-2xl shadow-sm border border-red-500 p-1.5 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[7px] sm:text-xs font-bold text-gray-500 uppercase">Amount</p>
                <h3 className="text-sm sm:text-3xl font-black text-red-600">₹{stats.totalAmount.toLocaleString()}</h3>
              </div>
              <div className="w-5 h-5 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-red-600 rounded sm:rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-xs sm:text-2xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mark Paid Modal */}
        {markPaidModal.open && mp && (() => {
          const isAdvMode = markPaidModal.useAdvanceChecked;
          const cash = isAdvMode ? 0 : (parseFloat(markPaidModal.cashCollected) || 0);
          const balance = mp.rentAmount - (mp.amountPaid || 0);
          const cashForRent = Math.min(cash, balance);
          const excessCash = Math.max(0, cash - balance);
          const advUsed = isAdvMode ? (parseFloat(markPaidModal.advanceUsed) || 0) : 0;
          const totalForRent = (mp.amountPaid || 0) + cashForRent + advUsed;
          const addToAdv = isAdvMode ? 0 : excessCash;
          const previewStatus = totalForRent >= mp.rentAmount ? "PAID" : totalForRent > 0 ? "PARTIAL" : "PENDING";
          return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-4 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Record Payment</h3>
                  <p className="text-xs text-gray-500">{mp.tenant?.name} — {new Date(mp.year, mp.month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                </div>
              </div>

              {mpAdvLeft > 0 && (
                <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-1.5 mb-3 text-xs">
                  <span className="text-blue-700 font-semibold">💰 Advance Available</span>
                  <span className="font-bold text-blue-700">₹{mpAdvLeft.toLocaleString()}</span>
                </div>
              )}

              {/* === CASH MODE === */}
              <div className={`transition-opacity ${isAdvMode ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                {/* Date */}
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Date</label>
                  <input type="date" value={markPaidModal.date}
                    onChange={(e) => setMarkPaidModal(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-400" />
                </div>

                {/* Cash Collected */}
                <div className="mb-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cash Collected (₹)</label>
                  <input type="number" min="0"
                    value={markPaidModal.cashCollected}
                    onChange={(e) => setMarkPaidModal(prev => ({ ...prev, cashCollected: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-400" />
                </div>
                {/* Excess → advance message */}
                {excessCash > 0 && !isAdvMode && (
                  <p className="text-[11px] text-purple-700 font-semibold bg-purple-50 rounded-lg px-3 py-1.5 mb-3">
                    ✨ ₹{excessCash.toLocaleString()} excess — will be added to advance balance
                  </p>
                )}
              </div>

              {/* Divider */}
              {mpAdvLeft > 0 && balance > 0 && (
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center"><span className="bg-white px-2 text-[10px] text-gray-400 uppercase tracking-wide">or</span></div>
                </div>
              )}

              {/* === ADVANCE MODE === */}
              {mpAdvLeft > 0 && balance > 0 && (
                <div className="mb-3">
                  <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-gray-200 hover:border-blue-300 transition">
                    <input type="checkbox"
                      checked={markPaidModal.useAdvanceChecked}
                      onChange={(e) => setMarkPaidModal(prev => ({
                        ...prev,
                        useAdvanceChecked: e.target.checked,
                        advanceUsed: e.target.checked ? String(Math.min(mpAdvLeft, balance)) : "",
                        cashCollected: e.target.checked ? "" : prev.cashCollected,
                      }))}
                      className="w-4 h-4 accent-blue-600 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-blue-700">Adjust current month against advance</div>
                      <div className="text-[10px] text-gray-500">Uses available advance balance to pay this month&apos;s rent</div>
                    </div>
                  </label>

                  {markPaidModal.useAdvanceChecked && (
                    <div className="mt-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Amount to adjust from advance (max ₹{Math.min(mpAdvLeft, balance).toLocaleString()})
                      </label>
                      <input type="number" min="0" max={Math.min(mpAdvLeft, balance)}
                        value={markPaidModal.advanceUsed}
                        onChange={(e) => setMarkPaidModal(prev => ({ ...prev, advanceUsed: e.target.value }))}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400" />
                    </div>
                  )}
                </div>
              )}

              {/* Live Preview */}
              <div className={`rounded-lg p-2.5 mb-3 text-xs border ${previewStatus === 'PAID' ? 'bg-green-50 border-green-200' : previewStatus === 'PARTIAL' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between"><span className="text-gray-600">Applied to rent:</span><span className="font-bold">₹{totalForRent.toLocaleString()} / ₹{mp.rentAmount?.toLocaleString()}</span></div>
                {addToAdv > 0 && <div className="flex justify-between mt-1"><span className="text-gray-600">Added to Advance:</span><span className="font-bold text-purple-700">+₹{addToAdv.toLocaleString()}</span></div>}
                {advUsed > 0 && <div className="flex justify-between mt-1"><span className="text-gray-600">Advance used:</span><span className="font-bold text-blue-700">-₹{advUsed.toLocaleString()}</span></div>}
                <div className="flex justify-between mt-1"><span className="text-gray-600">Status after:</span><span className={`font-bold ${previewStatus === 'PAID' ? 'text-green-700' : previewStatus === 'PARTIAL' ? 'text-yellow-700' : 'text-gray-500'}`}>{previewStatus}</span></div>
              </div>

              <div className="flex gap-2 justify-end">
                <button onClick={closeMarkPaidModal} disabled={markingPaid}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleConfirmMarkAsPaid} disabled={markingPaid}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                  {markingPaid ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : null}
                  {markingPaid ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </div>
          </div>
          );
        })()}

        {/* Pending Payments */}
        {pendingPayments.length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            {pendingPayments.map((payment) => {
              const tenant = payment.tenant;
              const amount = payment.rentAmount - (payment.amountPaid || 0);
              const monthYear = new Date(payment.year, payment.month - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
              const status = getPaymentStatus(payment);
              const propertyInfo = tenant?.propertyId || tenant?.roomId?.propertyId;
              const propertyName = propertyInfo?.name || "Unknown Property";
              const roomNumber = tenant?.roomId?.roomNumber;
              const bedNumber = tenant?.bedNumber;

              return (
                <div
                  key={payment._id}
                  className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/tenant/${tenant?._id}`)}
                >
                  <div className="bg-gradient-to-r from-black via-gray-800 to-gray-700">
                    <div className="flex items-stretch justify-between min-h-[68px] sm:min-h-[92px]">
                      <div className="flex items-stretch gap-2 sm:gap-3">
                        <div className="py-2 sm:py-3 px-2 sm:px-3 flex flex-col justify-center">
                          <h2 className="text-[12px] sm:text-xl font-bold text-white drop-shadow-lg leading-tight">{propertyName}</h2>
                          <div className="inline-flex items-center mt-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-yellow-300 text-black text-[10px] sm:text-sm font-semibold tracking-wide ring-2 ring-white/80 shadow-md shadow-black/25">
                            {roomNumber ? `ROOM ${roomNumber}` : "ROOM N/A"}{bedNumber ? ` - BED ${bedNumber}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="bg-white px-2 py-1 sm:px-3 sm:py-1.5 m-2 sm:m-3 rounded-md sm:rounded-xl text-center self-center">
                        <div className="text-xs sm:text-base font-black text-red-600">Rs {amount.toLocaleString()}</div>
                        <div className="text-[9px] sm:text-xs text-red-500 font-medium">Due: {formatDate(payment.dueDate)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-1.5 sm:p-4 bg-gradient-to-br from-gray-50 to-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] sm:text-base font-black text-gray-900">{tenant?.name || "Unknown"}</span>
                          <span className={`px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-bold ${status.color}`}>{status.label}</span>
                          {tenant?.advanceLeft > 0 && (
                            <span className="px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-blue-100 text-blue-700">
                              Adv: ₹{tenant.advanceLeft.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] sm:text-sm text-gray-600 flex items-center font-semibold">
                          <svg className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {tenant?.mobile}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 sm:gap-1" onClick={(e) => e.stopPropagation()}>
                        {canDo('payments', 'edit') && (
                        <button
                          onClick={() => handleOpenMarkPaid(payment)}
                          className="p-1.5 sm:p-2 bg-green-600 text-white rounded-md sm:rounded-lg hover:bg-green-700 transition"
                          title="Record Payment"
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        )}
                        <button
                          onClick={() => handleWhatsAppReminder(payment)}
                          className="p-1.5 sm:p-2 bg-green-500 text-white rounded-md sm:rounded-lg hover:bg-green-600 transition"
                          title="Send WhatsApp Reminder"
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </button>
                        <a
                          href={`tel:${tenant?.mobile}`}
                          className="p-1.5 sm:p-2 bg-blue-500 text-white rounded-md sm:rounded-lg hover:bg-blue-600 transition"
                          title="Call Tenant"
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1.5 sm:mt-3">
                      <div className="flex items-center gap-1 sm:gap-2">
                        {payment.reminderCount > 0 && (
                          <span className="text-[8px] sm:text-[10px] text-gray-400">
                            {payment.reminderCount} reminder{payment.reminderCount > 1 ? "s" : ""} sent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-12 flex flex-col items-center justify-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mb-2 sm:mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-sm sm:text-lg font-bold text-gray-700 mb-1">All Caught Up!</h3>
            <p className="text-xs sm:text-sm text-gray-500">No pending payments.</p>
          </div>
        )}
      </div>

      {/* Floating Add Tenant Button — only for users with tenants.add */}
      {canDo('tenants', 'add') && (
      <button
        onClick={openAddTenant}
        title="Add New Tenant"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xl transition hover:bg-indigo-700 hover:scale-110 active:scale-95"
      >
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      </button>
      )}

      {/* Quick Add Tenant Modal */}
      {showAddTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-white">Add New Tenant</h2>
                <p className="text-xs text-indigo-200">
                  {addTenantStep === 1 ? 'Step 1: Choose a property' : `Step 2: Room & details`}
                </p>
              </div>
              <button type="button" onClick={() => setShowAddTenant(false)}
                className="rounded-full p-1.5 text-white hover:bg-white/20">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Step 1: Property */}
            {addTenantStep === 1 && (
              <div className="p-5">
                <p className="text-sm text-gray-600 mb-3">Select the property where this tenant will stay:</p>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {properties.map(prop => (
                    <button key={prop._id} type="button"
                      onClick={() => handleSelectProperty(prop._id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition text-left">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{prop.name}</div>
                        <div className="text-xs text-gray-500">{prop.location}</div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                  {properties.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-6">No properties found.</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Tenant Details */}
            {addTenantStep === 2 && (
              <form onSubmit={handleAddTenantSubmit} className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
                {/* Room selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Room <span className="text-red-500">*</span></label>
                  <select value={tenantForm.roomId}
                    onChange={e => {
                      const room = rooms.find(r => r._id === e.target.value);
                      setTenantForm(prev => ({ ...prev, roomId: e.target.value, bedNumber: '', rentAmount: room?.rentAmount || '' }));
                    }}
                    required
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                    <option value="">Select Room</option>
                    {rooms.map(room => {
                      const avail = room.rentType === 'PER_BED'
                        ? (room.beds?.filter(b => b.status === 'AVAILABLE').length || 0) > 0
                        : room.status === 'AVAILABLE';
                      return (
                        <option key={room._id} value={room._id} disabled={!avail}>
                          Room {room.roomNumber} — ₹{room.rentAmount}{room.rentType === 'PER_BED' ? ' (per bed)' : ''}{!avail ? ' (Full)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Bed selector (if PER_BED) */}
                {selectedAddRoom?.rentType === 'PER_BED' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bed <span className="text-red-500">*</span></label>
                    <select value={tenantForm.bedNumber}
                      onChange={e => setTenantForm(prev => ({ ...prev, bedNumber: e.target.value }))}
                      required
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                      <option value="">Select Bed</option>
                      {selectedAddRoom.beds?.map(bed => (
                        <option key={bed.bedNumber} value={bed.bedNumber} disabled={bed.status !== 'AVAILABLE'}>
                          Bed {bed.bedNumber}{bed.status !== 'AVAILABLE' ? ' (Occupied)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Name + Mobile */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                    <input type="text" required placeholder="Full name"
                      value={tenantForm.name}
                      onChange={e => setTenantForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile <span className="text-red-500">*</span></label>
                    <input type="tel" required placeholder="10 digits" maxLength={10} inputMode="numeric"
                      value={tenantForm.mobile}
                      onChange={e => setTenantForm(prev => ({ ...prev, mobile: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                </div>

                {/* Rent + Advance */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rent (₹) <span className="text-red-500">*</span></label>
                    <input type="number" required min="0" placeholder="Monthly rent"
                      value={tenantForm.rentAmount}
                      onChange={e => setTenantForm(prev => ({ ...prev, rentAmount: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Advance (₹)</label>
                    <input type="number" min="0" placeholder="Deposit"
                      value={tenantForm.advanceAmount}
                      onChange={e => setTenantForm(prev => ({ ...prev, advanceAmount: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                </div>

                {/* Join Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Join Date <span className="text-red-500">*</span></label>
                  <input type="date" required
                    value={tenantForm.joiningDate}
                    onChange={e => setTenantForm(prev => ({ ...prev, joiningDate: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                </div>

                <div className="flex gap-2 justify-between pt-2">
                  <button type="button" onClick={() => setAddTenantStep(1)}
                    className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    ← Back
                  </button>
                  <button type="submit" disabled={savingTenant}
                    className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-70">
                    {savingTenant ? 'Saving...' : '✓ Add Tenant'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
