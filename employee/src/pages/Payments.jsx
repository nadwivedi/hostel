import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';

const API_URL = import.meta.env.VITE_BACKEND_URL;

function Payments() {
  const { hasPermission, assignedProperties } = useEmployeeAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  useEffect(() => {
    fetchPayments();
  }, [selectedProperty, statusFilter, selectedMonth, selectedYear]);

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedProperty) params.append('propertyId', selectedProperty);
      if (statusFilter) params.append('status', statusFilter);
      if (selectedMonth) params.append('month', selectedMonth);
      if (selectedYear) params.append('year', selectedYear);

      const response = await axios.get(`${API_URL}/api/payments?${params.toString()}`, {
        withCredentials: true,
      });
      setPayments(response.data);
    } catch (error) {
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (paymentId) => {
    if (!hasPermission('payments', 'edit')) {
      toast.error('You do not have permission to mark payments as paid');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/payments/${paymentId}/mark-paid`, {}, {
        withCredentials: true,
      });
      toast.success('Payment marked as paid');
      fetchPayments();
    } catch (error) {
      toast.error('Failed to update payment');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PARTIAL': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">View and manage payment records</p>
        </div>
        {hasPermission('payments', 'add') && (
          <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
            + Add Payment
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Properties</option>
          {assignedProperties.map((prop) => (
            <option key={prop._id} value={prop._id}>{prop.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Payments List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">💰</div>
            <p>No payments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tenant</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Period</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rent</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Paid</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Due Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  {hasPermission('payments', 'edit') && (
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {payment.tenantId?.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.tenantId?.mobile}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {months.find(m => m.value === payment.month)?.label} {payment.year}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      Rs. {payment.rentAmount}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      Rs. {payment.amountPaid || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(payment.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    {hasPermission('payments', 'edit') && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {payment.status !== 'PAID' && (
                            <button
                              onClick={() => handleMarkAsPaid(payment._id)}
                              className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            >
                              Mark Paid
                            </button>
                          )}
                          <button className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Payments;
