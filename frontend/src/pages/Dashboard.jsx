import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "../App";
import { useAuth } from "../context/AuthContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
        <div className="h-3 w-20 bg-gray-100 rounded"></div>
      </div>
      <div className="h-8 w-16 bg-gray-200 rounded-lg"></div>
    </div>
    <div className="space-y-3">
      <div className="h-2 w-full bg-gray-100 rounded"></div>
      <div className="flex justify-between">
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        <div className="h-8 w-24 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  </div>
);

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
  const [addTenantStep, setAddTenantStep] = useState(1);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [savingTenant, setSavingTenant] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    propertyId: '', roomId: '', bedNumber: '',
    name: '', mobile: '',
    rentAmount: '', advanceAmount: '',
    joiningDate: new Date().toISOString().split('T')[0],
  });

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

  useEffect(() => {
    fetchPendingPayments();
  }, []);

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
      const advUsed = parseFloat(advanceUsed) || 0;
      newAmountPaid = Math.min(payment.rentAmount, (payment.amountPaid || 0) + advUsed);
      newAdvanceUsed = advUsed;
      newAdvanceAdded = undefined;
      newStatus = newAmountPaid >= payment.rentAmount ? "PAID" : advUsed > 0 ? "PARTIAL" : "PENDING";
    } else {
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
      toast.success("Payment recorded successfully!");
      closeMarkPaidModal();
      fetchPendingPayments();
    } catch (error) {
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
    try {
      setSavingTenant(true);
      await axios.post(`${BACKEND_URL}/api/tenants`,
        { userId: currentUserId, ...tenantForm },
        { withCredentials: true }
      );
      toast.success(`${tenantForm.name} added successfully!`);
      setShowAddTenant(false);
      fetchPendingPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add tenant');
    } finally {
      setSavingTenant(false);
    }
  };

  const getPaymentUrgency = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) return { label: `${Math.abs(diff)}d Overdue`, class: "bg-rose-100 text-rose-700 border-rose-200", pulse: true };
    if (diff === 0) return { label: "Due Today", class: "bg-amber-100 text-amber-700 border-amber-200", pulse: true };
    if (diff <= 3) return { label: `Due in ${diff}d`, class: "bg-orange-50 text-orange-700 border-orange-100", pulse: false };
    return { label: `Due in ${diff}d`, class: "bg-blue-50 text-blue-700 border-blue-100", pulse: false };
  };

  const mp = markPaidModal.payment;
  const mpAdvLeft = mp?.tenant?.advanceLeft || 0;
  const mpBalance = mp ? mp.rentAmount - (mp.amountPaid || 0) : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">

      <div className="max-w-7xl mx-auto px-2 sm:px-6 pt-2 pb-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 w-12 h-12 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-all group-hover:w-14 group-hover:h-14"></div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Pending</p>
            <h3 className="text-lg sm:text-xl font-black text-slate-800">{stats.totalPending}</h3>
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 w-12 h-12 bg-rose-50 rounded-bl-full -mr-4 -mt-4 transition-all group-hover:w-14 group-hover:h-14"></div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Due</p>
            <h3 className="text-lg sm:text-xl font-black text-rose-600">₹{stats.totalAmount.toLocaleString()}</h3>
          </div>
        </div>

        {/* Pending Payments Section */}
        <div className="space-y-4">

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(n => <SkeletonCard key={n} />)}
            </div>
          ) : pendingPayments.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pendingPayments.map((payment) => {
                const tenant = payment.tenant;
                const balance = payment.rentAmount - (payment.amountPaid || 0);
                const urgency = getPaymentUrgency(payment.dueDate);
                const roomNum = tenant?.roomId?.roomNumber || "N/A";
                const propName = tenant?.propertyId?.name || "Hostel";

                return (
                  <div
                    key={payment._id}
                    className="group bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all flex flex-col overflow-hidden"
                  >
                    {/* Tinted Header: Property & Room */}
                    <div className="bg-slate-50 border-b border-slate-100 px-2.5 py-2 flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[9px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded shadow-sm">
                            ROOM-{roomNum}
                          </span>
                          <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-tight line-clamp-1">{propName}</h4>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] font-bold text-slate-500">{tenant?.name || "Unknown"}</p>
                          {urgency.pulse && <span className="flex h-1 w-1 rounded-full bg-rose-500 animate-pulse"></span>}
                        </div>
                      </div>
                      <span className={`text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded border shadow-sm ${urgency.class}`}>
                        {urgency.label}
                      </span>
                    </div>

                    <div className="p-2.5 flex flex-col flex-1">
                      {/* Compact Progress & Amount */}
                      <div className="bg-slate-50/50 rounded-xl p-2 mb-2">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[13px] font-black text-rose-600">₹{balance.toLocaleString()}</p>
                        <p className="text-[8px] font-bold text-slate-400">/ ₹{payment.rentAmount.toLocaleString()}</p>
                      </div>
                      <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-500" 
                          style={{ width: `${(payment.amountPaid / payment.rentAmount) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Action Hub */}
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1">
                        <a href={`tel:${tenant?.mobile}`} className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                        </a>
                        <button onClick={() => handleWhatsAppReminder(payment)} className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </button>
                      </div>
                      {canDo('payments', 'edit') && (
                        <button 
                          onClick={() => handleOpenMarkPaid(payment)}
                          className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                        >
                          COLLECT
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-[40px] border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Zero Dues!</h3>
              <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto">Excellent job. All payments for this period have been successfully collected.</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      {canDo('tenants', 'add') && (
        <button
          onClick={openAddTenant}
          className="fixed bottom-6 right-6 z-40 h-11 px-4 rounded-xl bg-slate-900 text-white shadow-xl shadow-slate-400 flex items-center gap-2 hover:bg-slate-800 hover:-translate-y-1 transition-all active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
          <span className="font-black text-[11px] uppercase tracking-wider">Tenant</span>
        </button>
      )}

      {/* Modern Record Payment Modal */}
      {markPaidModal.open && mp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Collect Rent</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase">{mp.tenant?.name} • Room {mp.tenant?.roomId?.roomNumber}</p>
                </div>
                <button onClick={closeMarkPaidModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Balance</p>
                    <p className="text-lg font-black text-rose-600">₹{mpBalance.toLocaleString()}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Advance</p>
                    <p className="text-lg font-black text-indigo-600">₹{mpAdvLeft.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {!markPaidModal.useAdvanceChecked ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Payment Date</label>
                        <input 
                          type="date" 
                          value={markPaidModal.date}
                          onChange={(e) => setMarkPaidModal(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Cash Collected (₹)</label>
                        <input 
                          type="number"
                          value={markPaidModal.cashCollected}
                          onChange={(e) => setMarkPaidModal(prev => ({ ...prev, cashCollected: e.target.value }))}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-lg font-black focus:border-indigo-500 focus:bg-white outline-none transition-all"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-[10px] font-black text-indigo-400 uppercase mb-1.5 ml-1">Amount to use from Advance</label>
                      <input 
                        type="number"
                        max={Math.min(mpAdvLeft, mpBalance)}
                        value={markPaidModal.advanceUsed}
                        onChange={(e) => setMarkPaidModal(prev => ({ ...prev, advanceUsed: e.target.value }))}
                        className="w-full bg-indigo-50 border-2 border-indigo-100 rounded-2xl px-4 py-3 text-lg font-black text-indigo-700 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  )}

                  {mpAdvLeft > 0 && (
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 cursor-pointer hover:border-indigo-300 transition-all">
                      <input 
                        type="checkbox"
                        checked={markPaidModal.useAdvanceChecked}
                        onChange={(e) => setMarkPaidModal(prev => ({
                          ...prev,
                          useAdvanceChecked: e.target.checked,
                          advanceUsed: e.target.checked ? String(Math.min(mpAdvLeft, mpBalance)) : "",
                          cashCollected: e.target.checked ? "" : String(mpBalance)
                        }))}
                        className="w-5 h-5 rounded-lg accent-indigo-600"
                      />
                      <span className="text-xs font-bold text-slate-600">Use Advance Balance instead of Cash</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={closeMarkPaidModal}
                  className="flex-1 px-6 py-3.5 rounded-2xl font-black text-xs text-slate-400 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleConfirmMarkAsPaid}
                  disabled={markingPaid}
                  className="flex-[2] px-6 py-3.5 rounded-2xl font-black text-xs text-white bg-indigo-600 shadow-xl shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {markingPaid ? <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : null}
                  {markingPaid ? "PROCESSING..." : "CONFIRM RECEIPT"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Tenant Modal would follow a similar premium redesign pattern */}
      {showAddTenant && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-md my-auto shadow-2xl overflow-hidden">
            <div className="bg-slate-900 p-6 text-white">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-tight">New Tenant</h3>
                <button onClick={() => setShowAddTenant(false)} className="p-1 hover:bg-white/10 rounded-full">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-1">STEP {addTenantStep} OF 2</p>
            </div>

            <div className="p-6">
              {addTenantStep === 1 ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 mb-4">Choose a property to begin:</p>
                  {properties.map(prop => (
                    <button 
                      key={prop._id} 
                      onClick={() => handleSelectProperty(prop._id)}
                      className="w-full group flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-800">{prop.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">{prop.location}</p>
                      </div>
                      <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7"/></svg>
                    </button>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleAddTenantSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Full Name</label>
                      <input required value={tenantForm.name} onChange={e => setTenantForm(p => ({...p, name: e.target.value}))} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Mobile</label>
                      <input required type="tel" maxLength={10} value={tenantForm.mobile} onChange={e => setTenantForm(p => ({...p, mobile: e.target.value}))} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Room</label>
                      <select required value={tenantForm.roomId} onChange={e => setTenantForm(p => ({...p, roomId: e.target.value}))} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:border-indigo-500 outline-none appearance-none">
                        <option value="">Select</option>
                        {rooms.map(r => <option key={r._id} value={r._id}>Room {r.roomNumber}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-8">
                    <button type="button" onClick={() => setAddTenantStep(1)} className="flex-1 px-6 py-3.5 rounded-2xl font-black text-xs text-slate-400 bg-slate-100">BACK</button>
                    <button type="submit" disabled={savingTenant} className="flex-[2] px-6 py-3.5 rounded-2xl font-black text-xs text-white bg-indigo-600 shadow-xl shadow-indigo-200">
                      {savingTenant ? "SAVING..." : "CREATE TENANT"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
