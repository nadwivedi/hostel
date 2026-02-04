const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  view: { type: Boolean, default: false },
  add: { type: Boolean, default: false },
  edit: { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
}, { _id: false });

const employeeSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    mobile: {
      type: String,
      trim: true,
      sparse: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 4,
    },
    fullName: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedProperties: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
    }],
    permissions: {
      tenants: { type: permissionSchema, default: () => ({}) },
      rooms: { type: permissionSchema, default: () => ({}) },
      payments: { type: permissionSchema, default: () => ({}) },
      properties: { type: permissionSchema, default: () => ({}) },
      buildings: { type: permissionSchema, default: () => ({}) },
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for email within an owner
employeeSchema.index({ ownerId: 1, email: 1 }, { unique: true, sparse: true });
// Compound unique index for mobile within an owner
employeeSchema.index({ ownerId: 1, mobile: 1 }, { unique: true, sparse: true });

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;
