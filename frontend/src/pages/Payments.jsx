import { useState, useEffect } from "react";
import axios from "axios";
import StatCard from "../components/Stats";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Payments() {
  const [payments, setPayments] = useState([]);
  const [occupancies, setOccupancies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
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
        },
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
      alert("Payment record created successfully!");
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
      alert("Error creating payment record");
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
          amountPaid: newAmountPaid,
          paymentDate: new Date(),
          status: newStatus,
        },
        {
          withCredentials: true,
        },
      );
      alert("Payment updated successfully!");
      fetchPayments();
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("Error updating payment");
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

  const filteredPayments = payments.filter((payment) => {
    if (filterStatus === "ALL") return true;
    return payment.status === filterStatus;
  });

  // Calculate stats
  const pendingPayments = payments.filter(
    (p) => p.status === "PENDING" || p.status === "PARTIAL",
  ).length;

  // Calculate rents due in next 2 days
  const today = new Date();
  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(today.getDate() + 2);

  // Assuming rent is due on 5th of every month
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDate = today.getDate();

  // Check if we're within 2 days of the 5th
  const dueDate = 5;
  let rentsDueIn2Days = 0;

  if (currentDate <= dueDate && currentDate + 2 >= dueDate) {
    // Count active occupancies that don't have payment for current month
    const currentMonthPayments = payments.filter(
      (p) => p.month === currentMonth + 1 && p.year === currentYear,
    );
    const paidTenantIds = currentMonthPayments.map((p) => p.tenantId?._id);
    rentsDueIn2Days = occupancies.filter(
      (occ) => !paidTenantIds.includes(occ.tenantId?._id),
    ).length;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Pending Payments"
          value={pendingPayments}
          icon="⚠️"
          gradient="bg-gradient-to-br from-red-500 to-red-600"
          bgLight="bg-red-100"
        />
        <StatCard
          title="Due in Next 2 Days"
          value={rentsDueIn2Days}
          icon="📅"
          gradient="bg-gradient-to-br from-orange-500 to-orange-600"
          bgLight="bg-orange-100"
        />
        <div className="sm:col-span-2 lg:col-span-1 flex items-center justify-center sm:justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium cursor-pointer text-sm sm:text-base"
          >
            ➕ Add Payment Record
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-800 p-4 text-white flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Create Payment Record</h2>
                  <p className="text-gray-400 text-sm">
                    Enter payment details for the tenant.
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:bg-gray-700 rounded-full p-2 transition"
                >
                  <svg
                    className="w-6 h-6"
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

            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
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

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
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

            <div className="border-t border-gray-200 p-4 bg-gray-100 flex justify-end items-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-semibold transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector("form").requestSubmit();
                }}
                className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 font-semibold transition flex items-center gap-2"
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Create Payment
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterStatus("ALL")}
          className={`px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap text-sm sm:text-base ${
            filterStatus === "ALL"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          } cursor-pointer`}
        >
          All
        </button>
        <button
          onClick={() => setFilterStatus("PENDING")}
          className={`px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap text-sm sm:text-base ${
            filterStatus === "PENDING"
              ? "bg-red-600 text-white"
              : "bg-gray-200 text-gray-700"
          } cursor-pointer`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilterStatus("PARTIAL")}
          className={`px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap text-sm sm:text-base ${
            filterStatus === "PARTIAL"
              ? "bg-yellow-600 text-white"
              : "bg-gray-200 text-gray-700"
          } cursor-pointer`}
        >
          Partial
        </button>
        <button
          onClick={() => setFilterStatus("PAID")}
          className={`px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap text-sm sm:text-base ${
            filterStatus === "PAID"
              ? "bg-green-600 text-white"
              : "bg-gray-200 text-gray-700"
          } cursor-pointer`}
        >
          Paid
        </button>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-4">
        {filteredPayments.map((payment) => (
          <div
            key={payment._id}
            className="bg-white rounded-lg shadow-md p-4 border border-gray-200"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-gray-900">
                  {payment.tenantId?.name || "N/A"}
                </h3>
                <p className="text-sm text-gray-600">
                  {months.find((m) => m.value === payment.month)?.label}{" "}
                  {payment.year}
                </p>
              </div>
              <span
                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  payment.status === "PAID"
                    ? "bg-green-100 text-green-800"
                    : payment.status === "PARTIAL"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {payment.status}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Rent:</span>
                <span className="font-semibold">₹{payment.rentAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Paid:</span>
                <span className="font-semibold text-green-600">
                  ₹{payment.amountPaid}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Balance:</span>
                <span className="font-semibold text-red-600">
                  ₹{payment.rentAmount - payment.amountPaid}
                </span>
              </div>
              {payment.paymentDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold">
                    {new Date(payment.paymentDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
            {payment.status !== "PAID" && (
              <button
                onClick={() =>
                  handleUpdatePayment(payment._id, payment.amountPaid)
                }
                className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm"
              >
                Record Payment
              </button>
            )}
          </div>
        ))}
        {filteredPayments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No payments found.
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Month/Year
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rent Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount Paid
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPayments.map((payment) => (
              <tr key={payment._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {payment.tenantId?.name || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {months.find((m) => m.value === payment.month)?.label}{" "}
                  {payment.year}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₹{payment.rentAmount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₹{payment.amountPaid}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₹{payment.rentAmount - payment.amountPaid}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {payment.paymentDate
                    ? new Date(payment.paymentDate).toLocaleDateString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        },
                      )
                    : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      payment.status === "PAID"
                        ? "bg-green-100 text-green-800"
                        : payment.status === "PARTIAL"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {payment.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {payment.status !== "PAID" && (
                    <button
                      onClick={() =>
                        handleUpdatePayment(payment._id, payment.amountPaid)
                      }
                      className="text-blue-600 hover:text-blue-900 cursor-pointer"
                    >
                      Record Payment
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPayments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No payments found.
          </div>
        )}
      </div>
    </div>
  );
}

export default Payments;
