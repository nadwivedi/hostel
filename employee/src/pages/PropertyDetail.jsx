import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useEmployeeAuth } from "../context/EmployeeAuthContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function PropertyDetail() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { employee, hasPermission } = useEmployeeAuth();

  const [property, setProperty] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Add Tenant Modal State
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBed, setSelectedBed] = useState(null);
  const [saving, setSaving] = useState(false);

  const [tenantForm, setTenantForm] = useState({
    name: "",
    mobile: "",
    email: "",
    adharNo: "",
    gender: "",
    rentAmount: "",
    advanceAmount: "",
    joiningDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchData();
  }, [propertyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const config = { withCredentials: true };

      const [propertyRes, roomsRes, tenantsRes, buildingsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/employee/manage/properties/${propertyId}`, config),
        axios.get(`${BACKEND_URL}/api/employee/manage/properties/${propertyId}/rooms`, config),
        axios.get(`${BACKEND_URL}/api/employee/manage/properties/${propertyId}/tenants?status=ACTIVE`, config),
        axios.get(`${BACKEND_URL}/api/employee/manage/properties/${propertyId}/buildings`, config),
      ]);

      setProperty(propertyRes.data);
      setRooms(roomsRes.data);
      setTenants(tenantsRes.data);
      setBuildings(buildingsRes.data);

      if (buildingsRes.data.length > 0 && !selectedBuildingId) {
        setSelectedBuildingId(buildingsRes.data[0]._id);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error loading property data");
    } finally {
      setLoading(false);
    }
  };

  const openTenantModal = (room = null, bed = null, tenant = null) => {
    const sortedByRoomNumber = [...rooms].sort((a, b) => {
      const aNum = Number(a.roomNumber);
      const bNum = Number(b.roomNumber);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
      return String(a.roomNumber).localeCompare(String(b.roomNumber));
    });
    const existingRoom = tenant ? rooms.find((r) => r._id === (tenant.roomId?._id || tenant.roomId)) : null;
    const initialRoom = room || existingRoom || sortedByRoomNumber.find((r) => isRoomAvailable(r));

    if (!initialRoom) {
      toast.error("No available rooms to add tenant");
      return;
    }

    const initialBed =
      initialRoom.rentType === "PER_BED"
        ? bed || (tenant ? initialRoom.beds?.find((b) => b.bedNumber === tenant.bedNumber) : null) || getAvailableBeds(initialRoom)[0] || null
        : null;

    setEditingTenant(tenant || null);
    setSelectedRoom(initialRoom);
    setSelectedBed(initialBed);
    setTenantForm({
      name: tenant?.name || "",
      mobile: tenant?.mobile || "",
      email: tenant?.email || "",
      adharNo: tenant?.adharNo || "",
      gender: tenant?.gender || "",
      rentAmount: tenant?.rentAmount || initialRoom.rentAmount || "",
      advanceAmount: tenant?.advanceAmount || (initialRoom.rentAmount ? initialRoom.rentAmount * 2 : ""),
      joiningDate: tenant?.joiningDate ? new Date(tenant.joiningDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    });
    setShowAddTenantModal(true);
  };

  const handleSaveTenant = async (e) => {
    e.preventDefault();

    if (!selectedRoom) {
      toast.error("Please select a room");
      return;
    }

    if (selectedRoom.rentType === "PER_BED" && !selectedBed) {
      toast.error("Please select a bed");
      return;
    }

    if (!tenantForm.name.trim()) {
      toast.error("Please enter tenant name");
      return;
    }

    if (!tenantForm.mobile || tenantForm.mobile.length !== 10) {
      toast.error("Please enter valid 10-digit mobile number");
      return;
    }

    setSaving(true);

    try {
      const tenantData = {
        name: tenantForm.name.trim(),
        mobile: tenantForm.mobile,
        email: tenantForm.email || undefined,
        adharNo: tenantForm.adharNo || undefined,
        gender: tenantForm.gender || undefined,
        propertyId: propertyId,
        roomId: selectedRoom._id,
        bedNumber: selectedBed?.bedNumber || null,
        rentAmount: Number(tenantForm.rentAmount) || selectedRoom.rentAmount,
        advanceAmount: Number(tenantForm.advanceAmount) || 0,
        joiningDate: tenantForm.joiningDate,
      };

      if (editingTenant) {
        await axios.patch(
          `${BACKEND_URL}/api/employee/manage/tenants/${editingTenant._id}`,
          tenantData,
          { withCredentials: true }
        );
      } else {
        await axios.post(`${BACKEND_URL}/api/employee/manage/tenants`, tenantData, {
          withCredentials: true,
        });
      }

      toast.success(editingTenant ? "Tenant updated successfully" : "Tenant added successfully");
      setShowAddTenantModal(false);
      setEditingTenant(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add tenant");
    } finally {
      setSaving(false);
    }
  };

  const getTenantsForRoom = (roomId) => {
    return tenants.filter((t) => t.roomId?._id === roomId || t.roomId === roomId);
  };

  const handleMarkTenantLeft = async (tenant) => {
    if (!window.confirm(`Mark ${tenant.name} as left?`)) return;
    try {
      await axios.patch(
        `${BACKEND_URL}/api/employee/manage/tenants/${tenant._id}/mark-left`,
        {},
        { withCredentials: true }
      );
      toast.success("Tenant marked as left");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to mark tenant as left");
    }
  };

  const handleDeleteTenant = async (tenant) => {
    if (!window.confirm(`Delete tenant ${tenant.name}?`)) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/employee/manage/tenants/${tenant._id}`, {
        withCredentials: true,
      });
      toast.success("Tenant deleted successfully");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete tenant");
    }
  };

  const handleMarkRoomEmpty = async (room) => {
    if (!window.confirm(`Mark Room ${room.roomNumber} as empty? This will mark all active tenants in this room as left.`)) return;
    try {
      await axios.patch(
        `${BACKEND_URL}/api/employee/manage/rooms/${room._id}/mark-empty`,
        {},
        { withCredentials: true }
      );
      toast.success("Room marked as empty");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to mark room empty");
    }
  };

  const getAvailableBeds = (room) => {
    if (!room.beds || room.beds.length === 0) return [];
    return room.beds.filter((b) => b.status === "AVAILABLE");
  };

  const isRoomAvailable = (room) => {
    if (room.rentType === "PER_BED") {
      return getAvailableBeds(room).length > 0;
    }
    return room.status === "AVAILABLE";
  };

  // Filter rooms
  const filteredRooms = rooms.filter((room) => {
    if (selectedBuildingId) {
      if (selectedBuildingId === "no-building") {
        if (room.buildingId) return false;
      } else {
        const roomBuildingId = room.buildingId?._id || room.buildingId;
        if (roomBuildingId !== selectedBuildingId) return false;
      }
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase().trim();
      const roomTenants = getTenantsForRoom(room._id);
      const matchesTenant = roomTenants.some(
        (t) => t.name.toLowerCase().includes(search) || t.mobile.includes(search)
      );
      const matchesRoomNumber = room.roomNumber?.toString().includes(search);
      return matchesTenant || matchesRoomNumber;
    }
    return true;
  });

  const sortedRooms = [...filteredRooms].sort((a, b) => {
    const aNum = Number(a.roomNumber);
    const bNum = Number(b.roomNumber);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
    return String(a.roomNumber).localeCompare(String(b.roomNumber));
  });

  // Stats
  const totalRooms = rooms.length;
  const totalBeds = rooms.reduce((acc, r) => acc + (r.rentType === "PER_BED" ? r.beds?.length || 0 : 1), 0);
  const occupiedBeds = rooms.reduce((acc, r) => {
    if (r.rentType === "PER_BED") {
      return acc + (r.beds?.filter((b) => b.status === "OCCUPIED").length || 0);
    }
    return acc + (r.status === "OCCUPIED" ? 1 : 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-700">Property not found</h2>
        <button onClick={() => navigate("/")} className="mt-4 text-teal-600 hover:underline">
          Go back to Properties
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-1 pt-1 pb-1.5 sm:p-4">
      <div className="w-full sm:max-w-7xl mx-auto space-y-1.5 sm:space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-2 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {property.image ? (
              <img
                src={`${BACKEND_URL}${property.image}`}
                alt={property.name}
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-md object-cover"
              />
            ) : (
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md bg-teal-100 flex items-center justify-center text-teal-600 text-xs font-bold">
                {property.name.charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="text-sm sm:text-2xl font-black text-gray-800">
              {property.name} <span className="text-gray-400 font-bold">-</span>{" "}
              <span className="font-bold text-gray-500">{property.location}</span>
            </h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-1 sm:gap-4">
          <div className="bg-white rounded-md sm:rounded-2xl shadow-sm border border-blue-500 p-1.5 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[7px] sm:text-xs font-bold text-gray-500 uppercase">Rooms</p>
                <h3 className="text-sm sm:text-3xl font-black text-blue-600">{totalRooms}</h3>
              </div>
              <div className="w-5 h-5 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded sm:rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-xs sm:text-2xl">🏠</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md sm:rounded-2xl shadow-sm border border-purple-500 p-1.5 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[7px] sm:text-xs font-bold text-gray-500 uppercase">Beds</p>
                <h3 className="text-sm sm:text-3xl font-black text-purple-600">
                  {occupiedBeds}/{totalBeds}
                </h3>
              </div>
              <div className="w-5 h-5 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded sm:rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-xs sm:text-2xl">🛏️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md sm:rounded-2xl shadow-sm border border-green-500 p-1.5 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[7px] sm:text-xs font-bold text-gray-500 uppercase">Available</p>
                <h3 className="text-sm sm:text-3xl font-black text-green-600">{totalBeds - occupiedBeds}</h3>
              </div>
              <div className="w-5 h-5 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded sm:rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-xs sm:text-2xl">✅</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search + Add */}
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-1.5 sm:p-4">
          <div className="flex flex-row gap-1.5 sm:gap-2 items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search room number or tenant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 sm:pl-10 pr-2 py-2 sm:py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-400 transition-all bg-white font-medium"
              />
              <svg
                className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => openTenantModal()}
              disabled={!hasPermission("tenants", "add")}
              className="px-2.5 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg sm:rounded-xl hover:from-teal-700 hover:to-cyan-700 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1 sm:gap-2 shadow-md whitespace-nowrap"
            >
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Tenant</span>
            </button>
          </div>
        </div>

        {/* Building Tabs */}
        {buildings.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[...buildings]
              .sort((a, b) => (a.name || "").localeCompare(b.name || "", "en", { numeric: true }))
              .map((building) => {
                const buildingRoomCount = rooms.filter(
                  (r) => (r.buildingId?._id || r.buildingId) === building._id
                ).length;
                return (
                  <button
                    key={building._id}
                    onClick={() => setSelectedBuildingId(building._id)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                      selectedBuildingId === building._id
                        ? "bg-teal-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {building.name} ({buildingRoomCount})
                  </button>
                );
              })}
          </div>
        )}

        {/* Rooms List */}
        <div className="space-y-2 sm:space-y-5">
          {sortedRooms.map((room) => {
            const roomTenants = getTenantsForRoom(room._id);
            const isEmpty = roomTenants.length === 0;
            const hasAvailability = isRoomAvailable(room);

            return (
              <div
                key={room._id}
                className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Room Header */}
                <div className={`p-2 sm:p-6 ${isEmpty ? "bg-gradient-to-r from-green-700 via-green-800 to-green-900" : hasAvailability ? "bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800" : "bg-gradient-to-r from-gray-700 via-gray-800 to-black"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="w-8 h-8 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-2xl flex items-center justify-center border border-white/30 shadow-md">
                        <span className="text-base sm:text-3xl">🏠</span>
                      </div>
                      <div>
                        <h2 className="text-[15px] sm:text-3xl font-black text-white drop-shadow-lg">
                          Room {room.roomNumber}{" "}
                          <span className="px-1.5 py-0.5 sm:px-3 sm:py-1 bg-white/20 backdrop-blur-sm rounded-full text-white font-bold text-[9px] sm:text-xs border border-white/30">
                            {room.rentType === "PER_BED" ? `${room.beds?.length || 0} Beds` : "Full Room"}
                          </span>{" "}
                          <span className="px-1.5 py-0.5 sm:px-3 sm:py-1 bg-white/20 backdrop-blur-sm rounded-full text-white font-bold text-[9px] sm:text-xs border border-white/30">
                            ₹{room.rentAmount?.toLocaleString()}/mo
                          </span>
                        </h2>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/80 text-[9px] sm:text-sm font-semibold">Occupancy</div>
                      <div className="text-[15px] sm:text-3xl font-black text-white drop-shadow-lg">
                        {roomTenants.length}/{room.beds?.length || 1}
                      </div>
                      {roomTenants.length > 0 && hasPermission("rooms", "edit") && (
                        <button
                          type="button"
                          onClick={() => handleMarkRoomEmpty(room)}
                          className="mt-1 px-2 py-0.5 text-[10px] sm:text-xs rounded bg-red-500/80 hover:bg-red-600 text-white"
                        >
                          Mark Empty
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Room Content */}
                <div className="p-1.5 sm:p-4 bg-gradient-to-br from-gray-50 to-white">
                  {isEmpty && (
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg sm:rounded-xl border border-emerald-200 p-2 sm:p-3 flex items-center justify-between">
                      <div className="text-xs sm:text-sm font-bold text-emerald-700">Empty Room</div>
                      <button
                        type="button"
                        onClick={() => openTenantModal(room)}
                        disabled={!hasPermission("tenants", "add")}
                        className="w-6 h-6 sm:w-7 sm:h-7 bg-emerald-500 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Existing Tenants */}
                  {roomTenants.length > 0 && (
                    <div className="space-y-1.5 sm:space-y-3 mb-3">
                      {roomTenants.map((tenant) => (
                        <div
                          key={tenant._id}
                          className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-2 sm:p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-3">
                              {tenant.photo ? (
                                <img
                                  src={`${BACKEND_URL}${tenant.photo}`}
                                  alt={tenant.name}
                                  className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-sm sm:text-lg">
                                  {tenant.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="text-xs sm:text-base font-bold text-gray-900">{tenant.name}</div>
                                <div className="text-[10px] sm:text-sm text-gray-500">{tenant.mobile}</div>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              {tenant.bedNumber && (
                                <div className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] sm:text-xs font-bold">
                                  Bed {tenant.bedNumber}
                                </div>
                              )}
                              <div className="text-[10px] sm:text-sm text-gray-500 mt-1">
                                ₹{tenant.rentAmount?.toLocaleString()}/mo
                              </div>
                              <div className="flex items-center gap-1">
                                {hasPermission("tenants", "edit") && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openTenantModal(
                                        room,
                                        tenant.bedNumber ? room.beds?.find((b) => b.bedNumber === tenant.bedNumber) : null,
                                        tenant
                                      )
                                    }
                                    className="px-2 py-1 text-[10px] sm:text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                                  >
                                    Edit
                                  </button>
                                )}
                                {hasPermission("tenants", "edit") && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkTenantLeft(tenant)}
                                    className="px-2 py-1 text-[10px] sm:text-xs rounded bg-orange-100 text-orange-700 hover:bg-orange-200"
                                  >
                                    Mark Left
                                  </button>
                                )}
                                {hasPermission("tenants", "delete") && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTenant(tenant)}
                                    className="px-2 py-1 text-[10px] sm:text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>

        {sortedRooms.length === 0 && (
          <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-12 text-center">
            <div className="w-12 h-12 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
              <svg className="w-6 h-6 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
            </div>
            <h3 className="text-sm sm:text-xl font-bold text-gray-700 mb-1">No Rooms Found</h3>
            <p className="text-[10px] sm:text-sm text-gray-500">{searchTerm ? "No rooms match your search." : "No rooms in this property."}</p>
          </div>
        )}
      </div>

      {/* Add Tenant Modal */}
      {showAddTenantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">{editingTenant ? "Edit Tenant" : "Add New Tenant"}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Room {selectedRoom?.roomNumber}
                    {selectedBed && ` - Bed ${selectedBed.bedNumber}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddTenantModal(false);
                    setEditingTenant(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveTenant} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room *</label>
                <select
                  value={selectedRoom?._id || ""}
                  onChange={(e) => {
                    const room = rooms.find((r) => r._id === e.target.value);
                    setSelectedRoom(room || null);
                    if (!room || room.rentType !== "PER_BED") {
                      setSelectedBed(null);
                    } else {
                      setSelectedBed(getAvailableBeds(room)[0] || null);
                    }
                    if (room) {
                      setTenantForm((prev) => ({
                        ...prev,
                        rentAmount: room.rentAmount || "",
                        advanceAmount: room.rentAmount ? room.rentAmount * 2 : "",
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select Room</option>
                  {[...rooms]
                    .filter((r) => isRoomAvailable(r) || r._id === selectedRoom?._id || r._id === editingTenant?.roomId?._id || r._id === editingTenant?.roomId)
                    .sort((a, b) => {
                      const aNum = Number(a.roomNumber);
                      const bNum = Number(b.roomNumber);
                      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
                      return String(a.roomNumber).localeCompare(String(b.roomNumber));
                    })
                    .map((room) => (
                      <option key={room._id} value={room._id}>
                        Room {room.roomNumber}
                      </option>
                    ))}
                </select>
              </div>

              {selectedRoom?.rentType === "PER_BED" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bed *</label>
                  <select
                    value={selectedBed?.bedNumber || ""}
                    onChange={(e) => {
                      const bed = selectedRoom?.beds?.find(
                        (b) => String(b.bedNumber) === e.target.value,
                      );
                      setSelectedBed(bed || null);
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select Bed</option>
                    {[...getAvailableBeds(selectedRoom), ...(editingTenant?.bedNumber ? selectedRoom?.beds?.filter((b) => b.bedNumber === editingTenant.bedNumber) || [] : [])].filter((v, i, arr) => arr.findIndex((x) => x.bedNumber === v.bedNumber) === i).map((bed) => (
                      <option key={bed.bedNumber} value={bed.bedNumber}>
                        Bed {bed.bedNumber}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={tenantForm.name}
                  onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter tenant name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                <input
                  type="text"
                  value={tenantForm.mobile}
                  onChange={(e) => setTenantForm({ ...tenantForm, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={tenantForm.email}
                  onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Email (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
                <input
                  type="text"
                  value={tenantForm.adharNo}
                  onChange={(e) => setTenantForm({ ...tenantForm, adharNo: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="12-digit Aadhar (optional)"
                  maxLength={12}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={tenantForm.gender}
                  onChange={(e) => setTenantForm({ ...tenantForm, gender: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rent Amount</label>
                  <input
                    type="number"
                    value={tenantForm.rentAmount}
                    onChange={(e) => {
                      const rent = e.target.value;
                      setTenantForm({
                        ...tenantForm,
                        rentAmount: rent,
                        advanceAmount: rent ? Number(rent) * 2 : "",
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="Monthly rent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Advance Amount</label>
                  <input
                    type="number"
                    value={tenantForm.advanceAmount}
                    onChange={(e) => setTenantForm({ ...tenantForm, advanceAmount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="Advance paid"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                <input
                  type="date"
                  value={tenantForm.joiningDate}
                  onChange={(e) => setTenantForm({ ...tenantForm, joiningDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTenantModal(false);
                    setEditingTenant(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? (editingTenant ? "Saving..." : "Adding...") : (editingTenant ? "Save Changes" : "Add Tenant")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertyDetail;
