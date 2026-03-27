import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from '../App';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function TenantDetail() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [tenant, setTenant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    mobile: '',
    email: '',
    adharNo: '',
    dob: '',
    gender: '',
    rentAmount: '',
    advanceAmount: '',
    joiningDate: '',
    notes: '',
  });

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

  const openEditModal = () => {
    if (!tenant) return;

    setEditForm({
      name: tenant.name || '',
      mobile: tenant.mobile || '',
      email: tenant.email || '',
      adharNo: tenant.adharNo || '',
      dob: tenant.dob ? new Date(tenant.dob).toISOString().split('T')[0] : '',
      gender: tenant.gender || '',
      rentAmount: tenant.rentAmount || '',
      advanceAmount: tenant.advanceAmount || '',
      joiningDate: tenant.joiningDate ? new Date(tenant.joiningDate).toISOString().split('T')[0] : '',
      notes: tenant.notes || '',
    });
    setShowEditModal(true);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    if (name === 'mobile') {
      setEditForm((prev) => ({ ...prev, mobile: value.replace(/\D/g, '').slice(0, 10) }));
      return;
    }

    if (name === 'adharNo') {
      setEditForm((prev) => ({ ...prev, adharNo: value.replace(/\D/g, '').slice(0, 12) }));
      return;
    }

    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    const userId = user?.id || user?._id;
    if (!userId) {
      toast.error('User not authenticated. Please log in again.');
      return;
    }

    try {
      setSavingEdit(true);
      const response = await axios.patch(
        `${BACKEND_URL}/api/tenants/${tenantId}`,
        {
          userId,
          name: editForm.name,
          mobile: editForm.mobile,
          email: editForm.email || '',
          adharNo: editForm.adharNo || '',
          dob: editForm.dob || undefined,
          gender: editForm.gender || undefined,
          rentAmount: editForm.rentAmount ? Number(editForm.rentAmount) : undefined,
          advanceAmount: editForm.advanceAmount ? Number(editForm.advanceAmount) : 0,
          joiningDate: editForm.joiningDate || undefined,
          notes: editForm.notes || '',
        },
        { withCredentials: true }
      );

      setTenant(response.data.data);
      setShowEditModal(false);
      toast.success('Tenant updated successfully!');
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error(error.response?.data?.message || 'Failed to update tenant');
    } finally {
      setSavingEdit(false);
    }
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
  const tenantDocument = tenant.document || tenant.photo;

  return (
    <div className="space-y-3 sm:space-y-5">
    
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-base sm:text-xl font-bold">
            {tenant.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-xl font-bold text-gray-900">{tenant.name}</h1>
              <a href={`tel:${tenant.mobile}`} className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700">
                {tenant.mobile}
              </a>
              <button
                type="button"
                onClick={openEditModal}
                className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-100 sm:text-xs"
              >
                Edit
              </button>
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
            <span className="text-gray-500">Advance Paid</span>
            <span className="font-semibold text-gray-800">₹{Number(tenant.advanceAmount || 0).toLocaleString()}</span>
          </div>
          {tenant.advanceLeft > 0 && (
            <div className="flex justify-between gap-2 bg-blue-50 -mx-3 px-3 py-1 rounded-lg">
              <span className="text-blue-600 font-semibold text-xs sm:text-sm">Advance Remaining</span>
              <span className="font-bold text-blue-700">₹{Number(tenant.advanceLeft).toLocaleString()}</span>
            </div>
          )}
          {tenant.advanceLeft === 0 && tenant.advanceAmount > 0 && (
            <div className="flex justify-between gap-2">
              <span className="text-gray-400 text-xs sm:text-sm">Advance Remaining</span>
              <span className="font-semibold text-gray-400">₹0 (fully used)</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
        <h3 className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-3">Payment History</h3>
        {payments.length > 0 ? (
          <div className="space-y-2">
            {payments.map((payment) => {
              const paymentDate = new Date(payment.year, payment.month - 1);
              const monthYear = paymentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
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
        {(tenantDocument || tenant.adharImg) ? (
          <div className="grid grid-cols-2 gap-2">
            {tenantDocument && (
              <a
                href={`${BACKEND_URL}${tenantDocument}`}
                target="_blank"
                rel="noreferrer"
                className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition text-center"
              >
                <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7V3m10 4V3m-11 8h12M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500">Agreement / Document</p>
              </a>
            )}
            {tenant.adharImg && (
              <a
                href={`${BACKEND_URL}${tenant.adharImg}`}
                target="_blank"
                rel="noreferrer"
                className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition text-center"
              >
                <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500">Aadhar</p>
              </a>
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

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-base font-bold text-gray-900 sm:text-lg">Edit Tenant</h2>
                <p className="text-xs text-gray-500 sm:text-sm">Update tenant details from this page.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    required
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm">Mobile</label>
                  <input
                    type="text"
                    name="mobile"
                    value={editForm.mobile}
                    onChange={handleEditChange}
                    required
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm">Aadhar Number</label>
                  <input
                    type="text"
                    name="adharNo"
                    value={editForm.adharNo}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm">Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={editForm.dob}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm">Gender</label>
                  <select
                    name="gender"
                    value={editForm.gender}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm">Monthly Rent</label>
                  <input
                    type="number"
                    min="0"
                    name="rentAmount"
                    value={editForm.rentAmount}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm">Advance Amount</label>
                  <input
                    type="number"
                    min="0"
                    name="advanceAmount"
                    value={editForm.advanceAmount}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm">Joining Date</label>
                  <input
                    type="date"
                    name="joiningDate"
                    value={editForm.joiningDate}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-sm">Notes</label>
                  <textarea
                    name="notes"
                    rows="3"
                    value={editForm.notes}
                    onChange={handleEditChange}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingEdit ? 'Saving...' : 'Update Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TenantDetail;
