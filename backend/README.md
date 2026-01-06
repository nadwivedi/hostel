# Hostel Management Backend

Backend API for the Hostel Management System built with Node.js, Express, and MongoDB.

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the backend directory (already created):
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hostel
```

### 3. Make sure MongoDB is running
Make sure you have MongoDB installed and running on your system.

For Windows:
```bash
# Start MongoDB service
net start MongoDB
```

For Mac/Linux:
```bash
# Start MongoDB service
sudo systemctl start mongod
```

Or use MongoDB Atlas (cloud):
- Create a free cluster at https://www.mongodb.com/cloud/atlas
- Get your connection string
- Update MONGODB_URI in .env file

### 4. Start the Server
```bash
npm start
```

The server will start on http://localhost:3000

## Project Structure

```
backend/
├── config/
│   └── mongodb.js          # MongoDB connection
├── controllers/
│   ├── tenantController.js
│   ├── roomController.js
│   ├── occupancyController.js
│   └── paymentController.js
├── models/
│   ├── Tenant.js
│   ├── Room.js
│   ├── Occupancy.js
│   └── Payment.js
├── routes/
│   ├── tenantRoutes.js
│   ├── roomRoutes.js
│   ├── occupancyRoutes.js
│   └── paymentRoutes.js
├── index.js                # Main server file
└── .env                    # Environment variables
```

## API Endpoints

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API documentation.

### Quick Reference:
- **Tenants**: `/api/tenants`
- **Rooms**: `/api/rooms`
- **Occupancies**: `/api/occupancies`
- **Payments**: `/api/payments`

## Testing the API

You can test the API using:
1. **Frontend Application** (already created in ../frontend)
2. **Postman** or **Thunder Client**
3. **cURL** commands

### Example cURL:
```bash
# Get all tenants
curl http://localhost:3000/api/tenants

# Create a tenant
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","mobile":"9876543210"}'
```

## Features

- Complete CRUD operations for Tenants, Rooms, Occupancies, and Payments
- Automatic room/bed status updates when creating/ending occupancies
- Support for both private rooms (PER_ROOM) and shared rooms (PER_BED)
- Payment tracking with PENDING/PARTIAL/PAID status
- Query filtering for status, month, year
- Population of related documents (tenant, room data in occupancies and payments)

## Database Schema

### Tenant
- name, mobile (required)
- email, adharNo, adharImg, photo, dob, gender (optional)

### Room
- roomNumber, floor, roomType, rentType, rentAmount, capacity (required)
- beds array (for shared rooms)
- amenities, notes (optional)

### Occupancy
- tenantId, roomId, rentAmount, joinDate (required)
- bedId (for shared rooms)
- advanceAmount, leaveDate, status, notes (optional)

### Payment
- occupancyId, tenantId, month, year, rentAmount (required)
- amountPaid, paymentDate, status (auto-calculated)
