import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryMovement extends Document {
  product: mongoose.Types.ObjectId;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason?: string;
  reference?: string;
  created_by?: mongoose.Types.ObjectId;
}

const inventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['in', 'out', 'adjustment'],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previous_quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    new_quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: String,
    reference: String,
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
inventoryMovementSchema.index({ product: 1, createdAt: -1 });
inventoryMovementSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model<IInventoryMovement>('InventoryMovement', inventoryMovementSchema);


