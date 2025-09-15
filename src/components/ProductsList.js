// src/components/ProductsList.js
import React, { useEffect, useState } from "react";
import { subscribeProducts, updateProduct, deleteProduct } from "../lib/firestore";

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const unsub = subscribeProducts(items => {
      setProducts(items);
      setLoading(false);
    });
    return () => unsub && unsub();
  }, []);

  function startEdit(p) {
    setEditingId(p.id);
    setEditForm({
      name: p.name || p.productName || "",
      startingStock: p.startingStock ?? 0,
      unitPrice: p.unitPrice ?? 0,
      smallBulkQty: p.smallBulkQty ?? 0,
      smallBulkPrice: p.smallBulkPrice ?? 0,
      bigBulkQty: p.bigBulkQty ?? 0,
      bigBulkPrice: p.bigBulkPrice ?? 0,
      reorderPoint: p.reorderPoint ?? 0,
      status: p.status ?? "In Store",
    });
  }

  async function saveEdit() {
    try {
      await updateProduct(editingId, {
        name: editForm.name,
        startingStock: Number(editForm.startingStock || 0),
        unitPrice: Number(editForm.unitPrice || 0),
        smallBulkQty: Number(editForm.smallBulkQty || 0),
        smallBulkPrice: Number(editForm.smallBulkPrice || 0),
        bigBulkQty: Number(editForm.bigBulkQty || 0),
        bigBulkPrice: Number(editForm.bigBulkPrice || 0),
        reorderPoint: Number(editForm.reorderPoint || 0),
        status: editForm.status,
      });
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      console.error("Update failed", err);
      alert("Update failed: " + err.message);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this product?")) return;
    await deleteProduct(id);
  }

  return (
    <div>
      <h2>Products</h2>
      {loading ? <p>Loading…</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ padding: 6 }}>Name</th>
              <th style={{ padding: 6 }}>Stock</th>
              <th style={{ padding: 6 }}>Price</th>
              <th style={{ padding: 6 }}>Reorder</th>
              <th style={{ padding: 6 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: 6 }}>
                  {editingId === p.id ? (
                    <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                  ) : (p.name || p.productName)}
                </td>
                <td style={{ padding: 6, textAlign: "right" }}>
                  {editingId === p.id ? (
                    <input type="number" value={editForm.startingStock} onChange={e => setEditForm({...editForm, startingStock: e.target.value})} style={{ width: 90 }} />
                  ) : Number(p.startingStock ?? p.balance ?? 0)}
                </td>
                <td style={{ padding: 6, textAlign: "right" }}>
                  {editingId === p.id ? (
                    <input type="number" value={editForm.unitPrice} onChange={e => setEditForm({...editForm, unitPrice: e.target.value})} style={{ width: 90 }} />
                  ) : Number(p.unitPrice ?? 0).toFixed(2)}
                </td>
                <td style={{ padding: 6, textAlign: "right" }}>
                  {editingId === p.id ? (
                    <input type="number" value={editForm.reorderPoint} onChange={e => setEditForm({...editForm, reorderPoint: e.target.value})} style={{ width: 80 }} />
                  ) : (p.reorderPoint ?? "-")}
                </td>
                <td style={{ padding: 6 }}>
                  {editingId === p.id ? (
                    <>
                      <button onClick={saveEdit} style={{ marginRight: 6 }}>Save</button>
                      <button onClick={cancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(p)} style={{ marginRight: 6 }}>Edit</button>
                      <button onClick={() => handleDelete(p.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
