import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from '../App';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Dashboard() {
  const navigate = useNavigate();
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPending: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const config = { withCredentials: true };

      const [paymentsRes, tenantsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/payments`, config),
        axios.get(`${BACKEND_URL}/api/tenants`, config),
      ]);

      // Filter pending payments and enrich with tenant data
      const pending = paymentsRes.data
        .filter(p => p.status === 'PENDING' || p.status === 'PARTIAL')
        .map(payment => {
          const tenant = tenantsRes.data.find(t => t._id === payment.tenantId?._id || t._id === payment.tenantId);
          return {
            ...payment,
            tenant: tenant || payment.tenantId,
          };
        })
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

      setPendingPayments(pending);

      // Calculate stats
      const totalAmount = pending.reduce((acc, p) => acc + (p.rentAmount - (p.amountPaid || 0)), 0);

      setStats({
        totalPending: pending.length,
        totalAmount,
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Error loading payments');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (paymentId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/payments/${paymentId}/mark-paid`, {
        paymentDate: new Date(),
      }, { withCredentials: true });
      toast.success('Payment marked as paid');
      fetchPendingPayments();
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      toast.error('Error updating payment');
    }
  };

  const handleWhatsAppReminder = async (payment) => {
    const tenant = payment.tenant;
    const amount = payment.rentAmount - (payment.amountPaid || 0);
    const monthYear = new Date(payment.year, payment.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Track the reminder
    try {
      await axios.post(`${BACKEND_URL}/api/payments/${payment._id}/track-reminder`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Error tracking reminder:', error);
    }

    // Get property name from tenant.propertyId or tenant.roomId.propertyId
    const propertyName = tenant?.propertyId?.name || tenant?.roomId?.propertyId?.name || 'Our Property';

    const message = `Hello ${tenant?.name || 'Tenant'},

This is a friendly reminder that your rent payment of *₹${amount.toLocaleString()}* for *${monthYear}* is pending.

Property: ${propertyName}
Room: ${tenant?.roomId?.roomNumber ? `Room ${tenant.roomId.roomNumber}` : 'N/A'}${tenant?.bedNumber ? ` - Bed ${tenant.bedNumber}` : ''}

Please make the payment at your earliest convenience.

Thank you!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/91${tenant?.mobile}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');

    // Refresh to show updated reminder count
    fetchPendingPayments();
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB');
  };

  const getPaymentStatus = (payment) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(payment.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `${Math.abs(diffDays)}d overdue`, color: 'bg-red-100 text-red-700' };
    } else if (diffDays === 0) {
      return { label: 'Due today', color: 'bg-orange-100 text-orange-700' };
    } else if (diffDays <= 3) {
      return { label: `Due in ${diffDays}d`, color: 'bg-yellow-100 text-yellow-700' };
    } else {
      return { label: `Due in ${diffDays}d`, color: 'bg-blue-100 text-blue-700' };
    }
  };

  // Group payments by property
  const groupedByProperty = pendingPayments.reduce((acc, payment) => {
    // Get property info from tenant.propertyId or tenant.roomId.propertyId
    const tenant = payment.tenant;
    const propertyInfo = tenant?.propertyId || tenant?.roomId?.propertyId;
    const propertyName = propertyInfo?.name || 'Unknown Property';
    const propertyId = propertyInfo?._id || 'unknown';
    if (!acc[propertyId]) {
      acc[propertyId] = {
        name: propertyName,
        payments: [],
        totalPending: 0,
      };
    }
    acc[propertyId].payments.push(payment);
    acc[propertyId].totalPending += payment.rentAmount - (payment.amountPaid || 0);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-1 py-1.5 sm:p-4">
      <div className="w-full sm:max-w-7xl mx-auto space-y-1.5 sm:space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-1 sm:gap-4">
          <div className="bg-white rounded-md sm:rounded-2xl shadow-sm border-2 border-blue-500 p-1.5 sm:p-5">
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

          <div className="bg-white rounded-md sm:rounded-2xl shadow-sm border-2 border-red-500 p-1.5 sm:p-5">
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

        {/* Pending Payments - Grouped by Property */}
        {Object.keys(groupedByProperty).length > 0 ? (
          <div className="space-y-2 sm:space-y-5">
            {Object.entries(groupedByProperty).map(([propertyId, propertyData]) => (
              <div key={propertyId} className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

                {/* Property Header with Room Details */}
                <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 p-2 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-7 h-7 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center border border-white/30 shadow-md">
                        <span className="text-sm sm:text-xl">🏠</span>
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-xl font-black text-white drop-shadow-lg">
                          {propertyData.name}
                        </h2>
                        <div className="text-[9px] sm:text-xs text-white/80 font-semibold mt-0.5">
                          {(() => {
                            const roomBedList = propertyData.payments.map(p => {
                              const room = p.tenant?.roomId?.roomNumber;
                              const bed = p.tenant?.bedNumber;
                              return room ? `Room ${room}${bed ? ` - Bed ${bed}` : ''}` : null;
                            }).filter(Boolean);
                            const unique = [...new Set(roomBedList)];
                            return unique.slice(0, 2).join(', ') + (unique.length > 2 ? ` +${unique.length - 2} more` : '');
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="bg-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-xl text-center">
                      <div className="text-xs sm:text-base font-black text-red-600">
                        ₹{propertyData.totalPending.toLocaleString()}
                      </div>
                      <div className="text-[8px] sm:text-xs text-red-500 font-medium">
                        Due: {formatDate(propertyData.payments[0]?.dueDate)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payments List */}
                <div className="p-1.5 sm:p-4 bg-gradient-to-br from-gray-50 to-white">
                  <div className="space-y-1.5 sm:space-y-3">
                    {propertyData.payments.map((payment) => {
                      const tenant = payment.tenant;
                      const amount = payment.rentAmount - (payment.amountPaid || 0);
                      const monthYear = new Date(payment.year, payment.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                      const status = getPaymentStatus(payment);

                      return (
                        <div
                          key={payment._id}
                          className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-2 sm:p-4 hover:shadow-md transition-all cursor-pointer"
                          onClick={() => navigate(`/tenant/${tenant?._id}`)}
                        >
                          {/* Tenant Header with Pending Status */}
                          <div className="flex items-center justify-between mb-1.5 sm:mb-3">
                            <div className="flex items-center gap-2 sm:gap-3">
                              {tenant?.photo ? (
                                <img
                                  src={`${BACKEND_URL}${tenant.photo}`}
                                  alt={tenant?.name}
                                  className="h-9 w-9 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl object-cover shadow-sm"
                                />
                              ) : (
                                <div className="h-9 w-9 sm:h-12 sm:w-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-black text-base sm:text-xl shadow-sm">
                                  {tenant?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs sm:text-base font-black text-gray-900">{tenant?.name || 'Unknown'}</span>
                                  <span className={`px-1 py-0.5 rounded text-[8px] sm:text-[10px] font-bold ${status.color}`}>
                                    {status.label}
                                  </span>
                                </div>
                                <div className="text-[10px] sm:text-sm text-gray-600 flex items-center font-semibold">
                                  <svg className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  {tenant?.mobile}
                                </div>
                              </div>
                            </div>
                            {/* Pending Badge */}
                            <div className="px-2 py-1 sm:px-3 sm:py-1.5 bg-red-100 rounded-md sm:rounded-xl text-center">
                              <div className="text-[7px] sm:text-xs text-red-600 font-bold uppercase">Pending</div>
                              <div className="text-sm sm:text-lg font-black text-red-700">{monthYear}</div>
                            </div>
                          </div>

                          {/* Payment Info */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 sm:gap-2">
                              {payment.reminderCount > 0 && (
                                <span className="text-[8px] sm:text-[10px] text-gray-400">
                                  {payment.reminderCount} reminder{payment.reminderCount > 1 ? 's' : ''} sent
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-3">
                              <div className="text-right">
                                <div className="text-xs sm:text-lg font-black text-red-700">₹{amount.toLocaleString()}</div>
                                <div className="text-[8px] sm:text-xs text-gray-500">Due: {formatDate(payment.dueDate)}</div>
                              </div>
                              <div className="flex items-center gap-0.5 sm:gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleMarkAsPaid(payment._id)}
                                  className="p-1 sm:p-2 bg-green-600 text-white rounded sm:rounded-lg hover:bg-green-700 transition"
                                  title="Mark as Paid"
                                >
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleWhatsAppReminder(payment)}
                                  className="p-1 sm:p-2 bg-green-500 text-white rounded sm:rounded-lg hover:bg-green-600 transition"
                                  title="Send WhatsApp Reminder"
                                >
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                  </svg>
                                </button>
                                <a
                                  href={`tel:${tenant?.mobile}`}
                                  className="p-1 sm:p-2 bg-blue-500 text-white rounded sm:rounded-lg hover:bg-blue-600 transition"
                                  title="Call Tenant"
                                >
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
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
    </div>
  );
}

export default Dashboard;
