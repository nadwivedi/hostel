import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from '../App';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function TenantDetail() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [tenant, setTenant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const backPath = location.state?.from || '/tenants';

  useEffect(() => {
    const fetchTenantData = async () => {
      try {
        setLoading(true);
        const config = { withCredentials: true };
        const [tenantRes, paymentsRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/tenants/${tenantId}`, config),
          axios.get(`${BACKEND_URL}/api/payments/tenant/${tenantId}`, config),
        ]);
        setTenant(tenantRes.data);
        setPayments(paymentsRes.data);
      } catch (error) {
        console.error('Error loading tenant details:', error);
        toast.error('Error loading tenant details');
      } finally {
        setLoading(false);
      }
    };

    fetchTenantData();
  }, [tenantId]);

  const { pendingAmount, paidCount } = useMemo(() => {
    const pending = payments
      .filter((payment) => payment.status !== 'PAID')
      .reduce((acc, payment) => acc + (payment.rentAmount - payment.amountPaid), 0);
    const paid = payments.filter((payment) => payment.status === 'PAID').length;
    return { pendingAmount: pending, paidCount: paid };
  }, [payments]);

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-10">
        <h2 className="text-base sm:text-lg font-bold text-gray-700">Tenant not found</h2>
        <button onClick={() => navigate(backPath)} className="mt-3 text-sm text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const propertyLabel =
    tenant.propertyId?.name || tenant.propertyId?.location || tenant.propertyId?.propertyName || '-';
  const roomLabel = tenant.roomId?.roomNumber ? `Room ${tenant.roomId.roomNumber}` : tenant.roomId ? `Room ${tenant.roomId}` : '-';

  return (
    <div className="space-y-3 sm:space-y-5">
    
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5">
        <div className="flex items-center gap-3 sm:gap-4">
          {tenant.photo ? (
            <img
              src={`${BACKEND_URL}${tenant.photo}`}
              alt={tenant.name}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-base sm:text-xl font-bold">
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-xl font-bold text-gray-900">{tenant.name}</h1>
              <a href={`tel:${tenant.mobile}`} className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700">
                {tenant.mobile}
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${
                  tenant.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tenant.status === 'ACTIVE' ? 'Active' : 'Left'}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500">Property: {propertyLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
        <h3 className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-2">Room Details</h3>
        <div className="space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Room</span>
            <span className="font-semibold text-gray-800">{roomLabel}</span>
          </div>
          {tenant.bedNumber && (
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Bed</span>
              <span className="font-semibold text-gray-800">Bed {tenant.bedNumber}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Join Date</span>
            <span className="font-semibold text-gray-800">{formatDate(tenant.joiningDate)}</span>
          </div>
          {tenant.leaveDate && (
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Leave Date</span>
              <span className="font-semibold text-gray-800">{formatDate(tenant.leaveDate)}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Monthly Rent</span>
            <span className="font-bold text-green-600">₹{Number(tenant.rentAmount || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Advance</span>
            <span className="font-semibold text-gray-800">₹{Number(tenant.advanceAmount || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
        <h3 className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-3">Payment History</h3>
        {payments.length > 0 ? (
          <div className="space-y-2">
            {payments.map((payment) => {
              const paymentDate = new Date(payment.year, payment.month - 1);
              const monthYear = paymentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              const isPaid = payment.status === 'PAID';

              return (
                <div
                  key={payment._id}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg border transition-colors ${
                    isPaid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                      isPaid ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {isPaid ? (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs sm:text-sm font-bold text-gray-900">{monthYear}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500">
                        Rent: ₹{payment.rentAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold ${
                      isPaid ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {isPaid ? 'Paid' : 'Pending'}
                    </span>
                    {!isPaid && payment.amountPaid > 0 && (
                      <div className="text-[10px] sm:text-xs text-gray-600 mt-1">
                        Paid: ₹{payment.amountPaid.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-gray-500 text-center py-4">No payment records found.</p>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
        <h3 className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-2">Documents</h3>
        {(tenant.photo || tenant.adharImg) ? (
          <div className="grid grid-cols-2 gap-2">
            {tenant.photo && (
              <button
                onClick={() => setPreviewPhoto(`${BACKEND_URL}${tenant.photo}`)}
                className="bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition"
              >
                <img src={`${BACKEND_URL}${tenant.photo}`} alt="Photo" className="w-full h-16 object-cover rounded" />
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1 text-center">Photo</p>
              </button>
            )}
            {tenant.adharImg && (
              <button
                onClick={() => setPreviewPhoto(`${BACKEND_URL}${tenant.adharImg}`)}
                className="bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition"
              >
                <img src={`${BACKEND_URL}${tenant.adharImg}`} alt="Aadhar" className="w-full h-16 object-cover rounded" />
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1 text-center">Aadhar</p>
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-gray-500">No documents uploaded.</p>
        )}
      </div>

      {tenant.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
          <h3 className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-2">Notes</h3>
          <p className="text-xs sm:text-sm text-gray-700">{tenant.notes}</p>
        </div>
      )}

      {previewPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3" onClick={() => setPreviewPhoto(null)}>
          <div className="relative max-w-3xl w-full max-h-[90vh]" onClick={(event) => event.stopPropagation()}>
            <button onClick={() => setPreviewPhoto(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={previewPhoto} alt="Tenant Document" className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

export default TenantDetail;
