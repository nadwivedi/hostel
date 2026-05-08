import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "../App";
import { useAuth } from "../context/AuthContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Payments() {
  const { user, canDo } = useAuth();
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [markPaidModal, setMarkPaidModal] = useState({
    open: false,
    payment: null,
    date: new Date().toISOString().split("T")[0],
    advanceUsed: "",
  });
  const [formData, setFormData] = useState({
    tenantId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    rentAmount: "",
    amountPaid: "",
    advanceUsed: "",
    useAdvance: false,
    advanceAvailable: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    status: "PENDING",
  });

  useEffect(() => {
    fetchPayments();
    fetchActiveTenants();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/payments`, { withCredentials: true });
      setPayments(response.data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const fetchActiveTenants = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/tenants?status=ACTIVE`, { withCredentials: true });
      setTenants(response.data);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newVal = type === "checkbox" ? checked : value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: newVal };

      if (name === "tenantId") {
        const tenant = tenants.find((t) => t._id === value);
        if (tenant) {
          updated.rentAmount = tenant.rentAmount || "";
          updated.advanceAvailable = tenant.advanceLeft || 0;
          updated.advanceUsed = "";
          updated.useAdvance = false;
        }
      }

      // Recalculate status
      const cash = name === "amountPaid" ? parseFloat(newVal) || 0 : parseFloat(updated.amountPaid) || 0;
      const adv = name === "advanceUsed" ? parseFloat(newVal) || 0 : parseFloat(updated.advanceUsed) || 0;
      const useAdv = name === "useAdvance" ? checked : updated.useAdvance;
      const rent = name === "rentAmount" ? parseFloat(newVal) || 0 : parseFloat(updated.rentAmount) || 0;
      const effective = cash + (useAdv ? adv : 0);

      if (rent > 0 && effective >= rent) updated.status = "PAID";
      else if (effective > 0) updated.status = "PARTIAL";
      else updated.status = "PENDING";

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const advanceToUse = formData.useAdvance ? parseFloat(formData.advanceUsed) || 0 : 0;
      const paymentData = {
        userId: user?._id,
        tenantId: formData.tenantId,
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        rentAmount: parseFloat(formData.rentAmount),
        amountPaid: parseFloat(formData.amountPaid) || 0,
        advanceUsed: advanceToUse,
        paymentDate:
          (parseFloat(formData.amountPaid) || 0) + advanceToUse > 0 ? formData.paymentDate : null,
        status: formData.status,
      };

      await axios.post(`${BACKEND_URL}/api/payments`, paymentData, { withCredentials: true });
      toast.success("Payment record created successfully!");
      setShowForm(false);
      setFormData({
        tenantId: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        rentAmount: "",
        amountPaid: "",
        advanceUsed: "",
        useAdvance: false,
        advanceAvailable: 0,
        paymentDate: new Date().toISOString().split("T")[0],
        status: "PENDING",
      });
      fetchPayments();
      fetchActiveTenants();
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error(error.response?.data?.message || "Error creating payment record");
    }
  };

  // Open mark-paid modal
  const handleOpenMarkPaid = (payment) => {
    setMarkPaidModal({
      open: true,
      payment,
      date: new Date().toISOString().split("T")[0],
      advanceUsed: "",
    });
  };

  // Confirm mark-paid
  const handleConfirmMarkPaid = async () => {
    const { payment, date, advanceUsed: advUsed } = markPaidModal;
    const tenantAdvanceLeft = payment.tenantId?.advanceLeft || 0;
    const advAmount = parseFloat(advUsed) || 0;
    try {
      const newAmountPaid = payment.amountPaid + advAmount;
      let newStatus = "PENDING";
      if (newAmountPaid >= payment.rentAmount) newStatus = "PAID";
      else if (newAmountPaid > 0) newStatus = "PARTIAL";

      await axios.patch(
        `${BACKEND_URL}/api/payments/${payment._id}`,
        {
          userId: user?._id,
          amountPaid: newAmountPaid,
          advanceUsed: advAmount,
          paymentDate: date,
          status: newStatus,
        },
        { withCredentials: true }
      );

      // If advance was used, deduct from tenant
      if (advAmount > 0) {
        await axios.patch(
          `${BACKEND_URL}/api/tenants/${payment.tenantId._id}`,
          {
            userId: user?._id,
            advanceLeft: Math.max(0, tenantAdvanceLeft - advAmount),
          },
          { withCredentials: true }
        );
      }

      toast.success("Payment updated successfully!");
      setMarkPaidModal({ open: false, payment: null, date: new Date().toISOString().split("T")[0], advanceUsed: "" });
      fetchPayments();
      fetchActiveTenants();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating payment");
    }
  };

  const handleDelete = async (payment) => {
    if (!window.confirm("Are you sure you want to delete this payment record?")) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/payments/${payment._id}`, {
        data: { userId: user?._id },
        withCredentials: true,
      });
      toast.success("Payment deleted successfully!");
      fetchPayments();
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error(error.response?.data?.message || "Error deleting payment");
    }
  };

  const handleWhatsAppReminder = (payment) => {
    const mobile = payment.tenantId?.mobile;
    if (!mobile) {
      toast.error("No mobile number for this tenant");
      return;
    }
    const name = payment.tenantId?.name || "Tenant";
    const month = months.find((m) => m.value === payment.month)?.label || "";
    const due = payment.rentAmount - payment.amountPaid;
    const msg = `Hello ${name}, this is a reminder that your rent of Rs.${due} for ${month} ${payment.year} is pending. Please pay at your earliest convenience. Thank you!`;
    window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const filteredPayments = payments
    .filter((payment) => {
      const matchesStatus = filterStatus === "ALL" || payment.status === filterStatus;
      if (!searchQuery) return matchesStatus;
      const query = searchQuery.toLowerCase().trim();
      const tenantName = payment.tenantId?.name?.toLowerCase() || "";
      const tenantMobile = payment.tenantId?.mobile || "";
      const monthLabel = months.find((m) => m.value === payment.month)?.label?.toLowerCase() || "";
      const rentAmount = payment.rentAmount?.toString() || "";
      return (
        matchesStatus &&
        (tenantName.includes(query) ||
          tenantMobile.includes(query) ||
          monthLabel.includes(query) ||
          rentAmount.includes(query))
      );
    })
    .sort((a, b) => b._id.localeCompare(a._id));

  const pendingPayments = payments.filter((p) => p.status === "PENDING" || p.status === "PARTIAL").length;

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDate = today.getDate();

  let rentsDueIn2Days = 0;
  tenants.forEach((tenant) => {
    if (!tenant.joiningDate) return;
    const joinDateObj = new Date(tenant.joiningDate);
    const dueDay = joinDateObj.getDate();
    const reminderDay = dueDay - 2;
    let isWithinDuePeriod = false;
    if (reminderDay > 0) {
      isWithinDuePeriod = currentDate >= reminderDay && currentDate <= dueDay;
    } else {
      const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
      const adjustedReminderDay = daysInPrevMonth + reminderDay;
      isWithinDuePeriod = currentDate >= adjustedReminderDay || currentDate <= dueDay;
    }
    if (isWithinDuePeriod) {
      const currentMonthPayment = payments.find(
        (p) =>
          p.tenantId?._id?.toString() === tenant._id?.toString() &&
          p.month === currentMonth + 1 &&
          p.year === currentYear
      );
      if (!currentMonthPayment || currentMonthPayment.status !== "PAID") {
        rentsDueIn2Days++;
      }
    }
  });

  // Mark-paid modal: tenant's advance info
  const mpTenantAdvance = markPaidModal.payment?.tenantId?.advanceLeft || 0;

  return (
    <div className="space-y-3 sm:space-y-4 max-w-full overflow-hidden">
      {/* Mobile-Optimized Header */}
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Payments</h1>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Revenue Tracker</p>
        </div>
        {canDo('payments', 'add') && (
          <button
            onClick={() => setShowForm(true)}
            className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Compact Stats Grid - 2x2 for Mobile */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-12 h-12 bg-rose-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dues</p>
          <div className="flex items-end justify-between">
            <h3 className="text-xl font-black text-slate-800 leading-none">{pendingPayments}</h3>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-12 h-12 bg-amber-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Due 48h</p>
          <div className="flex items-end justify-between">
            <h3 className="text-xl font-black text-slate-800 leading-none">{rentsDueIn2Days}</h3>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
          </div>
        </div>

        <div className="col-span-2 bg-slate-900 p-3 rounded-2xl shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full -mr-8 -mt-8"></div>
          <div className="relative flex justify-between items-center">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Revenue</p>
              <h3 className="text-xl font-black text-white">₹{payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amountPaid, 0).toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-white/10 rounded-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Search & Filter */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search tenant, month..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold placeholder:text-slate-400 focus:outline-none focus:border-slate-900 shadow-sm"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
          {["ALL", "PENDING", "PARTIAL", "PAID"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                filterStatus === s 
                  ? `bg-slate-900 text-white border-slate-900 shadow-sm` 
                  : `bg-white text-slate-400 border-slate-100 hover:border-slate-200`
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Organized Mobile Payment Cards */}
      <div className="space-y-2">
        {filteredPayments.length > 0 ? (
          filteredPayments.map((payment) => {
            const balance = payment.rentAmount - payment.amountPaid;
            const monthName = months.find((m) => m.value === payment.month)?.label;
            const initials = payment.tenantId?.name?.charAt(0).toUpperCase() || "?";
            
            return (
              <div key={payment._id} className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm active:bg-slate-50 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                      {initials}
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-slate-800 leading-none mb-0.5">{payment.tenantId?.name || "Unknown"}</h4>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{monthName} {payment.year}</p>
                    </div>
                  </div>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border ${
                    payment.status === "PAID" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                    payment.status === "PARTIAL" ? "bg-amber-50 text-amber-600 border-amber-100" : 
                    "bg-rose-50 text-rose-600 border-rose-100"
                  }`}>
                    {payment.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 mb-3 bg-slate-50/50 rounded-xl p-2 border border-slate-50">
                  <div className="text-center border-r border-slate-100">
                    <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Rent</p>
                    <p className="text-[10px] font-black text-slate-800">₹{payment.rentAmount}</p>
                  </div>
                  <div className="text-center border-r border-slate-100">
                    <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Paid</p>
                    <p className="text-[10px] font-black text-emerald-600">₹{payment.amountPaid}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Due</p>
                    <p className="text-[10px] font-black text-rose-600">₹{balance}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleWhatsAppReminder(payment)} 
                      className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </button>
                    {canDo('payments', 'delete') && (
                      <button 
                        onClick={() => handleDelete(payment)} 
                        className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                  {payment.status !== "PAID" && canDo('payments', 'edit') && (
                    <button 
                      onClick={() => handleOpenMarkPaid(payment)} 
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black shadow-lg active:scale-95 transition-all uppercase tracking-widest"
                    >
                      Collect
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-black text-slate-800">No records found</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Adjust filters</p>
          </div>
        )}
      </div>

      {/* Mark Paid Modal - Mobile Optimized */}
      {markPaidModal.open && markPaidModal.payment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-6 overflow-hidden">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 truncate">{markPaidModal.payment.tenantId?.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Record Payment</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due</span>
                <span className="text-sm font-black text-slate-900">₹{markPaidModal.payment.rentAmount - markPaidModal.payment.amountPaid}</span>
              </div>
              {mpTenantAdvance > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Advance</span>
                  <span className="text-xs font-black text-blue-600">₹{mpTenantAdvance}</span>
                </div>
              )}
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Payment Date</label>
                <input
                  type="date"
                  value={markPaidModal.date}
                  onChange={(e) => setMarkPaidModal(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>
              {mpTenantAdvance > 0 && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Use Advance (₹)</label>
                  <input
                    type="number"
                    max={mpTenantAdvance}
                    value={markPaidModal.advanceUsed}
                    onChange={(e) => setMarkPaidModal(prev => ({ ...prev, advanceUsed: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-slate-900"
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMarkPaidModal({ open: false, payment: null, date: new Date().toISOString().split("T")[0], advanceUsed: "" })}
                className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMarkPaid}
                className="py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200 active:scale-95 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Payment Modal - Mobile Optimized */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl max-w-full sm:max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight leading-none">New Payment</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Entry Details</p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tenant</label>
                <select name="tenantId" value={formData.tenantId} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-slate-900 appearance-none">
                  <option value="">Choose Tenant</option>
                  {tenants.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Month</label>
                  <select name="month" value={formData.month} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-800">
                    {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Year</label>
                  <input type="number" name="year" value={formData.year} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-800" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Rent (₹)</label>
                  <input type="number" name="rentAmount" value={formData.rentAmount} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-800" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cash (₹)</label>
                  <input type="number" name="amountPaid" value={formData.amountPaid} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-800" />
                </div>
              </div>

              {formData.advanceAvailable > 0 && (
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <input type="checkbox" id="useAdvance" name="useAdvance" checked={formData.useAdvance} onChange={handleChange} className="w-4 h-4 rounded-lg accent-blue-600" />
                    <label htmlFor="useAdvance" className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Use Advance (₹{formData.advanceAvailable})</label>
                  </div>
                  {formData.useAdvance && (
                    <input type="number" name="advanceUsed" value={formData.advanceUsed} onChange={handleChange} max={formData.advanceAvailable} className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-xs font-black text-blue-800" placeholder="0" />
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-800">
                  <option value="PENDING">Pending</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 active:scale-[0.98] transition-all">
                  Create Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payments;
