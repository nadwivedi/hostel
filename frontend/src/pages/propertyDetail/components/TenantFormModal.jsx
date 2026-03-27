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
  handleDocumentChange,
  aadharPreview,
  documentFile,
  BACKEND_URL,
}) {
  const formRef = useRef(null);

  const inputClassName =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500";
  const labelClassName =
    "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700 md:text-sm";
  const sectionTitleClassName =
    "mb-3 flex items-center gap-2 text-base font-bold text-gray-800 md:mb-4 md:text-lg";

  if (!show) return null;

  const documentUrl = formData.document;
  const documentName = documentFile?.name || (documentUrl ? documentUrl.split("/").pop() : "");
  const isPdfDocument = documentName.toLowerCase().endsWith(".pdf");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-4">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl md:rounded-2xl">
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 p-3 text-white md:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold md:text-2xl">
                {editingTenant ? "Edit Tenant" : "Add New Tenant"}
              </h2>
              <p className="mt-1 text-xs text-blue-100 md:text-sm">
                {location.propertyName || location.location}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="rounded-lg p-1.5 text-white transition hover:bg-white/20 md:p-2"
            >
              <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-3 md:space-y-6 md:p-6">
            <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 md:p-6">
              <h3 className={sectionTitleClassName}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white md:h-8 md:w-8 md:text-sm">1</span>
                Personal Information
              </h3>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label className={labelClassName}>Name <span className="text-red-500">*</span></label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputClassName} placeholder="Full name" />
                </div>
                <div>
                  <label className={labelClassName}>Mobile <span className="text-red-500">*</span></label>
                  <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} required maxLength="10" inputMode="numeric" className={`${inputClassName} font-semibold`} placeholder="Mobile" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-green-50 to-emerald-50 p-3 md:p-6">
              <h3 className={sectionTitleClassName}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white md:h-8 md:w-8 md:text-sm">2</span>
                Room Assignment
              </h3>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                {hasBuildings && (
                  <div>
                    <label className={labelClassName}>Building <span className="text-red-500">*</span></label>
                    <select name="buildingId" value={selectedFormBuildingId} onChange={handleChange} required className={inputClassName}>
                      <option value="">Select Building</option>
                      {buildings.map((building) => (
                        <option key={building._id} value={building._id}>
                          {building.name || building.buildingName || "Building"}
                        </option>
                      ))}
                      {roomsWithoutBuilding.length > 0 && <option value="no-building">No Building</option>}
                    </select>
                  </div>
                )}

                <div className={hasBuildings ? "" : "md:col-span-2"}>
                  <label className={labelClassName}>Room <span className="text-red-500">*</span></label>
                  <select name="roomId" value={formData.roomId} onChange={handleChange} required disabled={hasBuildings && !selectedFormBuildingId} className={inputClassName}>
                    <option value="">{hasBuildings && !selectedFormBuildingId ? "Select Building First" : "Select Room"}</option>
                    {[...formRooms]
                      .sort((a, b) => {
                        const aNum = Number(a.roomNumber);
                        const bNum = Number(b.roomNumber);
                        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
                          return aNum - bNum;
                        }
                        return String(a.roomNumber).localeCompare(String(b.roomNumber));
                      })
                      .map((room) => {
                        const availableCount = room.rentType === "PER_BED"
                          ? room.beds?.filter((b) => b.status === "AVAILABLE").length || 0
                          : room.status === "AVAILABLE" ? 1 : 0;
                        const isAvailable = availableCount > 0 || (editingTenant && editingTenant.roomId?._id === room._id);

                        return (
                          <option key={room._id} value={room._id} disabled={!isAvailable}>
                            {`Room ${room.roomNumber} - Rs. ${room.rentAmount}${room.rentType === "PER_BED" ? ` (${availableCount} beds)` : ""}${!isAvailable ? " (Full)" : ""}`}
                          </option>
                        );
                      })}
                  </select>
                </div>

                {selectedRoom?.rentType === "PER_BED" ? (
                  <>
                    <div>
                      <label className={labelClassName}>Bed <span className="text-red-500">*</span></label>
                      <select name="bedNumber" value={formData.bedNumber} onChange={handleChange} required className={inputClassName}>
                        <option value="">Select Bed</option>
                        {selectedRoom.beds?.map((bed) => {
                          const isCurrentBed = editingTenant?.bedNumber === bed.bedNumber;
                          const isAvailable = bed.status === "AVAILABLE" || isCurrentBed;
                          return (
                            <option key={bed.bedNumber} value={bed.bedNumber} disabled={!isAvailable}>
                              {`Bed ${bed.bedNumber}${!isAvailable ? " (Occupied)" : ""}`}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className={labelClassName}>Join Date <span className="text-red-500">*</span></label>
                      <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} required className={inputClassName} />
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2">
                    <label className={labelClassName}>Join Date <span className="text-red-500">*</span></label>
                    <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} required className={inputClassName} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 md:contents">
                  <div>
                    <label className={labelClassName}>Rent (Rs.) <span className="text-red-500">*</span></label>
                    <input type="number" name="rentAmount" value={formData.rentAmount} onChange={handleChange} required min="0" className={`${inputClassName} font-semibold`} placeholder="Monthly rent" />
                  </div>
                  <div>
                    <label className={labelClassName}>Advance (Rs.)</label>
                    <input type="number" name="advanceAmount" value={formData.advanceAmount} onChange={handleChange} min="0" className={`${inputClassName} font-semibold`} placeholder="Deposit" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-3 md:p-6">
              <h3 className={sectionTitleClassName}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white md:h-8 md:w-8 md:text-sm">3</span>
                Documents
              </h3>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className={labelClassName}>Aadhar Card</label>
                  <input type="file" id="aadharUpload" accept="image/*,application/pdf" onChange={handleAadharChange} className="hidden" />
                  <label htmlFor="aadharUpload" className={`flex min-h-32 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all ${aadharPreview || formData.adharImg ? "border-green-400 bg-green-50 p-1" : "cursor-pointer border-purple-300 bg-white p-4 hover:border-purple-400 hover:bg-purple-50"}`}>
                    {aadharPreview ? (
                      <img src={aadharPreview} alt="Aadhar" className="h-24 w-full rounded-lg object-contain" />
                    ) : formData.adharImg ? (
                      <img src={`${BACKEND_URL}${formData.adharImg}`} alt="Aadhar" className="h-24 w-full rounded-lg object-contain" />
                    ) : (
                      <>
                        <svg className="mb-1 h-8 w-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-xs font-semibold text-purple-700">Upload Aadhar</span>
                        <span className="mt-1 text-[11px] text-gray-500">Image or PDF</span>
                      </>
                    )}
                  </label>
                </div>

                <div>
                  <label className={labelClassName}>Agreement / Document</label>
                  <input type="file" id="documentUpload" accept="image/*,application/pdf" onChange={handleDocumentChange} className="hidden" />
                  <label htmlFor="documentUpload" className={`flex min-h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-all ${documentName ? "border-green-400 bg-green-50" : "cursor-pointer border-purple-300 bg-white hover:border-purple-400 hover:bg-purple-50"}`}>
                    <svg className="mb-2 h-8 w-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7V3m10 4V3m-11 8h12M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-center text-xs font-semibold text-purple-700">
                      {documentName ? (isPdfDocument ? "PDF Selected" : "Document Selected") : "Upload Document"}
                    </span>
                    <span className="mt-1 line-clamp-1 text-center text-[11px] text-gray-500">
                      {documentName || "Agreement, ID proof, or other file"}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <button type="button" onClick={() => setShowAdditionalDetails(!showAdditionalDetails)} className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-white/40 md:p-4">
                <span className="flex items-center gap-2 text-base font-bold text-gray-800 md:text-lg">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white md:h-8 md:w-8 md:text-sm">4</span>
                  Additional Details
                </span>
                <svg className={`h-5 w-5 text-amber-700 transition-transform ${showAdditionalDetails ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAdditionalDetails && (
                <div className="border-t border-amber-200 p-3 pt-3 md:p-6">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                    <div>
                      <label className={labelClassName}>DOB</label>
                      <input type="date" name="dob" value={formData.dob} onChange={handleChange} className={inputClassName} />
                    </div>
                    <div>
                      <label className={labelClassName}>Gender</label>
                      <select name="gender" value={formData.gender} onChange={handleChange} className={inputClassName}>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClassName}>Aadhar No.</label>
                      <input type="text" name="adharNo" value={formData.adharNo} onChange={handleChange} maxLength="12" inputMode="numeric" className={`${inputClassName} font-semibold`} placeholder="12-digit" />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClassName}>Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClassName} placeholder="email@example.com" />
                    </div>
                  </div>
                  <div className="mt-3 md:mt-4">
                    <label className={labelClassName}>Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" className={inputClassName} placeholder="Notes..." />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 flex-col items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 p-3 md:flex-row md:p-4">
            <div className="text-xs text-gray-600 md:text-sm">Fill the required tenant details, then submit.</div>
            <div className="flex w-full gap-2 md:w-auto md:gap-3">
              <button type="button" onClick={handleCancel} className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 md:flex-none md:px-6">Cancel</button>
              <button type="submit" onClick={(e) => { e.preventDefault(); formRef.current?.requestSubmit(); }} disabled={uploading} className={`flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:shadow-lg md:flex-none md:px-8 ${uploading ? "cursor-not-allowed opacity-50" : ""}`}>
                {uploading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {editingTenant ? "Update Tenant" : "Add Tenant"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TenantFormModal;
