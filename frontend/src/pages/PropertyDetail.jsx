import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "../App";
import { useAuth } from "../context/AuthContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function PropertyDetail() {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [location, setLocation] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [aadharFile, setAadharFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [aadharPreview, setAadharPreview] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [expandedRooms, setExpandedRooms] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    adharNo: "",
    adharImg: "",
    photo: "",
    dob: "",
    gender: "",
    roomId: "",
    bedNumber: "",
    rentAmount: "",
    advanceAmount: "",
    joiningDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [locationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const config = { withCredentials: true };

      const [locationsRes, tenantsRes, roomsRes, paymentsRes] =
        await Promise.all([
          axios.get(`${BACKEND_URL}/api/properties`, config),
          axios.get(
            `${BACKEND_URL}/api/tenants?locationId=${locationId}&status=ACTIVE`,
            config,
          ),
          axios.get(
            `${BACKEND_URL}/api/rooms?locationId=${locationId}`,
            config,
          ),
          axios.get(
            `${BACKEND_URL}/api/payments?locationId=${locationId}`,
            config,
          ),
        ]);

      const loc = locationsRes.data.find((l) => l._id === locationId);
      setLocation(loc);
      setTenants(tenantsRes.data);
      setRooms(roomsRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error loading property data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "mobile") {
      const numericValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData({ ...formData, [name]: numericValue });
    } else if (name === "adharNo") {
      const numericValue = value.replace(/\D/g, "").slice(0, 12);
      setFormData({ ...formData, [name]: numericValue });
    } else if (name === "roomId") {
      const selectedRoom = rooms.find((r) => r._id === value);
      const rent = selectedRoom ? selectedRoom.rentAmount : "";
      setFormData({
        ...formData,
        roomId: value,
        bedNumber: "",
        rentAmount: rent,
        advanceAmount: rent ? rent * 2 : "",
      });
    } else if (name === "rentAmount") {
      const rent = value ? parseFloat(value) : "";
      setFormData({
        ...formData,
        rentAmount: value,
        advanceAmount: rent ? rent * 2 : "",
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileUpload = async (file, type, tenantName) => {
    if (!file) return null;

    const userId = user?.id || user?._id;
    if (!userId) {
      toast.error("User not authenticated. Please log in again.");
      return null;
    }

    const formDataUpload = new FormData();
    formDataUpload.append(type, file);
    formDataUpload.append("tenantName", tenantName);
    formDataUpload.append("userId", userId);

    try {
      setUploading(true);
      const response = await axios.post(
        `${BACKEND_URL}/api/uploads/${type}`,
        formDataUpload,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        },
      );
      setUploading(false);
      return response.data.fileUrl;
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      setUploading(false);
      toast.error(`Error uploading ${type}`);
      return null;
    }
  };

  const handleAadharChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAadharFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAadharPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
    setAadharFile(null);
    setPhotoFile(null);
    setAadharPreview(null);
    setPhotoPreview(null);
    setFormData({
      name: tenant.name,
      mobile: tenant.mobile,
      email: tenant.email || "",
      adharNo: tenant.adharNo || "",
      adharImg: tenant.adharImg || "",
      photo: tenant.photo || "",
      dob: tenant.dob ? new Date(tenant.dob).toISOString().split("T")[0] : "",
      gender: tenant.gender || "",
      roomId: tenant.roomId?._id || tenant.roomId || "",
      bedNumber: tenant.bedNumber || "",
      rentAmount: tenant.rentAmount || "",
      advanceAmount: tenant.advanceAmount || "",
      joiningDate: tenant.joiningDate
        ? new Date(tenant.joiningDate).toISOString().split("T")[0]
        : "",
      notes: tenant.notes || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userId = user?.id || user?._id;
    if (!userId) {
      toast.error("User not authenticated. Please log in again.");
      return;
    }

    try {
      let aadharUrl = formData.adharImg;
      let photoUrl = formData.photo;

      if (aadharFile) {
        aadharUrl = await handleFileUpload(aadharFile, "aadhar", formData.name);
      }

      if (photoFile) {
        photoUrl = await handleFileUpload(photoFile, "photo", formData.name);
      }

      const tenantData = {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email || undefined,
        adharNo: formData.adharNo || undefined,
        adharImg: aadharUrl || undefined,
        photo: photoUrl || undefined,
        dob: formData.dob || undefined,
        ...(formData.gender && { gender: formData.gender }),
        locationId: locationId,
        roomId: formData.roomId || undefined,
        bedNumber: formData.bedNumber || undefined,
        rentAmount: formData.rentAmount
          ? parseFloat(formData.rentAmount)
          : undefined,
        advanceAmount: formData.advanceAmount
          ? parseFloat(formData.advanceAmount)
          : 0,
        joiningDate: formData.joiningDate || undefined,
        notes: formData.notes || "",
      };

      if (editingTenant) {
        await axios.patch(
          `${BACKEND_URL}/api/tenants/${editingTenant._id}`,
          { userId, ...tenantData },
          {
            withCredentials: true,
          },
        );
        toast.success("Tenant updated successfully!");
      } else {
        await axios.post(
          `${BACKEND_URL}/api/tenants`,
          { userId, ...tenantData },
          {
            withCredentials: true,
          },
        );
        toast.success("Tenant added successfully!");
      }

      handleCancel();
      fetchData();
    } catch (error) {
      console.error("Error saving tenant:", error);
      toast.error(error.response?.data?.message || "Error saving tenant");
    }
  };

  const handleMarkAsLeft = async (tenant) => {
    if (!window.confirm(`Mark ${tenant.name} as left?`)) return;

    const userId = user?.id || user?._id;
    try {
      await axios.patch(
        `${BACKEND_URL}/api/tenants/${tenant._id}`,
        {
          userId,
          status: "COMPLETED",
          leaveDate: new Date(),
        },
        { withCredentials: true },
      );
      toast.success("Tenant marked as left");
      fetchData();
    } catch (error) {
      console.error("Error updating tenant:", error);
      toast.error("Error updating tenant status");
    }
  };

  const handleMarkPaymentAsPaid = async (e, paymentId) => {
    e.stopPropagation();
    try {
      await axios.post(
        `${BACKEND_URL}/api/payments/${paymentId}/mark-paid`,
        {
          paymentDate: new Date(),
        },
        { withCredentials: true },
      );
      toast.success("Payment marked as paid");
      fetchData();
    } catch (error) {
      console.error("Error marking payment as paid:", error);
      toast.error("Error updating payment");
    }
  };

  const openWhatsAppReminder = async (e, tenant, amount, month, paymentId) => {
    e.stopPropagation();

    // Track the reminder
    if (paymentId) {
      try {
        await axios.post(
          `${BACKEND_URL}/api/payments/${paymentId}/track-reminder`,
          {},
          { withCredentials: true },
        );
        fetchData(); // Refresh to show updated reminder count
      } catch (error) {
        console.error("Error tracking reminder:", error);
      }
    }

    const message = `Hello ${tenant.name},\n\nThis is a friendly reminder that your rent payment of ₹${amount.toLocaleString()} for ${month} is pending.\n\nProperty: ${location?.name || "Our Property"}\nRoom: ${tenant.roomId?.roomNumber ? `Room ${tenant.roomId.roomNumber}` : "N/A"}${tenant.bedNumber ? ` - Bed ${tenant.bedNumber}` : ""}\n\nPlease make the payment at your earliest convenience.\n\nThank you!`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/91${tenant.mobile}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTenant(null);
    setAadharFile(null);
    setPhotoFile(null);
    setAadharPreview(null);
    setPhotoPreview(null);
    setShowAdditionalDetails(false);
    setFormData({
      name: "",
      mobile: "",
      email: "",
      adharNo: "",
      adharImg: "",
      photo: "",
      dob: "",
      gender: "",
      roomId: "",
      bedNumber: "",
      rentAmount: "",
      advanceAmount: "",
      joiningDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
  };

  const toggleRoomExpanded = (roomId) => {
    setExpandedRooms((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }));
  };

  const activeTenants = tenants.filter((t) => t.status === "ACTIVE").length;
  const totalRooms = rooms.length;
  const totalBeds = rooms.reduce(
    (acc, r) => acc + (r.beds?.length || (r.rentType === "PER_ROOM" ? 1 : 0)),
    0,
  );
  const occupiedBeds = rooms.reduce((acc, r) => {
    if (r.rentType === "PER_BED") {
      return acc + (r.beds?.filter((b) => b.status === "OCCUPIED").length || 0);
    }
    return acc + (r.status === "OCCUPIED" ? 1 : 0);
  }, 0);
  const pendingPayments = payments
    .filter((p) => p.status !== "PAID")
    .reduce((acc, p) => acc + (p.rentAmount - p.amountPaid), 0);

  const selectedRoom = rooms.find((r) => r._id === formData.roomId);
  const availableBeds =
    selectedRoom?.beds?.filter((b) => b.status === "AVAILABLE") || [];

  // Get payment info for a tenant (pending or last paid)
  const getTenantPaymentInfo = (tenantId) => {
    const tenantPayments = payments.filter(
      (p) => p.tenantId?._id === tenantId || p.tenantId === tenantId,
    );
    if (tenantPayments.length === 0) return null;

    // Check for pending payments first
    const pendingPayment = tenantPayments.find(
      (p) => p.status === "PENDING" || p.status === "PARTIAL",
    );
    if (pendingPayment) {
      const pendingDateSource =
        pendingPayment.dueDate ||
        new Date(pendingPayment.year, pendingPayment.month - 1, 1);
      const pendingDate = new Date(pendingDateSource);
      const monthYear = pendingDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const pending =
        pendingPayment.rentAmount - (pendingPayment.amountPaid || 0);
      return {
        type: "pending",
        paymentId: pendingPayment._id,
        month: monthYear,
        amount: pending,
        dueDate: pendingPayment.dueDate,
      };
    }

    // Get last paid payment
    const paidPayments = tenantPayments
      .filter((p) => p.status === "PAID")
      .sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
      });

    if (paidPayments.length > 0) {
      const lastPaid = paidPayments[0];
      const monthYear = new Date(
        lastPaid.year,
        lastPaid.month - 1,
      ).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      return {
        type: "paid",
        month: monthYear,
        amount: lastPaid.rentAmount,
        paidDate: lastPaid.paymentDate,
      };
    }

    return null;
  };

  // Get tenants for a specific room
  const getTenantsForRoom = (roomId) => {
    return tenants.filter(
      (t) => t.roomId?._id === roomId || t.roomId === roomId,
    );
  };

  // Filter rooms based on search
  const filteredRooms = rooms.filter((room) => {
    const roomTenants = getTenantsForRoom(room._id);
    if (searchTerm) {
      return roomTenants.some(
        (t) =>
          t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.mobile.includes(searchTerm),
      );
    }
    return roomTenants.length > 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-700">Property not found</h2>
        <button
          onClick={() => navigate("/")}
          className="mt-4 text-blue-600 hover:underline"
        >
          Go back to Properties
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-1 py-1.5 sm:p-4">
      <div className="w-full sm:max-w-7xl mx-auto space-y-1.5 sm:space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-2 sm:p-5">
          <h1 className="text-sm sm:text-2xl font-black text-gray-800">
            {location.propertyName || location.name}{" "}
            <span className="text-gray-400 font-bold">-</span>{" "}
            <span className="font-bold text-gray-500">{location.location}</span>
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-1 sm:gap-4">
          <div className="bg-white rounded-md sm:rounded-2xl shadow-sm border border-blue-500 p-1.5 sm:p-5 transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[7px] sm:text-xs font-bold text-gray-500 uppercase">
                  Rooms
                </p>
                <h3 className="text-sm sm:text-3xl font-black text-blue-600">
                  {totalRooms}
                </h3>
              </div>
              <div className="w-5 h-5 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded sm:rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-xs sm:text-2xl">🏠</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md sm:rounded-2xl shadow-sm border border-purple-500 p-1.5 sm:p-5 transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[7px] sm:text-xs font-bold text-gray-500 uppercase">
                  Beds
                </p>
                <h3 className="text-sm sm:text-3xl font-black text-purple-600">
                  {occupiedBeds}/{totalBeds}
                </h3>
              </div>
              <div className="w-5 h-5 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded sm:rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-xs sm:text-2xl">🛏️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md sm:rounded-2xl shadow-sm border border-red-500 p-1.5 sm:p-5 transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[7px] sm:text-xs font-bold text-gray-500 uppercase">
                  Pending
                </p>
                <h3 className="text-sm sm:text-3xl font-black text-red-600">
                  ₹{pendingPayments.toLocaleString()}
                </h3>
              </div>
              <div className="w-5 h-5 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-red-600 rounded sm:rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-xs sm:text-2xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-1.5 sm:p-4">
          <div className="flex flex-row gap-1.5 sm:gap-2 items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search name or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 sm:pl-10 pr-2 py-2 sm:py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all bg-white font-medium"
              />
              <svg
                className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400"
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
            <button
              onClick={() => setShowForm(true)}
              className="px-2.5 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1 sm:gap-2 shadow-md whitespace-nowrap"
            >
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
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
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Tenant Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-1 sm:p-4">
            <div className="bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full max-h-[98vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-gray-800 p-2 sm:p-4 text-white flex-shrink-0">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-xl font-bold truncate">
                      {editingTenant ? "Edit Tenant" : "Add New Tenant"}
                    </h2>
                    <p className="text-gray-400 text-[10px] sm:text-sm">
                      {location.propertyName || location.location}
                    </p>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="text-gray-400 hover:bg-gray-700 rounded-full p-1 sm:p-2 transition"
                  >
                    <svg
                      className="w-4 h-4 sm:w-6 sm:h-6"
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
                className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6 space-y-2 sm:space-y-4"
              >
                {/* Personal Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-4">
                  <h3 className="text-xs sm:text-base font-bold text-gray-800 mb-2 sm:mb-3">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                        Mobile <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleChange}
                        required
                        maxLength="10"
                        inputMode="numeric"
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                        placeholder="Mobile"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                        Aadhar No.
                      </label>
                      <input
                        type="text"
                        name="adharNo"
                        value={formData.adharNo}
                        onChange={handleChange}
                        maxLength="12"
                        inputMode="numeric"
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                        placeholder="12-digit"
                      />
                    </div>
                  </div>
                </div>

                {/* Room Assignment */}
                <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-4">
                  <h3 className="text-xs sm:text-base font-bold text-gray-800 mb-2 sm:mb-3">
                    Room Assignment
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    {/* Room row - full width */}
                    <div className="col-span-2">
                      <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                        Room <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="roomId"
                        value={formData.roomId}
                        onChange={handleChange}
                        required
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                      >
                        <option value="">Select Room</option>
                        {rooms.map((room) => {
                          const availableCount =
                            room.rentType === "PER_BED"
                              ? room.beds?.filter(
                                  (b) => b.status === "AVAILABLE",
                                ).length || 0
                              : room.status === "AVAILABLE"
                                ? 1
                                : 0;
                          const isAvailable =
                            availableCount > 0 ||
                            (editingTenant &&
                              editingTenant.roomId?._id === room._id);
                          return (
                            <option
                              key={room._id}
                              value={room._id}
                              disabled={!isAvailable}
                            >
                              Room {room.roomNumber} - ₹{room.rentAmount}
                              {room.rentType === "PER_BED"
                                ? ` (${availableCount} beds)`
                                : ""}
                              {!isAvailable ? " (Full)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Bed & Join Date row (or just Join Date if no bed) */}
                    {selectedRoom?.rentType === "PER_BED" ? (
                      <>
                        <div>
                          <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                            Bed <span className="text-red-500">*</span>
                          </label>
                          <select
                            name="bedNumber"
                            value={formData.bedNumber}
                            onChange={handleChange}
                            required
                            className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                          >
                            <option value="">Select Bed</option>
                            {selectedRoom.beds?.map((bed) => {
                              const isCurrentBed =
                                editingTenant?.bedNumber === bed.bedNumber;
                              const isAvailable =
                                bed.status === "AVAILABLE" || isCurrentBed;
                              return (
                                <option
                                  key={bed.bedNumber}
                                  value={bed.bedNumber}
                                  disabled={!isAvailable}
                                >
                                  Bed {bed.bedNumber}{" "}
                                  {!isAvailable ? "(Occupied)" : ""}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                            Join Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            name="joiningDate"
                            value={formData.joiningDate}
                            onChange={handleChange}
                            required
                            className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                          Join Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="joiningDate"
                          value={formData.joiningDate}
                          onChange={handleChange}
                          required
                          className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                        />
                      </div>
                    )}

                    {/* Rent & Advance row */}
                    <div>
                      <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                        Rent (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="rentAmount"
                        value={formData.rentAmount}
                        onChange={handleChange}
                        required
                        min="0"
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                        placeholder="Monthly rent"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                        Advance (₹)
                      </label>
                      <input
                        type="number"
                        name="advanceAmount"
                        value={formData.advanceAmount}
                        onChange={handleChange}
                        min="0"
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 font-semibold"
                        placeholder="Deposit"
                      />
                    </div>
                  </div>
                </div>

                {/* Document Uploads */}
                <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-4">
                  <h3 className="text-xs sm:text-base font-bold text-gray-800 mb-2 sm:mb-3">
                    Documents
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                        Aadhar Card
                      </label>
                      <input
                        type="file"
                        id="aadharUpload"
                        accept="image/*,application/pdf"
                        onChange={handleAadharChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="aadharUpload"
                        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-gray-400 transition-all overflow-hidden ${
                          aadharPreview || formData.adharImg
                            ? "border-green-400 bg-green-50 p-1"
                            : "border-gray-300 hover:bg-gray-50 p-2 sm:p-4"
                        }`}
                      >
                        {aadharPreview ? (
                          <img
                            src={aadharPreview}
                            alt="Aadhar"
                            className="w-full h-16 sm:h-24 object-contain rounded"
                          />
                        ) : formData.adharImg ? (
                          <img
                            src={`${BACKEND_URL}${formData.adharImg}`}
                            alt="Aadhar"
                            className="w-full h-16 sm:h-24 object-contain rounded"
                          />
                        ) : (
                          <>
                            <svg
                              className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mb-0.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                            <span className="text-[10px] sm:text-xs text-gray-500">
                              Upload
                            </span>
                          </>
                        )}
                      </label>
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                        Photo
                      </label>
                      <input
                        type="file"
                        id="photoUpload"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="photoUpload"
                        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-gray-400 transition-all overflow-hidden ${
                          photoPreview || formData.photo
                            ? "border-green-400 bg-green-50 p-1"
                            : "border-gray-300 hover:bg-gray-50 p-2 sm:p-4"
                        }`}
                      >
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="Photo"
                            className="w-full h-16 sm:h-24 object-cover rounded"
                          />
                        ) : formData.photo ? (
                          <img
                            src={`${BACKEND_URL}${formData.photo}`}
                            alt="Photo"
                            className="w-full h-16 sm:h-24 object-cover rounded"
                          />
                        ) : (
                          <>
                            <svg
                              className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mb-0.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="text-[10px] sm:text-xs text-gray-500">
                              Upload
                            </span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Additional Details - Collapsible */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setShowAdditionalDetails(!showAdditionalDetails)
                    }
                    className="w-full p-2 sm:p-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-xs sm:text-base font-bold text-gray-800">
                      Additional Details
                    </span>
                    <svg
                      className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 transition-transform ${showAdditionalDetails ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {showAdditionalDetails && (
                    <div className="p-2 sm:p-4 pt-0 sm:pt-0 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        <div>
                          <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                            DOB
                          </label>
                          <input
                            type="date"
                            name="dob"
                            value={formData.dob}
                            onChange={handleChange}
                            className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                            Gender
                          </label>
                          <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                          >
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-4">
                        <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                          Notes
                        </label>
                        <textarea
                          name="notes"
                          value={formData.notes}
                          onChange={handleChange}
                          rows="2"
                          className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                          placeholder="Notes..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </form>

              <div className="border-t border-gray-200 p-2 sm:p-4 bg-gray-100 flex justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 sm:px-6 py-1.5 sm:py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-semibold text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector("form").requestSubmit();
                  }}
                  disabled={uploading}
                  className={`px-3 sm:px-6 py-1.5 sm:py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 font-semibold flex items-center gap-2 text-xs sm:text-sm ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {uploading
                    ? "Uploading..."
                    : editingTenant
                      ? "Update"
                      : "Add"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Photo Preview Modal */}
        {previewPhoto && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewPhoto(null)}
          >
            <div
              className="relative max-w-3xl w-full max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewPhoto(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300"
              >
                <svg
                  className="w-8 h-8"
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
              <img
                src={previewPhoto}
                alt="Tenant Photo"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
        )}

        {/* ROOM-WISE DISPLAY */}
        <div className="space-y-2 sm:space-y-5">
          {filteredRooms.map((room) => {
            const roomTenants = getTenantsForRoom(room._id);
            if (roomTenants.length === 0) return null;

            const isPerBed = room.rentType === "PER_BED";
            const isExpanded = !!expandedRooms[room._id];
            const totalBedsInRoom = room.beds?.length || roomTenants.length;
            const remainingBeds = Math.max(totalBedsInRoom - 1, 0);
            const visibleTenants =
              isPerBed && !isExpanded ? roomTenants.slice(0, 1) : roomTenants;

            const roomPending = roomTenants.reduce((acc, tenant) => {
              const paymentInfo = getTenantPaymentInfo(tenant._id);
              return (
                acc + (paymentInfo?.type === "pending" ? paymentInfo.amount : 0)
              );
            }, 0);

            return (
              <div
                key={room._id}
                className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* ROOM HEADER - DOMINANT */}
                <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 p-2 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="w-8 h-8 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-2xl flex items-center justify-center border border-white/30 shadow-md">
                        <span className="text-base sm:text-3xl">🏠</span>
                      </div>
                      <div>
                        <h2 className="text-[15px] sm:text-3xl font-black text-white drop-shadow-lg">
                          Room {room.roomNumber} -{" "}
                          <span className="px-1.5 py-0.5 sm:px-3 sm:py-1 bg-white/20 backdrop-blur-sm rounded-full text-white font-bold text-[9px] sm:text-xs border border-white/30">
                            {room.rentType === "PER_BED"
                              ? `${room.beds?.length || 0} Beds`
                              : "Full Room"}
                          </span>{" "}
                          <span className="px-1.5 py-0.5 sm:px-3 sm:py-1 bg-white/20 backdrop-blur-sm rounded-full text-white font-bold text-[9px] sm:text-xs border border-white/30">
                            ₹{room.rentAmount?.toLocaleString()}/mo
                          </span>
                        </h2>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/80 text-[9px] sm:text-sm font-semibold">
                        Occupancy
                      </div>
                      <div className="text-[15px] sm:text-3xl font-black text-white drop-shadow-lg">
                        {roomTenants.length}/{room.beds?.length || 1}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TENANTS LIST - SECONDARY DOMINANCE */}
                <div className="p-1.5 sm:p-4 bg-gradient-to-br from-gray-50 to-white">
                  <div className="space-y-1.5 sm:space-y-3">
                    {visibleTenants.map((tenant, index) => {
                      const paymentInfo = getTenantPaymentInfo(tenant._id);

                      return (
                        <div
                          key={tenant._id}
                          className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-2 sm:p-4 hover:shadow-md transition-all cursor-pointer"
                          onClick={() =>
                            navigate(`/tenant/${tenant._id}`, {
                              state: { from: `/property/${locationId}` },
                            })
                          }
                        >
                          {/* Tenant Header */}
                          <div className="flex items-center justify-between mb-1.5 sm:mb-3">
                            <div className="flex items-center gap-2 sm:gap-3">
                              {tenant.photo ? (
                                <div className="flex-shrink-0 h-9 w-9 sm:h-14 sm:w-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg sm:rounded-2xl flex items-center justify-center text-white font-black text-base sm:text-2xl shadow-sm overflow-hidden">
                                  <img
                                    src={`${BACKEND_URL}${tenant.photo}`}
                                    alt={tenant.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="flex-shrink-0 h-9 w-9 sm:h-14 sm:w-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg sm:rounded-2xl flex items-center justify-center text-white font-black text-base sm:text-2xl shadow-sm">
                                  {tenant.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="text-xs sm:text-lg font-black text-gray-900">
                                  {tenant.name}
                                </div>
                                <div className="text-[10px] sm:text-sm text-gray-600 flex items-center font-semibold">
                                  <svg
                                    className="w-2.5 h-2.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                    />
                                  </svg>
                                  {tenant.mobile}
                                </div>
                              </div>
                            </div>
                            <div
                              className="flex items-center gap-0.5 sm:gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {tenant.bedNumber && (
                                <div className="px-1.5 py-0.5 sm:px-3 sm:py-1.5 bg-blue-100 rounded-md sm:rounded-xl">
                                  <div className="text-[7px] sm:text-xs text-blue-600 font-bold">
                                    BED
                                  </div>
                                  <div className="text-sm sm:text-xl font-black text-blue-700">
                                    {tenant.bedNumber}
                                  </div>
                                </div>
                              )}
                              <button
                                onClick={() => handleEdit(tenant)}
                                className="p-1 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-md transition"
                                title="Edit"
                              >
                                <svg
                                  className="w-3.5 h-3.5 sm:w-5 sm:h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              {tenant.status === "ACTIVE" && (
                                <button
                                  onClick={() => handleMarkAsLeft(tenant)}
                                  className="p-1 sm:p-2 text-orange-600 hover:bg-orange-50 rounded-md transition"
                                  title="Mark as Left"
                                >
                                  <svg
                                    className="w-3.5 h-3.5 sm:w-5 sm:h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Rent & Join Date - MEDIUM PROMINENCE */}
                          <div className="grid grid-cols-2 gap-1 sm:gap-3 mb-1.5 sm:mb-3">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-md sm:rounded-xl p-1.5 sm:p-3 border border-green-200">
                              <div className="text-[8px] sm:text-xs text-green-600 font-bold uppercase">
                                Rent
                              </div>
                              <div className="text-sm sm:text-xl font-black text-green-700">
                                ₹{tenant.rentAmount?.toLocaleString()}
                              </div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-md sm:rounded-xl p-1.5 sm:p-3 border border-blue-200">
                              <div className="text-[8px] sm:text-xs text-blue-600 font-bold uppercase">
                                Joined
                              </div>
                              <div className="text-xs sm:text-base font-black text-blue-700">
                                {new Date(
                                  tenant.joiningDate,
                                ).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>

                          {isPerBed &&
                            !isExpanded &&
                            remainingBeds > 0 &&
                            index === 0 && (
                              <div className="flex items-center justify-center mb-1.5 sm:mb-3">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRoomExpanded(room._id);
                                  }}
                                  className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-gray-600 hover:text-gray-800 transition"
                                >
                                  <span>2 more beds</span>
                                  <svg
                                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </button>
                              </div>
                            )}

                             {/* PENDING PAYMENT - BOTTOM SMALLER SECTION */}
                             {paymentInfo && paymentInfo.type === "pending" && (
                               <div
                                 className={`rounded-md sm:rounded-xl p-1.5 sm:p-3 border ${
                                   paymentInfo.type === "pending"
                                     ? "bg-red-50 border-red-200"
                                     : "bg-gray-50 border-gray-200"
                                 }`}
                               >
                                 <div className="flex items-center justify-between">
                                   <div className="text-left">
                                     <span className={`text-xs sm:text-lg font-black ${paymentInfo.type === "pending" ? "text-red-700" : "text-gray-700"}`}>
                                       {paymentInfo.amount.toLocaleString()} 
                                     </span>
                                     <span className="text-[10px] ml-1 font-semibold">(pending)</span>
                                     <div className="font-bold text-[10px]">
                                      {paymentInfo.month}
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-0.5 sm:gap-1" onClick={(e) => e.stopPropagation()}>
                                     <button
                                       onClick={(e) =>
                                         handleMarkPaymentAsPaid(
                                           e,
                                           paymentInfo.paymentId,
                                       )
                                     }
                                     className="p-1 sm:p-2 bg-green-600 text-white rounded sm:rounded-lg hover:bg-green-700 transition"
                                     title="Mark as Paid"
                                   >
                                    <svg
                                        className="w-3 h-3 sm:w-4 sm:h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2.5}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    </button>
                                      <button
                                        onClick={(e) =>
                                          openWhatsAppReminder(
                                            e,
                                            tenant,
                                            paymentInfo.amount,
                                            paymentInfo.month,
                                            paymentInfo.paymentId,
                                          )
                                        }
                                        className="p-1 sm:p-2 bg-green-500 text-white rounded sm:rounded-lg hover:bg-green-600 transition"
                                        title="Send WhatsApp Reminder"
                                      >
                                        <svg
                                          className="w-3 h-3 sm:w-4 sm:h-4"
                                          fill="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        {filteredRooms.length === 0 && (
          <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-12 flex flex-col items-center justify-center">
            <div className="w-12 h-12 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-2 sm:mb-4">
              <svg
                className="w-6 h-6 sm:w-10 sm:h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-sm sm:text-xl font-bold text-gray-700 mb-1">
              No Rooms Found
            </h3>
            <p className="text-[10px] sm:text-sm text-gray-500 text-center">
              {searchTerm
                ? "No rooms match your search."
                : "No rooms available."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertyDetail;
