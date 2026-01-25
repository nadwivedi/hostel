import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from '../App';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function OccupancyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [occupancy, setOccupancy] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOccupancyDetails();
    fetchPayments();
  }, [id]);

  const fetchOccupancyDetails = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/occupancies/${id}`, {
        withCredentials: true,
      });
      setOccupancy(response.data);
    } catch (error) {
      console.error('Error fetching occupancy details:', error);
      toast.error('Error loading occupancy details');
      navigate('/occupancy');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/payments/occupancy/${id}`, {
        withCredentials: true,
      });
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const calculateTotalPaid = () => {
    return payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
  };

  const calculateTotalDue = () => {
    return payments.reduce((sum, payment) => sum + payment.rentAmount, 0);
  };

  const calculatePendingAmount = () => {
    return calculateTotalDue() - calculateTotalPaid();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  if (!occupancy) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Occupancy Not Found</h2>
          <button
            onClick={() => navigate('/occupancy')}
            className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Occupancy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/occupancy')}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Occupancy Details</h1>
      </div>

      {/* Occupancy Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow-lg border border-blue-500 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Status</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                occupancy.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {occupancy.status}
              </span>
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-base">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-green-500 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Monthly Rent</p>
              <h3 className="text-lg font-black text-gray-800">₹{occupancy.rentAmount}</h3>
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-base">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-purple-500 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Advance Paid</p>
              <h3 className="text-lg font-black text-gray-800">₹{occupancy.advanceAmount}</h3>
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-base">💳</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-orange-500 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Advance Left</p>
              <h3 className="text-lg font-black text-gray-800">₹{occupancy.advanceLeft || 0}</h3>
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <span className="text-base">💵</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant Information */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-lg">👤</span>
          Tenant Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md text-lg">
              {occupancy.tenantId?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold">Name</p>
              <p className="text-sm font-bold text-gray-800">{occupancy.tenantId?.name || 'N/A'}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold">Mobile Number</p>
            <p className="text-sm font-bold text-gray-800">{occupancy.tenantId?.mobile || 'N/A'}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold">Email</p>
            <p className="text-sm font-bold text-gray-800">{occupancy.tenantId?.email || 'N/A'}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold">Aadhar Number</p>
            <p className="text-sm font-bold text-gray-800">{occupancy.tenantId?.aadhar || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Room Information */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-lg">🏠</span>
          Room Information
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-gray-500 font-semibold">Room Number</p>
            <p className="text-sm font-bold text-gray-800">Room {occupancy.roomId?.roomNumber || 'N/A'}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold">Room Type</p>
            <p className="text-sm font-bold text-gray-800">{occupancy.roomId?.roomType || 'N/A'}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold">Bed Number</p>
            <p className="text-sm font-bold text-gray-800">{occupancy.bedNumber ? `Bed ${occupancy.bedNumber}` : 'Full Room'}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold">Join Date</p>
            <p className="text-sm font-bold text-gray-800">
              {new Date(occupancy.joinDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>

          {occupancy.leaveDate && (
            <div>
              <p className="text-xs text-gray-500 font-semibold">Leave Date</p>
              <p className="text-sm font-bold text-gray-800">
                {new Date(occupancy.leaveDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-lg">📊</span>
          Payment Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-700 font-semibold">Total Rent Due</p>
            <p className="text-lg font-black text-blue-900">₹{calculateTotalDue()}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
            <p className="text-xs text-green-700 font-semibold">Total Paid</p>
            <p className="text-lg font-black text-green-900">₹{calculateTotalPaid()}</p>
          </div>

          <div className={`bg-gradient-to-br rounded-lg p-3 border ${
            calculatePendingAmount() > 0
              ? 'from-red-50 to-red-100 border-red-200'
              : 'from-gray-50 to-gray-100 border-gray-200'
          }`}>
            <p className={`text-xs font-semibold ${calculatePendingAmount() > 0 ? 'text-red-700' : 'text-gray-700'}`}>
              Pending Amount
            </p>
            <p className={`text-lg font-black ${calculatePendingAmount() > 0 ? 'text-red-900' : 'text-gray-900'}`}>
              ₹{calculatePendingAmount()}
            </p>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <span className="text-lg">💳</span>
            Payment History
          </h2>
        </div>

        {/* Mobile Card View */}
        <div className="block lg:hidden">
          {payments.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {payments.map((payment) => (
                <div key={payment._id} className="p-3 hover:bg-gray-50 transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        {getMonthName(payment.month)} {payment.year}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Due: {new Date(payment.dueDate).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      payment.status === 'PAID'
                        ? 'bg-green-100 text-green-700'
                        : payment.status === 'PARTIAL'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="text-gray-600">Rent: ₹{payment.rentAmount}</p>
                      <p className="text-gray-600">Paid: ₹{payment.amountPaid}</p>
                    </div>
                    {payment.paymentDate && (
                      <p className="text-[10px] text-green-600">
                        Paid on: {new Date(payment.paymentDate).toLocaleDateString('en-GB')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-700 mb-1">No Payments Found</h3>
              <p className="text-xs text-gray-500 text-center max-w-xs">
                No payment records available for this occupancy.
              </p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Month/Year
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Rent Amount
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Amount Paid
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Payment Date
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.length > 0 ? (
                payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50 transition-all duration-300">
                    <td className="px-3 py-2 text-xs font-bold text-gray-900">
                      {getMonthName(payment.month)} {payment.year}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      ₹{payment.rentAmount}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700 font-semibold">
                      ₹{payment.amountPaid}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {new Date(payment.dueDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {payment.paymentDate
                        ? new Date(payment.paymentDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        payment.status === 'PAID'
                          ? 'bg-green-100 text-green-700'
                          : payment.status === 'PARTIAL'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <h3 className="text-base font-bold text-gray-700 mb-1">No Payments Found</h3>
                      <p className="text-xs text-gray-500 text-center max-w-xs">
                        No payment records available for this occupancy.
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

export default OccupancyDetail;
