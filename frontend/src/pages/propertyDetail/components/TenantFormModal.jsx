import { useRef } from "react";

function TenantFormModal({
  show,
  editingTenant,
  location,
  handleCancel,
  handleSubmit,
  formData,
  handleChange,
  hasBuildings,
  buildings,
  roomsWithoutBuilding,
  selectedFormBuildingId,
  formRooms,
  selectedRoom,
  uploading,
  showAdditionalDetails,
  setShowAdditionalDetails,
  handleAadharChange,
  handlePhotoChange,
  aadharPreview,
  photoPreview,
  BACKEND_URL,
}) {
  const formRef = useRef(null);

  if (!show) return null;

  return (
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
          ref={formRef}
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
              {hasBuildings && (
                <div className="col-span-2">
                  <label className="block text-[10px] sm:text-sm font-semibold text-gray-700 mb-0.5 sm:mb-1">
                    Building <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="buildingId"
                    value={selectedFormBuildingId}
                    onChange={handleChange}
                    required
                    className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                  >
                    <option value="">Select Building</option>
                    {buildings.map((building) => (
                      <option key={building._id} value={building._id}>
                        {building.name || building.buildingName || "Building"}
                      </option>
                    ))}
                    {roomsWithoutBuilding.length > 0 && (
                      <option value="no-building">No Building</option>
                    )}
                  </select>
                </div>
              )}

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
                  disabled={hasBuildings && !selectedFormBuildingId}
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800"
                >
                  <option value="">
                    {hasBuildings && !selectedFormBuildingId
                      ? "Select Building First"
                      : "Select Room"}
                  </option>
                  {[...formRooms]
                    .sort((a, b) => {
                      const aNum = Number(a.roomNumber);
                      const bNum = Number(b.roomNumber);
                      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
                      return String(a.roomNumber).localeCompare(String(b.roomNumber));
                    })
                    .map((room) => {
                    const availableCount =
                      room.rentType === "PER_BED"
                        ? room.beds?.filter((b) => b.status === "AVAILABLE")
                            .length || 0
                        : room.status === "AVAILABLE"
                          ? 1
                          : 0;
                    const isAvailable =
                      availableCount > 0 ||
                      (editingTenant && editingTenant.roomId?._id === room._id);
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
              onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
              className="w-full p-2 sm:p-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-xs sm:text-base font-bold text-gray-800">
                Additional Details
              </span>
              <svg
                className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 transition-transform ${
                  showAdditionalDetails ? "rotate-180" : ""
                }`}
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
              formRef.current?.requestSubmit();
            }}
            disabled={uploading}
            className={`px-3 sm:px-6 py-1.5 sm:py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 font-semibold flex items-center gap-2 text-xs sm:text-sm ${
              uploading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {uploading ? "Uploading..." : editingTenant ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TenantFormModal;
