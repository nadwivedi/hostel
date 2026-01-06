import { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Payments() {
  const [payments, setPayments] = useState([]);
  const [occupancies, setOccupancies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [formData, setFormData] = useState({
    occupancyId: '',
    tenantId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    rentAmount: '',
    amountPaid: '',
    paymentDate: new Date().toISOString().split('T')[0],
    status: 'PENDING',
  });

  useEffect(() => {
    fetchPayments();
    fetchActiveOccupancies();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/payments`);
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchActiveOccupancies = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/occupancies?status=ACTIVE`);
      setOccupancies(response.data);
    } catch (error) {
      console.error('Error fetching occupancies:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === 'occupancyId') {
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

    if (name === 'amountPaid' || name === 'rentAmount') {
      const paid = name === 'amountPaid' ? parseFloat(value) : parseFloat(formData.amountPaid);
      const rent = name === 'rentAmount' ? parseFloat(value) : parseFloat(formData.rentAmount);

      if (paid >= rent) {
        setFormData((prev) => ({ ...prev, status: 'PAID' }));
      } else if (paid > 0) {
        setFormData((prev) => ({ ...prev, status: 'PARTIAL' }));
      } else {
        setFormData((prev) => ({ ...prev, status: 'PENDING' }));
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

      await axios.post(`${BACKEND_URL}/payments`, paymentData);
      alert('Payment record created successfully!');
      setShowForm(false);
      setFormData({
        occupancyId: '',
        tenantId: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        rentAmount: '',
        amountPaid: '',
        paymentDate: new Date().toISOString().split('T')[0],
        status: 'PENDING',
      });
      fetchPayments();
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Error creating payment record');
    }
  };

  const handleUpdatePayment = async (paymentId, amountPaid) => {
    const amount = prompt('Enter payment amount:', amountPaid);
    if (amount === null) return;

    try {
      const payment = payments.find((p) => p._id === paymentId);
      const newAmountPaid = parseFloat(amount);
      let newStatus = 'PENDING';

      if (newAmountPaid >= payment.rentAmount) {
        newStatus = 'PAID';
      } else if (newAmountPaid > 0) {
        newStatus = 'PARTIAL';
      }

      await axios.patch(`${BACKEND_URL}/payments/${paymentId}`, {
        amountPaid: newAmountPaid,
        paymentDate: new Date(),
        status: newStatus,
      });
      alert('Payment updated successfully!');
      fetchPayments();
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Error updating payment');
    }
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

  const filteredPayments = payments.filter((payment) => {
    if (filterStatus === 'ALL') return true;
    return payment.status === filterStatus;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Payment Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          {showForm ? 'Cancel' : 'Add Payment Record'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create Payment Record</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Tenant <span className="text-red-500">*</span>
                </label>
                <select
                  name="occupancyId"
                  value={formData.occupancyId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month <span className="text-red-500">*</span>
                </label>
                <select
                  name="month"
                  value={formData.month}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rent Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="rentAmount"
                  value={formData.rentAmount}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Paid (₹)
                </label>
                <input
                  type="number"
                  name="amountPaid"
                  value={formData.amountPaid}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="PENDING">Pending</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
              >
                Create Payment Record
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilterStatus('ALL')}
          className={`px-4 py-2 rounded-lg ${
            filterStatus === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          } cursor-pointer`}
        >
          All
        </button>
        <button
          onClick={() => setFilterStatus('PENDING')}
          className={`px-4 py-2 rounded-lg ${
            filterStatus === 'PENDING' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
          } cursor-pointer`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilterStatus('PARTIAL')}
          className={`px-4 py-2 rounded-lg ${
            filterStatus === 'PARTIAL' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'
          } cursor-pointer`}
        >
          Partial
        </button>
        <button
          onClick={() => setFilterStatus('PAID')}
          className={`px-4 py-2 rounded-lg ${
            filterStatus === 'PAID' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
          } cursor-pointer`}
        >
          Paid
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                  {payment.tenantId?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {months.find((m) => m.value === payment.month)?.label} {payment.year}
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
                    ? new Date(payment.paymentDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      payment.status === 'PAID'
                        ? 'bg-green-100 text-green-800'
                        : payment.status === 'PARTIAL'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {payment.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {payment.status !== 'PAID' && (
                    <button
                      onClick={() => handleUpdatePayment(payment._id, payment.amountPaid)}
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
