import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "../App";
import { useAuth } from "../context/AuthContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Payments() {
  const { user } = useAuth();
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
    <div className="space-y-4 sm:space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mt-2 sm:mt-0">
        <div className="bg-white rounded-xl shadow-lg border border-red-500 p-3 lg:p-4 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 whitespace-nowrap">Pending Payments</p>
              <h3 className="text-xl lg:text-3xl font-black text-gray-800">{pendingPayments}</h3>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-lg lg:text-xl">!</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-orange-500 p-3 lg:p-4 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 whitespace-nowrap">Due in 2 Days</p>
              <h3 className="text-xl lg:text-3xl font-black text-gray-800">{rentsDueIn2Days}</h3>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-lg lg:text-xl">~</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar and Add Button */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
            <div className="relative flex-1 lg:max-w-md">
              <input
                type="text"
                placeholder="Search name, mobile, month, rent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-400 transition-all bg-white shadow-sm"
              />
              <svg className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              {[["ALL","gray"],["PENDING","red"],["PARTIAL","yellow"],["PAID","green"]].map(([s, c]) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all cursor-pointer ${
                    filterStatus === s ? `bg-${c}-600 text-white` : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  } ${filterStatus === s && s === "ALL" ? "bg-gray-700" : ""}`}
                >
                  {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-gray-800 text-white rounded-xl font-semibold text-sm hover:bg-gray-700 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Payment
            </button>
          </div>
        </div>
      </div>

      {/* Mark Paid Modal */}
      {markPaidModal.open && markPaidModal.payment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Record Payment</h3>
                <p className="text-sm text-gray-500">
                  {markPaidModal.payment.tenantId?.name} — {months.find(m => m.value === markPaidModal.payment.month)?.label} {markPaidModal.payment.year}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Rent Due:</span><span className="font-bold">₹{markPaidModal.payment.rentAmount}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Already Paid:</span><span className="font-bold text-green-600">₹{markPaidModal.payment.amountPaid}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Balance:</span><span className="font-bold text-red-600">₹{markPaidModal.payment.rentAmount - markPaidModal.payment.amountPaid}</span></div>
              {mpTenantAdvance > 0 && (
                <div className="flex justify-between mt-1 pt-1 border-t border-gray-200">
                  <span className="text-gray-600">Advance Available:</span>
                  <span className="font-bold text-blue-600">₹{mpTenantAdvance}</span>
                </div>
              )}
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={markPaidModal.date}
                  onChange={(e) => setMarkPaidModal(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 text-gray-800"
                />
              </div>
              {mpTenantAdvance > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Use Advance (Rs.) <span className="text-xs font-normal text-gray-400">— Available: ₹{mpTenantAdvance}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={mpTenantAdvance}
                    value={markPaidModal.advanceUsed}
                    onChange={(e) => setMarkPaidModal(prev => ({ ...prev, advanceUsed: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 text-gray-800"
                  />
                  <p className="text-xs text-gray-400 mt-1">This will be deducted from the tenant's advance balance.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setMarkPaidModal({ open: false, payment: null, date: new Date().toISOString().split("T")[0], advanceUsed: "" })}
                className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMarkPaid}
                className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Payment Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-800 p-3 sm:p-4 text-white flex-shrink-0">
              <div className="flex justify-between items-center gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-xl font-bold truncate">Create Payment Record</h2>
                  <p className="text-gray-400 text-xs sm:text-sm">Enter payment details for the tenant.</p>
                </div>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:bg-gray-700 rounded-full p-1.5 sm:p-2 transition flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
              {/* Tenant & Period */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Tenant & Period</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Select Tenant <span className="text-red-500">*</span></label>
                    <select name="tenantId" value={formData.tenantId} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800">
                      <option value="">Choose Tenant</option>
                      {tenants.map((tenant) => (
                        <option key={tenant._id} value={tenant._id}>
                          {tenant.name} {tenant.roomId ? `- Room ${tenant.roomId.roomNumber || tenant.roomId}` : ""}
                        </option>
                      ))}
                    </select>
                    {formData.tenantId && formData.advanceAvailable > 0 && (
                      <p className="text-xs text-blue-600 mt-1 font-semibold">💰 Advance Balance: ₹{formData.advanceAvailable}</p>
                    )}
                    {formData.tenantId && formData.advanceAvailable === 0 && (
                      <p className="text-xs text-gray-400 mt-1">No advance balance available.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Month <span className="text-red-500">*</span></label>
                    <select name="month" value={formData.month} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800">
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>{month.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Year <span className="text-red-500">*</span></label>
                    <input type="number" name="year" value={formData.year} onChange={handleChange} required min="2020" max="2030" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold" />
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Payment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Rent Amount (Rs.) <span className="text-red-500">*</span></label>
                    <input type="number" name="rentAmount" value={formData.rentAmount} onChange={handleChange} required min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Cash Paid (Rs.)</label>
                    <input type="number" name="amountPaid" value={formData.amountPaid} onChange={handleChange} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold" />
                  </div>

                  {/* Advance Toggle */}
                  {formData.advanceAvailable > 0 && (
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id="useAdvance"
                          name="useAdvance"
                          checked={formData.useAdvance}
                          onChange={handleChange}
                          className="w-4 h-4 accent-blue-600 cursor-pointer"
                        />
                        <label htmlFor="useAdvance" className="text-sm font-semibold text-blue-700 cursor-pointer">
                          Use Advance Balance (Available: ₹{formData.advanceAvailable})
                        </label>
                      </div>
                      {formData.useAdvance && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Advance Amount to Use (Rs.)</label>
                          <input
                            type="number"
                            name="advanceUsed"
                            value={formData.advanceUsed}
                            onChange={handleChange}
                            min="0"
                            max={formData.advanceAvailable}
                            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 font-semibold"
                            placeholder={`Max ₹${formData.advanceAvailable}`}
                          />
                          {formData.useAdvance && formData.advanceUsed && (
                            <p className="text-xs text-blue-600 mt-1">
                              Effective total: ₹{(parseFloat(formData.amountPaid) || 0) + (parseFloat(formData.advanceUsed) || 0)} (cash + advance)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Date</label>
                    <input type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800">
                      <option value="PENDING">Pending</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="PAID">Paid</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>

            <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-100 flex flex-row justify-end items-center gap-2 sm:gap-3 flex-shrink-0">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 sm:px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-semibold transition text-sm sm:text-base">
                Cancel
              </button>
              <button
                type="submit"
                onClick={(e) => { e.preventDefault(); document.querySelector("form").requestSubmit(); }}
                className="px-4 sm:px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 font-semibold transition flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Create Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Mobile Card View */}
        <div className="block lg:hidden">
          {filteredPayments.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredPayments.map((payment) => (
                <div key={payment._id} className="p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:via-indigo-50 hover:to-purple-50 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {payment.tenantId?.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-bold text-gray-900">{payment.tenantId?.name || "N/A"}</div>
                        <div className="text-[10px] text-gray-400">{months.find((m) => m.value === payment.month)?.label} {payment.year}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${payment.status === "PAID" ? "bg-green-100 text-green-700" : payment.status === "PARTIAL" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                      {payment.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <div className="flex gap-3">
                      <span className="text-gray-600">Rent: <span className="font-semibold text-gray-800">₹{payment.rentAmount}</span></span>
                      <span className="text-gray-600">Paid: <span className="font-semibold text-green-600">₹{payment.amountPaid}</span></span>
                      {payment.rentAmount - payment.amountPaid > 0 && (
                        <span className="text-gray-600">Due: <span className="font-semibold text-red-600">₹{payment.rentAmount - payment.amountPaid}</span></span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {payment.status !== "PAID" && (
                        <>
                          <button onClick={() => handleOpenMarkPaid(payment)} className="px-2 py-1 bg-green-600 text-white rounded text-[10px] font-medium hover:bg-green-700 transition cursor-pointer">Mark Paid</button>
                          <button onClick={() => handleWhatsAppReminder(payment)} className="px-2 py-1 bg-green-500 text-white rounded text-[10px] font-medium hover:bg-green-600 transition cursor-pointer" title="WhatsApp Reminder">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">No Payments Found</h3>
              <p className="text-sm text-gray-500 text-center max-w-xs">
                {searchQuery ? "No payments match your search criteria." : "Get started by adding a payment record."}
              </p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">Tenant</th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">Month/Year</th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">Rent</th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">Paid</th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">Balance</th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">Date</th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">Status</th>
                <th className="px-4 py-4 text-center text-sm font-bold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:via-indigo-50 hover:to-purple-50 transition-all duration-300 group">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm">
                          {payment.tenantId?.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{payment.tenantId?.name || "N/A"}</div>
                          {payment.advanceUsed > 0 && (
                            <div className="text-[10px] text-blue-600 font-semibold">🔄 Adv: ₹{payment.advanceUsed}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-semibold text-sm border border-blue-200">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {months.find((m) => m.value === payment.month)?.label} {payment.year}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-700">Rs.{payment.rentAmount}</td>
                    <td className="px-4 py-4 text-sm font-medium text-green-600">Rs.{payment.amountPaid}</td>
                    <td className="px-4 py-4 text-sm font-medium text-red-600">
                      {Math.max(0, payment.rentAmount - payment.amountPaid) > 0
                        ? `Rs.${payment.rentAmount - payment.amountPaid}`
                        : <span className="text-green-600">✓ Cleared</span>}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {payment.paymentDate
                        ? new Date(payment.paymentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
                        : "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${payment.status === "PAID" ? "bg-green-100 text-green-700" : payment.status === "PARTIAL" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {payment.status !== "PAID" && (
                          <>
                            <button onClick={() => handleOpenMarkPaid(payment)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 cursor-pointer" title="Record Payment">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </button>
                            <button onClick={() => handleWhatsAppReminder(payment)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 cursor-pointer" title="WhatsApp Reminder">
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDelete(payment)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer" title="Delete">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-16">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-700 mb-2">No Payments Found</h3>
                      <p className="text-sm text-gray-500 text-center max-w-xs">
                        {searchQuery ? "No payments match your search criteria." : "Get started by adding a payment record."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Payments;
