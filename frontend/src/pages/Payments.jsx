import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "../App";
import { useAuth } from "../context/AuthContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [occupancies, setOccupancies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    occupancyId: "",
    tenantId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    rentAmount: "",
    amountPaid: "",
    paymentDate: new Date().toISOString().split("T")[0],
    status: "PENDING",
  });

  useEffect(() => {
    fetchPayments();
    fetchActiveOccupancies();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/payments`, {
        withCredentials: true,
      });
      setPayments(response.data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const fetchActiveOccupancies = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/occupancies?status=ACTIVE`,
        {
          withCredentials: true,
        }
      );
      setOccupancies(response.data);
    } catch (error) {
      console.error("Error fetching occupancies:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === "occupancyId") {
      const occupancy = occupancies.find((occ) => occ._id === value);
      if (occupancy) {
        setFormData({
          ...formData,
          occupancyId: value,
          tenantId: occupancy.tenantId._id,
          rentAmount: occupancy.rentAmount,
        });
      }
    }

    if (name === "amountPaid" || name === "rentAmount") {
      const paid =
        name === "amountPaid"
          ? parseFloat(value)
          : parseFloat(formData.amountPaid);
      const rent =
        name === "rentAmount"
          ? parseFloat(value)
          : parseFloat(formData.rentAmount);

      if (paid >= rent) {
        setFormData((prev) => ({ ...prev, status: "PAID" }));
      } else if (paid > 0) {
        setFormData((prev) => ({ ...prev, status: "PARTIAL" }));
      } else {
        setFormData((prev) => ({ ...prev, status: "PENDING" }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const paymentData = {
        userId: user?._id,
        occupancyId: formData.occupancyId,
        tenantId: formData.tenantId,
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        rentAmount: parseFloat(formData.rentAmount),
        amountPaid: parseFloat(formData.amountPaid) || 0,
        paymentDate: formData.amountPaid > 0 ? formData.paymentDate : null,
        status: formData.status,
      };

      await axios.post(`${BACKEND_URL}/api/payments`, paymentData, {
        withCredentials: true,
      });
      toast.success("Payment record created successfully!");
      setShowForm(false);
      setFormData({
        occupancyId: "",
        tenantId: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        rentAmount: "",
        amountPaid: "",
        paymentDate: new Date().toISOString().split("T")[0],
        status: "PENDING",
      });
      fetchPayments();
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error(
        error.response?.data?.message || "Error creating payment record"
      );
    }
  };

  const handleUpdatePayment = async (paymentId, amountPaid) => {
    const amount = prompt("Enter payment amount:", amountPaid);
    if (amount === null) return;

    try {
      const payment = payments.find((p) => p._id === paymentId);
      const newAmountPaid = parseFloat(amount);
      let newStatus = "PENDING";

      if (newAmountPaid >= payment.rentAmount) {
        newStatus = "PAID";
      } else if (newAmountPaid > 0) {
        newStatus = "PARTIAL";
      }

      await axios.patch(
        `${BACKEND_URL}/api/payments/${paymentId}`,
        {
          userId: user?._id,
          amountPaid: newAmountPaid,
          paymentDate: new Date(),
          status: newStatus,
        },
        {
          withCredentials: true,
        }
      );
      toast.success("Payment updated successfully!");
      fetchPayments();
    } catch (error) {
      console.error("Error updating payment:", error);
      toast.error(error.response?.data?.message || "Error updating payment");
    }
  };

  const handleDelete = async (payment) => {
    if (
      !window.confirm(`Are you sure you want to delete this payment record?`)
    )
      return;

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

  // Filter payments based on status and search query
  const filteredPayments = payments.filter((payment) => {
    const matchesStatus =
      filterStatus === "ALL" || payment.status === filterStatus;

    if (!searchQuery) return matchesStatus;

    const query = searchQuery.toLowerCase();
    const tenantName = payment.tenantId?.name?.toLowerCase() || "";
    const monthLabel =
      months.find((m) => m.value === payment.month)?.label?.toLowerCase() || "";

    return (
      matchesStatus &&
      (tenantName.includes(query) || monthLabel.includes(query))
    );
  });

  // Calculate stats
  const pendingPayments = payments.filter(
    (p) => p.status === "PENDING" || p.status === "PARTIAL"
  ).length;

  // Calculate rents due in next 2 days based on each tenant's join date
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDate = today.getDate();

  let rentsDueIn2Days = 0;

  occupancies.forEach((occ) => {
    if (!occ.joinDate) return;

    const joinDateObj = new Date(occ.joinDate);
    const dueDay = joinDateObj.getDate();
    const reminderDay = dueDay - 2;

    let isWithinDuePeriod = false;

    if (reminderDay > 0) {
      isWithinDuePeriod = currentDate >= reminderDay && currentDate <= dueDay;
    } else {
      const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
      const adjustedReminderDay = daysInPrevMonth + reminderDay;
      isWithinDuePeriod =
        currentDate >= adjustedReminderDay || currentDate <= dueDay;
    }

    if (isWithinDuePeriod) {
      const currentMonthPayment = payments.find(
        (p) =>
          (p.occupancyId?._id?.toString() === occ._id?.toString() ||
            p.occupancyId?.toString() === occ._id?.toString()) &&
          p.month === currentMonth + 1 &&
          p.year === currentYear
      );

      if (!currentMonthPayment || currentMonthPayment.status !== "PAID") {
        rentsDueIn2Days++;
      }
    }
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mt-2 sm:mt-0">
        <div className="bg-white rounded-xl shadow-lg border border-red-500 p-3 lg:p-4 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 lg:mb-1 whitespace-nowrap">
                Pending Payments
              </p>
              <h3 className="text-xl lg:text-3xl font-black text-gray-800">
                {pendingPayments}
              </h3>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-lg lg:text-xl">⚠️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-orange-500 p-3 lg:p-4 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 lg:mb-1 whitespace-nowrap">
                Due in 2 Days
              </p>
              <h3 className="text-xl lg:text-3xl font-black text-gray-800">
                {rentsDueIn2Days}
              </h3>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-lg lg:text-xl">📅</span>
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
                placeholder="Search by tenant name or month..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-400 transition-all bg-white shadow-sm"
              />
              <svg
                className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              <button
                onClick={() => setFilterStatus("ALL")}
                className={`px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all cursor-pointer ${
                  filterStatus === "ALL"
                    ? "bg-gray-700 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus("PENDING")}
                className={`px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all cursor-pointer ${
                  filterStatus === "PENDING"
                    ? "bg-red-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilterStatus("PARTIAL")}
                className={`px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all cursor-pointer ${
                  filterStatus === "PARTIAL"
                    ? "bg-yellow-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Partial
              </button>
              <button
                onClick={() => setFilterStatus("PAID")}
                className={`px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all cursor-pointer ${
                  filterStatus === "PAID"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Paid
              </button>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="px-4 lg:px-6 py-3 bg-gray-700 text-white rounded-xl hover:shadow-xl font-bold text-sm transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="hidden lg:inline">Add Payment</span>
              <span className="lg:hidden">Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 p-3 sm:p-4 text-white flex-shrink-0">
              <div className="flex justify-between items-center gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-xl font-bold truncate">
                    Create Payment Record
                  </h2>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    Enter payment details for the tenant.
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:bg-gray-700 rounded-full p-1.5 sm:p-2 transition flex-shrink-0"
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form Content */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6"
            >
              {/* Section 1: Tenant & Period */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
                  Tenant & Period
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Select Tenant <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="occupancyId"
                      value={formData.occupancyId}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                    >
                      <option value="">Choose Tenant</option>
                      {occupancies.map((occ) => (
                        <option key={occ._id} value={occ._id}>
                          {occ.tenantId?.name} - Room {occ.roomId?.roomNumber}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Month <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="month"
                      value={formData.month}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                    >
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Year <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      required
                      min="2020"
                      max="2030"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Payment Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
                  Payment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Rent Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="rentAmount"
                      value={formData.rentAmount}
                      onChange={handleChange}
                      required
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Amount Paid (₹)
                    </label>
                    <input
                      type="number"
                      name="amountPaid"
                      value={formData.amountPaid}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      name="paymentDate"
                      value={formData.paymentDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="PAID">Paid</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-100 flex flex-row justify-end items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 sm:px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-semibold transition text-sm sm:text-base"
              >
                Cancel
              </button>

              <button
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector("form").requestSubmit();
                }}
                className="px-4 sm:px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 font-semibold transition flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
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
                <div
                  key={payment._id}
                  className="p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:via-indigo-50 hover:to-purple-50 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm">
                        {payment.tenantId?.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-bold text-gray-900">
                          {payment.tenantId?.name || "N/A"}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center mt-0.5">
                          <svg
                            className="w-3 h-3 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {months.find((m) => m.value === payment.month)?.label}{" "}
                          {payment.year}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : payment.status === "PARTIAL"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-gray-500">Rent</div>
                      <div className="font-bold text-gray-800">
                        ₹{payment.rentAmount}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <div className="text-gray-500">Paid</div>
                      <div className="font-bold text-green-600">
                        ₹{payment.amountPaid}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded-lg">
                      <div className="text-gray-500">Balance</div>
                      <div className="font-bold text-red-600">
                        ₹{payment.rentAmount - payment.amountPaid}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    {payment.status !== "PAID" && (
                      <button
                        onClick={() =>
                          handleUpdatePayment(payment._id, payment.amountPaid)
                        }
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition cursor-pointer"
                      >
                        Record Payment
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(payment)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">
                No Payments Found
              </h3>
              <p className="text-sm text-gray-500 text-center max-w-xs">
                {searchQuery
                  ? "No payments match your search criteria."
                  : "Get started by adding a payment record."}
              </p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Month/Year
                </th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Rent
                </th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-4 text-center text-sm font-bold text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr
                    key={payment._id}
                    className="hover:bg-gradient-to-r hover:from-blue-50 hover:via-indigo-50 hover:to-purple-50 transition-all duration-300 group"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm">
                          {payment.tenantId?.name?.charAt(0).toUpperCase() ||
                            "?"}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">
                            {payment.tenantId?.name || "N/A"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-semibold text-sm border border-blue-200">
                        <svg
                          className="w-4 h-4 mr-1.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {months.find((m) => m.value === payment.month)?.label}{" "}
                        {payment.year}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-700">
                      ₹{payment.rentAmount}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-green-600">
                      ₹{payment.amountPaid}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-red-600">
                      ₹{payment.rentAmount - payment.amountPaid}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {payment.paymentDate
                        ? new Date(payment.paymentDate).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )
                        : "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          payment.status === "PAID"
                            ? "bg-green-100 text-green-700"
                            : payment.status === "PARTIAL"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {payment.status !== "PAID" && (
                          <button
                            onClick={() =>
                              handleUpdatePayment(
                                payment._id,
                                payment.amountPaid
                              )
                            }
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 cursor-pointer"
                            title="Record Payment"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(payment)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer"
                          title="Delete"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
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
                        <svg
                          className="w-10 h-10 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-700 mb-2">
                        No Payments Found
                      </h3>
                      <p className="text-sm text-gray-500 text-center max-w-xs">
                        {searchQuery
                          ? "No payments match your search criteria."
                          : "Get started by adding a payment record."}
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
