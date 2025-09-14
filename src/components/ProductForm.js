// src/components/ProductForm.js
import React, { useState } from "react";
import { addProduct } from "../lib/firestore";

export default function ProductForm() {
  const [form, setForm] = useState({
    name: "",
    status: "In Store",
    supplier: "",
    description: "",
    startingStock: 0,
    unitPrice: 0,
    smallBulkQty: 0,
    smallBulkPrice: 0,
    bigBulkQty: 0,
    bigBulkPrice: 0,
    reorderPoint: 0
  });
  const [loading, setLoading] = useState(false);

  function onChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await addProduct(form);
      setForm({
        name: "",
        status: "In Store",
        supplier: "",
        description: "",
        startingStock: 0,
        unitPrice: 0,
        smallBulkQty: 0,
        smallBulkPrice: 0,
        bigBulkQty: 0,
        bigBulkPrice: 0,
        reorderPoint: 0
      });
      alert("Product added");
    } catch (err) {
      console.error(err);
      alert("Error adding product: " + err.message);
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 480 }}>
      <h3>Add Product</h3>
      <input name="name" placeholder="Product name" value={form.name} onChange={onChange} required />
      <input name="supplier" placeholder="Supplier" value={form.supplier} onChange={onChange} />
      <textarea name="description" placeholder="Description" value={form.description} onChange={onChange} />
      <input name="startingStock" type="number" placeholder="Starting stock" value={form.startingStock} onChange={onChange} />
      <input name="unitPrice" type="number" placeholder="Unit price (RM)" value={form.unitPrice} onChange={onChange} />
      <input name="smallBulkQty" type="number" placeholder="Small bulk qty" value={form.smallBulkQty} onChange={onChange} />
      <input name="smallBulkPrice" type="number" placeholder="Small bulk price" value={form.smallBulkPrice} onChange={onChange} />
      <input name="bigBulkQty" type="number" placeholder="Big bulk qty" value={form.bigBulkQty} onChange={onChange} />
      <input name="bigBulkPrice" type="number" placeholder="Big bulk price" value={form.bigBulkPrice} onChange={onChange} />
      <input name="reorderPoint" type="number" placeholder="Reorder point" value={form.reorderPoint} onChange={onChange} />
      <div style={{ marginTop: 8 }}>
        <button type="submit" disabled={loading}>{loading ? "Saving..." : "Add Product"}</button>
      </div>
    </form>
  );
}
