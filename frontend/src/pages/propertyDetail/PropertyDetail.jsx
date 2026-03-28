import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "../../App";
import { useAuth } from "../../context/AuthContext";
import TenantFormModal from "./components/TenantFormModal";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function PropertyDetail() {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [location, setLocation] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [payments, setPayments] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null); // null = show all, 'no-building' = rooms without building
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [showRoomsGrid, setShowRoomsGrid] = useState(false);
  const [showBedsGrid, setShowBedsGrid] = useState(false);
  const [selectedFormBuildingId, setSelectedFormBuildingId] = useState("");
  const [aadharFile, setAadharFile] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [aadharPreview, setAadharPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [expandedRooms, setExpandedRooms] = useState({});
  const [exitModal, setExitModal] = useState({ open: false, tenant: null });
  const [exitForm, setExitForm] = useState({ leaveDate: new Date().toISOString().split('T')[0], action: 'adjust' });
  const [processingExit, setProcessingExit] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    adharNo: "",
    adharImg: "",
    document: "",
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

      const [locationsRes, tenantsRes, roomsRes, paymentsRes, buildingsRes] =
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
          axios.get(
            `${BACKEND_URL}/api/buildings/property/${locationId}`,
            config,
          ),
        ]);

      const loc = locationsRes.data.find((l) => l._id === locationId);
      setLocation(loc);
      setTenants(tenantsRes.data);
      setRooms(roomsRes.data);
      setPayments(paymentsRes.data);
      setBuildings(buildingsRes.data);
      // Set first building as default if buildings exist
      if (buildingsRes.data.length > 0) {
        setSelectedBuildingId(buildingsRes.data[0]._id);
      }
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
    } else if (name === "buildingId") {
      setSelectedFormBuildingId(value);
      setFormData({
        ...formData,
        roomId: "",
        bedNumber: "",
        rentAmount: "",
        advanceAmount: "",
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

  const handleDocumentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocumentFile(file);
    }
  };

  const handleEdit = (tenant) => {
    const tenantRoomId = tenant.roomId?._id || tenant.roomId || "";
    const tenantRoom = rooms.find((r) => r._id === tenantRoomId);
    const tenantBuildingId =
      tenantRoom?.buildingId?._id || tenantRoom?.buildingId || "";
    setEditingTenant(tenant);
    setAadharFile(null);
    setDocumentFile(null);
    setAadharPreview(null);
    setSelectedFormBuildingId(tenantBuildingId);
    setFormData({
      name: tenant.name,
      mobile: tenant.mobile,
      email: tenant.email || "",
      adharNo: tenant.adharNo || "",
      adharImg: tenant.adharImg || "",
      document: tenant.document || tenant.photo || "",
      dob: tenant.dob ? new Date(tenant.dob).toISOString().split("T")[0] : "",
      gender: tenant.gender || "",
      roomId: tenantRoomId,
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
      let documentUrl = formData.document;

      if (aadharFile) {
        aadharUrl = await handleFileUpload(aadharFile, "aadhar", formData.name);
      }

      if (documentFile) {
        documentUrl = await handleFileUpload(
          documentFile,
          "document",
          formData.name,
        );
      }

      const tenantData = {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email || undefined,
        adharNo: formData.adharNo || undefined,
        adharImg: aadharUrl || undefined,
        document: documentUrl || undefined,
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

  const handleMarkAsLeft = (tenant) => {
    setExitForm({ leaveDate: new Date().toISOString().split('T')[0], action: 'adjust' });
    setExitModal({ open: true, tenant });
  };

  const handleExitConfirm = async () => {
    const { tenant } = exitModal;
    if (!tenant) return;
    const userId = user?.id || user?._id;
    try {
      setProcessingExit(true);
      const advLeft = tenant.advanceLeft || 0;
      const leaveDate = exitForm.leaveDate;

      // Mark tenant as COMPLETED, zero advance balance
      await axios.patch(
        `${BACKEND_URL}/api/tenants/${tenant._id}`,
        { userId, status: "COMPLETED", leaveDate, advanceLeft: 0 },
        { withCredentials: true },
      );

      if (advLeft > 0) {
        const paymentsRes = await axios.get(`${BACKEND_URL}/api/payments/tenant/${tenant._id}`, { withCredentials: true });

        if (exitForm.action === 'adjust') {
          const now = new Date();
          const nextMonth = now.getMonth() + 2;
          const nextYear = nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
          const safeMonth = nextMonth > 12 ? 1 : nextMonth;
          const nextMonthPayment = paymentsRes.data.find(p => p.month === safeMonth && p.year === nextYear);
          if (nextMonthPayment && nextMonthPayment.status !== 'PAID') {
            const newAmtPaid = Math.min(nextMonthPayment.rentAmount, (nextMonthPayment.amountPaid || 0) + advLeft);
            const newStatus = newAmtPaid >= nextMonthPayment.rentAmount ? 'PAID' : 'PARTIAL';
            const settlementNote = `Advance ₹${advLeft.toLocaleString()} adjusted against rent on tenant exit (${new Date(leaveDate).toLocaleDateString('en-GB')}).`;
            await axios.patch(`${BACKEND_URL}/api/payments/${nextMonthPayment._id}`,
              { userId, amountPaid: newAmtPaid, advanceUsed: advLeft, paymentDate: leaveDate, status: newStatus, notes: settlementNote },
              { withCredentials: true }
            );
          }
        } else {
          // Refund — add note to most recent pending payment
          const pendingPayment = paymentsRes.data
            .filter(p => p.status !== 'PAID')
            .sort((a, b) => b.year - a.year || b.month - a.month)[0];
          if (pendingPayment) {
            const refundNote = `Advance ₹${advLeft.toLocaleString()} refunded to tenant in cash on exit (${new Date(leaveDate).toLocaleDateString('en-GB')}).`;
            await axios.patch(`${BACKEND_URL}/api/payments/${pendingPayment._id}`,
              { userId, notes: refundNote },
              { withCredentials: true }
            );
          }
        }
      }

      const actionMsg = advLeft > 0
        ? exitForm.action === 'adjust'
          ? ` Advance ₹${advLeft.toLocaleString()} adjusted against next month.`
          : ` Refund ₹${advLeft.toLocaleString()} to tenant in cash.`
        : '';
      toast.success(`${tenant.name} marked as left.${actionMsg}`);
      setExitModal({ open: false, tenant: null });
      fetchData();
    } catch (error) {
      console.error("Error updating tenant:", error);
      toast.error(error.response?.data?.message || "Error updating tenant status");
    } finally {
      setProcessingExit(false);
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
    setDocumentFile(null);
    setAadharPreview(null);
    setShowAdditionalDetails(false);
    setSelectedFormBuildingId("");
    setFormData({
      name: "",
      mobile: "",
      email: "",
      adharNo: "",
      adharImg: "",
      document: "",
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

  const handleAddTenant = (room) => {
    const buildingId = room.buildingId?._id || room.buildingId || "";
    const rent = room.rentAmount || "";
    const advanceAmount = rent ? rent * 2 : "";
    
    setSelectedFormBuildingId(buildingId);
    setFormData({
      name: "",
      mobile: "",
      email: "",
      adharNo: "",
      adharImg: "",
      document: "",
      dob: "",
      gender: "",
      roomId: room._id,
      bedNumber: "",
      rentAmount: rent,
      advanceAmount: advanceAmount,
      joiningDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setShowForm(true);
  };

  const activeTenants = tenants.filter((t) => t.status === "ACTIVE").length;
  const totalRooms = rooms.length;
  const totalBeds = rooms.reduce(
    (acc, r) => acc + (r.rentType === "PER_BED" ? r.beds?.length || 0 : 0),
    0,
  );
  const occupiedBeds = rooms.reduce((acc, r) => {
    if (r.rentType === "PER_BED") {
      return acc + (r.beds?.filter((b) => b.status === "OCCUPIED").length || 0);
    }
    return acc;
  }, 0);
  const pendingPayments = payments
    .filter((p) => p.status !== "PAID")
    .reduce((acc, p) => acc + (p.rentAmount - p.amountPaid), 0);

  const selectedRoom = rooms.find((r) => r._id === formData.roomId);
  const availableBeds =
    selectedRoom?.beds?.filter((b) => b.status === "AVAILABLE") || [];
  const hasBuildings = buildings.length > 0;
  const roomsWithoutBuilding = rooms.filter((room) => !room.buildingId);
  const formRooms = rooms.filter((room) => {
    if (!hasBuildings) return true;
    if (!selectedFormBuildingId) return false;
    if (selectedFormBuildingId === "no-building") {
      return !room.buildingId;
    }
    const roomBuildingId = room.buildingId?._id || room.buildingId;
    return roomBuildingId === selectedFormBuildingId;
  });

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

  // Filter rooms based on search and building
  const filteredRooms = rooms.filter((room) => {
    // Filter by building first
    if (selectedBuildingId) {
      if (selectedBuildingId === 'no-building') {
        // Show only rooms without a building
        if (room.buildingId) return false;
      } else {
        // Show only rooms in selected building
        const roomBuildingId = room.buildingId?._id || room.buildingId;
        if (roomBuildingId !== selectedBuildingId) return false;
      }
    }

    const roomTenants = getTenantsForRoom(room._id);
    if (searchTerm) {
      const search = searchTerm.toLowerCase().trim();
      // Search in tenant names/mobiles
      const matchesTenant = roomTenants.some(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          t.mobile.includes(search),
      );
      // Search by room number
      const matchesRoomNumber = room.roomNumber?.toString().includes(search);
      // Search by rent amount
      const matchesRent = room.rentAmount?.toString().includes(search);
      return matchesTenant || matchesRoomNumber || matchesRent;
    }
    return true; // Show all rooms including empty ones
  });

  const sortedRooms = [...filteredRooms].sort((a, b) => {
    const aNum = Number(a.roomNumber);
    const bNum = Number(b.roomNumber);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
    return String(a.roomNumber).localeCompare(String(b.roomNumber));
  });
  const overviewRooms = [...rooms].sort((a, b) => {
    const aNum = Number(a.roomNumber);
    const bNum = Number(b.roomNumber);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
    return String(a.roomNumber).localeCompare(String(b.roomNumber));
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-1 pt-1 pb-1.5 sm:p-4">
      <div className="w-full sm:max-w-7xl mx-auto space-y-1.5 sm:space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-2 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            {location.image ? (
              <img
                src={`${BACKEND_URL}${location.image}`}
                alt={location.propertyName || location.name || "Property"}
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-md object-cover"
              />
            ) : (
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold">
                {String(location.propertyName || location.name || "P").charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="text-sm sm:text-2xl font-black text-gray-800">
              {location.propertyName || location.name}{" "}
              <span className="text-gray-400 font-bold">-</span>{" "}
              <span className="font-bold text-gray-500">{location.location}</span>
            </h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-1 sm:gap-4">
          <button
            type="button"
            onClick={() => setShowRoomsGrid(true)}
            className="bg-white rounded-md sm:rounded-2xl shadow-sm border border-blue-500 p-1.5 sm:p-5 transform hover:scale-105 transition-transform text-left"
          >
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
          </button>

          <button
            type="button"
            onClick={() => setShowBedsGrid(true)}
            className="bg-white rounded-md sm:rounded-2xl shadow-sm border border-purple-500 p-1.5 sm:p-5 transform hover:scale-105 transition-transform text-left"
          >
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
          </button>

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
                placeholder="Search name, room, rent..."
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

        <TenantFormModal
          show={showForm}
          editingTenant={editingTenant}
          location={location}
          handleCancel={handleCancel}
          handleSubmit={handleSubmit}
          formData={formData}
          handleChange={handleChange}
          hasBuildings={hasBuildings}
          buildings={buildings}
          roomsWithoutBuilding={roomsWithoutBuilding}
          selectedFormBuildingId={selectedFormBuildingId}
          formRooms={formRooms}
          selectedRoom={selectedRoom}
          uploading={uploading}
          showAdditionalDetails={showAdditionalDetails}
          setShowAdditionalDetails={setShowAdditionalDetails}
          handleAadharChange={handleAadharChange}
          handleDocumentChange={handleDocumentChange}
          aadharPreview={aadharPreview}
          documentFile={documentFile}
          BACKEND_URL={BACKEND_URL}
        />

        {showRoomsGrid && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={() => setShowRoomsGrid(false)}
          >
            <div
              className="bg-white rounded-lg sm:rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gray-800 text-white p-3 sm:p-4 flex items-center justify-between">
                <div className="text-sm sm:text-lg font-bold">Rooms Overview</div>
                <button
                  onClick={() => setShowRoomsGrid(false)}
                  className="text-gray-300 hover:text-white transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-2 sm:p-4 overflow-y-auto max-h-[80vh] space-y-3 sm:space-y-4">
                {(() => {
                  const renderRoomGrid = (roomsList) => (
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1.5 sm:gap-2">
                      {roomsList.map((room) => {
                        const totalBedsInRoom = room.beds?.length || 1;
                        const occupiedBedsInRoom = room.rentType === "PER_BED"
                          ? (room.beds?.filter((b) => b.status === "OCCUPIED").length || 0)
                          : room.status === "OCCUPIED"
                            ? 1
                            : 0;
                        const isFull = room.rentType === "PER_BED"
                          ? occupiedBedsInRoom >= totalBedsInRoom
                          : room.status === "OCCUPIED";
                        const isEmpty = room.rentType === "PER_BED"
                          ? occupiedBedsInRoom === 0
                          : room.status === "AVAILABLE";
                        const statusLabel = room.rentType === "PER_BED"
                          ? `${occupiedBedsInRoom}/${totalBedsInRoom}`
                          : isFull
                            ? "Full"
                            : "Empty";
                        return (
                          <div
                            key={room._id}
                            className={`rounded-md sm:rounded-lg border p-1.5 sm:p-2 text-center ${
                              isFull
                                ? "bg-red-50 border-red-200 text-red-700"
                                : isEmpty
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                  : "bg-yellow-50 border-yellow-200 text-yellow-700"
                            }`}
                          >
                            <div className="text-[10px] sm:text-xs font-bold">Room {room.roomNumber}</div>
                            <div className="text-[9px] sm:text-[11px] font-semibold mt-0.5">{statusLabel}</div>
                          </div>
                        );
                      })}
                    </div>
                  );

                  const sortedBuildings = [...buildings].sort((a, b) =>
                    (a.name || "").localeCompare(b.name || "", "en", {
                      numeric: true,
                      sensitivity: "base",
                    }),
                  );

                  if (sortedBuildings.length === 0) {
                    return renderRoomGrid(overviewRooms);
                  }

                  return (
                    <>
                      {sortedBuildings.map((building) => {
                        const buildingRooms = overviewRooms.filter((room) => {
                          const roomBuildingId = room.buildingId?._id || room.buildingId;
                          return roomBuildingId === building._id;
                        });
                        return (
                          <div key={building._id} className="space-y-2">
                            <div className="text-xs sm:text-sm font-bold text-gray-700">
                              {building.name || building.buildingName || "Building"}
                            </div>
                            {buildingRooms.length > 0 ? (
                              renderRoomGrid(buildingRooms)
                            ) : (
                              <div className="text-[11px] text-gray-400">No rooms</div>
                            )}
                          </div>
                        );
                      })}

                      {overviewRooms.some((room) => !room.buildingId) && (
                        <div className="space-y-2">
                          <div className="text-xs sm:text-sm font-bold text-gray-700">No Building</div>
                          {renderRoomGrid(overviewRooms.filter((room) => !room.buildingId))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {showBedsGrid && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={() => setShowBedsGrid(false)}
          >
            <div
              className="bg-white rounded-lg sm:rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gray-800 text-white p-3 sm:p-4 flex items-center justify-between">
                <div className="text-sm sm:text-lg font-bold">Beds Overview</div>
                <button
                  onClick={() => setShowBedsGrid(false)}
                  className="text-gray-300 hover:text-white transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-2 sm:p-4 overflow-y-auto max-h-[80vh] space-y-3 sm:space-y-4">
                {(() => {
                  const perBedRooms = overviewRooms.filter((r) => r.rentType === "PER_BED");
                  const renderRoomBeds = (roomsList) => (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                      {roomsList.map((room) => {
                        const occupiedCount =
                          room.beds?.filter((b) => b.status === "OCCUPIED").length || 0;
                        const totalCount = room.beds?.length || 0;
                        const isFull = totalCount > 0 && occupiedCount === totalCount;
                        return (
                          <div
                            key={room._id}
                            className={`rounded-lg sm:rounded-xl border p-2.5 sm:p-3 shadow-sm ${
                              isFull
                                ? "bg-gradient-to-br from-red-50 via-white to-red-50 border-red-200"
                                : occupiedCount === 0
                                  ? "bg-gradient-to-br from-emerald-50 via-white to-emerald-50 border-emerald-200"
                                  : "bg-gradient-to-br from-amber-50 via-white to-amber-50 border-amber-200"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs sm:text-sm font-black text-gray-800">
                                Room {room.roomNumber}
                              </div>
                              <div className="text-[10px] sm:text-xs font-bold text-gray-600 bg-white/80 border border-gray-200 rounded-full px-2 py-0.5">
                                {occupiedCount}/{totalCount} beds
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {(room.beds || []).map((bed) => (
                                <div
                                  key={bed.bedNumber}
                                  className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold border ${
                                    bed.status === "OCCUPIED"
                                      ? "bg-red-100 border-red-200 text-red-700"
                                      : "bg-emerald-100 border-emerald-200 text-emerald-700"
                                  }`}
                                >
                                  Bed {bed.bedNumber}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );

                  const sortedBuildings = [...buildings].sort((a, b) =>
                    (a.name || "").localeCompare(b.name || "", "en", {
                      numeric: true,
                      sensitivity: "base",
                    }),
                  );

                  if (sortedBuildings.length === 0) {
                    return perBedRooms.length > 0
                      ? renderRoomBeds(perBedRooms)
                      : <div className="text-sm text-gray-500">No bed-system rooms</div>;
                  }

                  return (
                    <>
                      {sortedBuildings.map((building) => {
                        const buildingRooms = perBedRooms.filter((room) => {
                          const roomBuildingId = room.buildingId?._id || room.buildingId;
                          return roomBuildingId === building._id;
                        });
                        return (
                          <div key={building._id} className="space-y-2">
                            <div className="text-xs sm:text-sm font-bold text-gray-700">
                              {building.name || building.buildingName || "Building"}
                            </div>
                            {buildingRooms.length > 0 ? (
                              renderRoomBeds(buildingRooms)
                            ) : (
                              <div className="text-[11px] text-gray-400">No bed-system rooms</div>
                            )}
                          </div>
                        );
                      })}

                      {perBedRooms.some((room) => !room.buildingId) && (
                        <div className="space-y-2">
                          <div className="text-xs sm:text-sm font-bold text-gray-700">No Building</div>
                          {renderRoomBeds(perBedRooms.filter((room) => !room.buildingId))}
                        </div>
                      )}
                    </>
                  );
                })()}
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

        {/* BUILDING TABS - Only show if property has buildings */}
        {buildings.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1.5">
              {[...buildings]
                .sort((a, b) =>
                  (a.name || "").localeCompare(b.name || "", "en", {
                    numeric: true,
                    sensitivity: "base",
                  }),
                )
                .map((building) => {
                const buildingRoomCount = rooms.filter(
                  r => (r.buildingId?._id || r.buildingId) === building._id
                ).length;
                return (
                  <button
                    key={building._id}
                    onClick={() => setSelectedBuildingId(building._id)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                      selectedBuildingId === building._id
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {building.name} ({buildingRoomCount})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ROOM-WISE DISPLAY */}
        <div className="space-y-2 sm:space-y-5">
          {sortedRooms.map((room) => {
            const roomTenants = getTenantsForRoom(room._id);
            const isPerBed = room.rentType === "PER_BED";
            const isExpanded = !!expandedRooms[room._id];
            const totalBedsInRoom = room.beds?.length || 1;
            const remainingBeds = Math.max(totalBedsInRoom - 1, 0);
            const isEmpty = roomTenants.length === 0;
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
                <div className={`p-2 sm:p-6 ${isEmpty ? "bg-gradient-to-r from-green-700 via-green-800 to-green-900" : "bg-gradient-to-r from-gray-700 via-gray-800 to-black"}`}>
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
                    {isEmpty ? (
                      <div
                        onClick={() => handleAddTenant(room)}
                        className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg sm:rounded-xl border border-emerald-200 p-2 sm:p-3 flex items-center justify-between cursor-pointer hover:bg-emerald-100 transition-colors"
                      >
                        <div className="text-xs sm:text-sm font-bold text-emerald-700">Empty Room</div>
                        <div className="w-6 h-6 sm:w-7 sm:h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                      </div>
                    ) : visibleTenants.map((tenant, index) => {
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
                              <div className="flex-shrink-0 h-9 w-9 sm:h-14 sm:w-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg sm:rounded-2xl flex items-center justify-center text-white font-black text-base sm:text-2xl shadow-sm">
                                {tenant.name.charAt(0).toUpperCase()}
                              </div>
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
                                   <div className="flex items-center gap-2 sm:gap-1" onClick={(e) => e.stopPropagation()}>
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

        {filteredRooms.length === 0 && !searchTerm && (
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

      {/* Exit Settlement Modal */}
      {exitModal.open && exitModal.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">Tenant Exit Settlement</h2>
                <p className="text-xs text-gray-500">{exitModal.tenant.name} — settle advance &amp; set leave date</p>
              </div>
              <button type="button" onClick={() => setExitModal({ open: false, tenant: null })}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              {(exitModal.tenant.advanceLeft || 0) > 0 ? (
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-800">💰 Advance Balance</span>
                    <span className="text-lg font-black text-blue-700">₹{exitModal.tenant.advanceLeft.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">This needs to be settled on exit.</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-center text-sm text-gray-500">
                  No advance balance to settle.
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Leave Date</label>
                <input type="date" value={exitForm.leaveDate}
                  onChange={(e) => setExitForm(prev => ({ ...prev, leaveDate: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
              </div>
              {(exitModal.tenant.advanceLeft || 0) > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Advance Settlement</label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:border-blue-300 transition">
                      <input type="radio" name="exitAction" value="adjust"
                        checked={exitForm.action === 'adjust'}
                        onChange={() => setExitForm(prev => ({ ...prev, action: 'adjust' }))}
                        className="mt-0.5 accent-blue-600" />
                      <div>
                        <div className="text-sm font-semibold text-gray-800">Adjust against next month&apos;s rent</div>
                        <div className="text-xs text-gray-500">₹{exitModal.tenant.advanceLeft.toLocaleString()} applied toward next month payment</div>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:border-green-300 transition">
                      <input type="radio" name="exitAction" value="refund"
                        checked={exitForm.action === 'refund'}
                        onChange={() => setExitForm(prev => ({ ...prev, action: 'refund' }))}
                        className="mt-0.5 accent-green-600" />
                      <div>
                        <div className="text-sm font-semibold text-gray-800">Cash Refund to Tenant</div>
                        <div className="text-xs text-gray-500">Manually refund ₹{exitModal.tenant.advanceLeft.toLocaleString()} in cash</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
              <div className="bg-red-50 rounded-xl p-3 border border-red-200 text-xs text-red-700">
                <strong>Note:</strong> This will mark the tenant as <strong>Left</strong> and stop automated payment generation.
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setExitModal({ open: false, tenant: null })}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="button" onClick={handleExitConfirm} disabled={processingExit}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70 transition">
                  {processingExit ? 'Processing...' : 'Confirm Exit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertyDetail;
