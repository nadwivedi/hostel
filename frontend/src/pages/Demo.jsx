import { useState } from 'react';

// Demo data
const demoRooms = [
  { _id: 'r1', roomNumber: '101', rentAmount: 5000, rentType: 'PER_BED', beds: [
    { bedNumber: 1, status: 'OCCUPIED' },
    { bedNumber: 2, status: 'OCCUPIED' },
    { bedNumber: 3, status: 'AVAILABLE' },
  ]},
  { _id: 'r2', roomNumber: '102', rentAmount: 8000, rentType: 'PER_ROOM', status: 'OCCUPIED' },
  { _id: 'r3', roomNumber: '103', rentAmount: 4500, rentType: 'PER_BED', beds: [
    { bedNumber: 1, status: 'OCCUPIED' },
    { bedNumber: 2, status: 'AVAILABLE' },
  ]},
];

const demoTenants = [
  {
    _id: 't1',
    name: 'Rahul Sharma',
    mobile: '9876543210',
    email: 'rahul@example.com',
    status: 'ACTIVE',
    roomId: { _id: 'r1', roomNumber: '101' },
    bedNumber: '1',
    rentAmount: 5000,
    advanceAmount: 10000,
    joiningDate: '2024-01-15',
    photo: null,
  },
  {
    _id: 't2',
    name: 'Priya Patel',
    mobile: '9876543211',
    email: 'priya@example.com',
    status: 'ACTIVE',
    roomId: { _id: 'r1', roomNumber: '101' },
    bedNumber: '2',
    rentAmount: 5000,
    advanceAmount: 10000,
    joiningDate: '2024-02-20',
    photo: null,
  },
  {
    _id: 't3',
    name: 'Amit Kumar',
    mobile: '9876543212',
    email: 'amit@example.com',
    status: 'ACTIVE',
    roomId: { _id: 'r2', roomNumber: '102' },
    bedNumber: null,
    rentAmount: 8000,
    advanceAmount: 16000,
    joiningDate: '2023-12-10',
    photo: null,
  },
  {
    _id: 't4',
    name: 'Sneha Desai',
    mobile: '9876543213',
    email: 'sneha@example.com',
    status: 'ACTIVE',
    roomId: { _id: 'r3', roomNumber: '103' },
    bedNumber: '1',
    rentAmount: 4500,
    advanceAmount: 9000,
    joiningDate: '2024-03-05',
    photo: null,
  },
];

const demoPayments = [
  {
    _id: 'p1',
    tenantId: 't1',
    month: 1,
    year: 2026,
    rentAmount: 5000,
    amountPaid: 0,
    status: 'PENDING',
    dueDate: '2026-01-05',
  },
  {
    _id: 'p2',
    tenantId: 't2',
    month: 12,
    year: 2025,
    rentAmount: 5000,
    amountPaid: 5000,
    status: 'PAID',
    paymentDate: '2025-12-03',
  },
  {
    _id: 'p3',
    tenantId: 't3',
    month: 1,
    year: 2026,
    rentAmount: 8000,
    amountPaid: 3000,
    status: 'PARTIAL',
    dueDate: '2026-01-05',
  },
  {
    _id: 'p4',
    tenantId: 't4',
    month: 1,
    year: 2026,
    rentAmount: 4500,
    amountPaid: 0,
    status: 'PENDING',
    dueDate: '2026-01-05',
  },
];

const demoLocation = {
  _id: 'l1',
  name: 'Sunrise PG',
  propertyName: 'Sunrise PG',
  location: 'Vijay Nagar, Indore',
};

function PropertyDetail() {
  const [rooms] = useState(demoRooms);
  const [tenants] = useState(demoTenants);
  const [payments] = useState(demoPayments);
  const [location] = useState(demoLocation);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Get tenants for a specific room
  const getTenantsForRoom = (roomId) => {
    return tenants.filter(t => t.roomId._id === roomId && (filterStatus === 'ALL' || t.status === filterStatus));
  };

  // Get payment info for a tenant
  const getTenantPaymentInfo = (tenantId) => {
    const tenantPayments = payments.filter(p => p.tenantId === tenantId);
    if (tenantPayments.length === 0) return null;

    const pendingPayment = tenantPayments.find(p => p.status === 'PENDING' || p.status === 'PARTIAL');
    if (pendingPayment) {
      const monthYear = new Date(pendingPayment.year, pendingPayment.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const pending = pendingPayment.rentAmount - (pendingPayment.amountPaid || 0);
      return {
        type: 'pending',
        paymentId: pendingPayment._id,
        month: monthYear,
        amount: pending,
        dueDate: pendingPayment.dueDate,
      };
    }

    const paidPayments = tenantPayments.filter(p => p.status === 'PAID').sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });

    if (paidPayments.length > 0) {
      const lastPaid = paidPayments[0];
      const monthYear = new Date(lastPaid.year, lastPaid.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return {
        type: 'paid',
        month: monthYear,
        amount: lastPaid.rentAmount,
        paidDate: lastPaid.paymentDate,
      };
    }

    return null;
  };

  const filteredRooms = rooms.filter(room => {
    const roomTenants = getTenantsForRoom(room._id);
    if (searchTerm) {
      return roomTenants.some(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.mobile.includes(searchTerm)
      );
    }
    return roomTenants.length > 0 || filterStatus === 'ALL';
  });

  const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length;
  const totalRooms = rooms.length;
  const totalBeds = rooms.reduce((acc, r) => acc + (r.beds?.length || (r.rentType === 'PER_ROOM' ? 1 : 0)), 0);
  const occupiedBeds = rooms.reduce((acc, r) => {
    if (r.rentType === 'PER_BED') {
      return acc + (r.beds?.filter(b => b.status === 'OCCUPIED').length || 0);
    }
    return acc + (r.status === 'OCCUPIED' ? 1 : 0);
  }, 0);
  const pendingPayments = payments
    .filter(p => p.status !== 'PAID')
    .reduce((acc, p) => acc + (p.rentAmount - p.amountPaid), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-800">{location.propertyName}</h1>
          <p className="text-sm text-gray-500 mt-1">{location.location}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 lg:gap-5">
          <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-500 p-4 lg:p-6 transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-bold text-gray-500 uppercase tracking-wider">Rooms</p>
                <h3 className="text-2xl lg:text-4xl font-black text-blue-600 mt-1">{totalRooms}</h3>
              </div>
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-xl">
                <span className="text-2xl lg:text-4xl">🏠</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border-2 border-purple-500 p-4 lg:p-6 transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-bold text-gray-500 uppercase tracking-wider">Beds</p>
                <h3 className="text-2xl lg:text-4xl font-black text-purple-600 mt-1">{occupiedBeds}/{totalBeds}</h3>
              </div>
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-xl">
                <span className="text-2xl lg:text-4xl">🛏️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border-2 border-red-500 p-4 lg:p-6 transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-bold text-gray-500 uppercase tracking-wider">Pending</p>
                <h3 className="text-2xl lg:text-4xl font-black text-red-600 mt-1">₹{pendingPayments.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-xl">
                <span className="text-2xl lg:text-4xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            <div className="relative flex-1 lg:max-w-md">
              <input
                type="text"
                placeholder="Search by name or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all bg-white font-medium"
              />
              <svg className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 text-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Left</option>
            </select>
          </div>
        </div>

        {/* ROOM-WISE DISPLAY */}
        <div className="space-y-6">
          {filteredRooms.map((room) => {
            const roomTenants = getTenantsForRoom(room._id);
            if (roomTenants.length === 0) return null;

            const roomPending = roomTenants.reduce((acc, tenant) => {
              const paymentInfo = getTenantPaymentInfo(tenant._id);
              return acc + (paymentInfo?.type === 'pending' ? paymentInfo.amount : 0);
            }, 0);

            return (
              <div key={room._id} className="bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden">
                
                {/* ROOM HEADER - DOMINANT */}
                <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-xl">
                        <span className="text-3xl sm:text-4xl">🏠</span>
                      </div>
                      <div>
                        <h2 className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg">
                          Room {room.roomNumber}
                        </h2>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white font-bold text-sm border border-white/30">
                            {room.rentType === 'PER_BED' ? `${room.beds.length} Beds` : 'Full Room'}
                          </span>
                          <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white font-bold text-sm border border-white/30">
                            ₹{room.rentAmount.toLocaleString()}/mo
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/80 text-sm font-semibold">Occupancy</div>
                      <div className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg">
                        {roomTenants.length}/{room.beds?.length || 1}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TENANTS LIST - SECONDARY DOMINANCE */}
                <div className="p-5 sm:p-6 bg-gradient-to-br from-gray-50 to-white">
                  <div className="space-y-4">
                    {roomTenants.map((tenant) => {
                      const paymentInfo = getTenantPaymentInfo(tenant._id);
                      
                      return (
                        <div key={tenant._id} className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-4 sm:p-5 hover:shadow-xl transition-all">
                          
                          {/* Tenant Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 h-14 w-14 sm:h-16 sm:w-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
                                {tenant.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-lg sm:text-xl font-black text-gray-900">{tenant.name}</div>
                                <div className="text-sm text-gray-600 flex items-center mt-1 font-semibold">
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  {tenant.mobile}
                                </div>
                              </div>
                            </div>
                            {tenant.bedNumber && (
                              <div className="px-4 py-2 bg-blue-100 rounded-xl">
                                <div className="text-xs text-blue-600 font-bold">BED</div>
                                <div className="text-2xl font-black text-blue-700">{tenant.bedNumber}</div>
                              </div>
                            )}
                          </div>

                          {/* Rent & Join Date - MEDIUM PROMINENCE */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border-2 border-green-200">
                              <div className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">Monthly Rent</div>
                              <div className="text-2xl font-black text-green-700">₹{tenant.rentAmount.toLocaleString()}</div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border-2 border-blue-200">
                              <div className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">Joined</div>
                              <div className="text-lg font-black text-blue-700">
                                {new Date(tenant.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          </div>

                          {/* PENDING PAYMENT - BOTTOM SMALLER SECTION */}
                          {paymentInfo && (
                            <div className={`rounded-xl p-3 border-2 ${
                              paymentInfo.type === 'pending' 
                                ? 'bg-red-50 border-red-200' 
                                : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {paymentInfo.type === 'pending' ? (
                                    <>
                                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                      <span className="text-xs font-bold text-red-700 uppercase tracking-wide">
                                        Pending Payment
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                                        Last Paid
                                      </span>
                                    </>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className={`text-xs font-semibold ${
                                    paymentInfo.type === 'pending' ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    {paymentInfo.month}
                                  </div>
                                  <div className={`text-lg font-black ${
                                    paymentInfo.type === 'pending' ? 'text-red-700' : 'text-gray-700'
                                  }`}>
                                    ₹{paymentInfo.amount.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ROOM TOTAL PENDING - BOTTOM SUMMARY */}
                {roomPending > 0 && (
                  <div className="bg-gradient-to-r from-red-100 to-orange-100 border-t-2 border-red-300 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></div>
                        <span className="text-sm font-bold text-red-800 uppercase tracking-wide">
                          Total Room Pending
                        </span>
                      </div>
                      <div className="text-3xl font-black text-red-700">
                        ₹{roomPending.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredRooms.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Rooms Found</h3>
            <p className="text-sm text-gray-500 text-center">
              {searchTerm ? 'No rooms match your search criteria.' : 'No rooms available.'}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

export default PropertyDetail;