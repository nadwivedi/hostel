const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    view:   { type: Boolean, default: false },
    add:    { type: Boolean, default: false },
    edit:   { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

const employeeSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      default: null,
    },
    mobile: {
      type: String,
      trim: true,
      sparse: true,
      default: null,
    },
    password: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedProperties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
      },
    ],
    permissions: {
      tenants:    { type: permissionSchema, default: () => ({}) },
      rooms:      { type: permissionSchema, default: () => ({}) },
      payments:   { type: permissionSchema, default: () => ({}) },
      properties: { type: permissionSchema, default: () => ({}) },
      buildings:  { type: permissionSchema, default: () => ({}) },
    },
  },
  { timestamps: true }
);

// Ensure an employee's email/mobile is unique within their owner's scope
// (using sparse index at global level is fine since we validate uniqueness in controller)

const Employee = mongoose.model('Employee', employeeSchema);
module.exports = Employee;
