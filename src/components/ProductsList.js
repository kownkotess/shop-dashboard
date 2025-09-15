// src/components/ProductsList.js
import React, { useEffect, useState } from "react";
import { subscribeProducts, deleteProduct, updateProduct } from "../lib/firestore";

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const unsub = subscribeProducts(items => {
      setProducts(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  function startEdit(p) {
    setEditingId(p.id);
    setEditForm({
      name: p.name || "",
      status: p.status || "In Store",
      supplier: p.supplier || "",
      description: p.description || "",
      startingStock: p.startingStock || 0,
      unitPrice: p.unitPrice || 0,
      smallBulkQty: p.smallBulkQty || 0,
      smallBulkPrice: p.smallBulkPrice || 0,
      bigBulkQty: p.bigBulkQty || 0,
      bigBulkPrice: p.bigBulkPrice || 0,
      reorderPoint: p.reorderPoint || 0
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function saveEdit(id) {
    try {
      // convert numeric fields
      const updates = {
        name: editForm.name,
        status: editForm.status,
        supplier: editForm.supplier,
        description: editForm.description,
        startingStock: Number(editForm.startingStock || 0),
        unitPrice: Number(editForm.unitPrice || 0),
        smallBulkQty: Number(editForm.smallBulkQty || 0),
        smallBulkPrice: Number(editForm.smallBulkPrice || 0),
        bigBulkQty: Number(editForm.bigBulkQty || 0),
        bigBulkPrice: Number(editForm.bigBulkPrice || 0),
        reorderPoint: Number(editForm.reorderPoint || 0)
      };
      await updateProduct(id, updates);
      cancelEdit();
    } catch (err) {
      console.error(err);
      alert("Save failed: " + err.message);
    }
  }

  async function onDelete(id) {
    if (!window.confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
    } catch (err) {
      console.error(err);
      alert("Delete failed: " + err.message);
    }
  }

  const filtered = products.filter(p => {
    const matchText = (p.name || "").toLowerCase().includes(filterText.toLowerCase());
    const matchStatus = statusFilter === "All" ? true : (p.status || "In Store") === statusFilter;
    return matchText && matchStatus;
  });

  return (
    <div>
      <h3>Products</h3>

      <div style={{ marginBottom: 12 }}>
        <input placeholder="Search by name..." value={filterText} onChange={e => setFilterText(e.target.value)} style={{ marginRight: 8 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="All">All status</option>
          <option value="In Store">In Store</option>
          <option value="In Transit (Some)">In Transit (Some)</option>
          <option value="In Transit (All)">In Transit (All)</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Finished">Finished</option>
          <option value="Discontinued">Discontinued</option>
          <option value="Error">Error</option>
        </select>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : filtered.length === 0 ? (
        <p>No products yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Name</th>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Status</th>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Supplier</th>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Stock</th>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Price (RM)</th>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Balance</th>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Reorder</th>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td style={{ border: "1px solid #eee", padding: 8, verticalAlign: "top" }}>
                    {editingId === p.id ? (
                      <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                    ) : p.name}
                  </td>

                  <td style={{ border: "1px solid #eee", padding: 8 }}>
                    {editingId === p.id ? (
                      <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                        <option>In Store</option>
                        <option>In Transit (Some)</option>
                        <option>In Transit (All)</option>
                        <option>Low Stock</option>
                        <option>Finished</option>
                        <option>Discontinued</option>
                        <option>Error</option>
                      </select>
                    ) : (p.status || "In Store")}
                  </td>

                  <td style={{ border: "1px solid #eee", padding: 8 }}>
                    {editingId === p.id ? (
                      <input value={editForm.supplier} onChange={e => setEditForm({...editForm, supplier: e.target.value})} />
                    ) : (p.supplier || "-")}
                  </td>

                  <td style={{ border: "1px solid #eee", padding: 8 }}>
                    {editingId === p.id ? (
                      <input type="number" value={editForm.startingStock} onChange={e => setEditForm({...editForm, startingStock: e.target.value})} style={{ width: 80 }} />
                    ) : (p.startingStock ?? 0)}
                  </td>

                  <td style={{ border: "1px solid #eee", padding: 8 }}>
                    {editingId === p.id ? (
                      <input type="number" value={editForm.unitPrice} onChange={e => setEditForm({...editForm, unitPrice: e.target.value})} style={{ width: 90 }} />
                    ) : Number(p.unitPrice || 0).toFixed(2)}
                  </td>

                  <td style={{ border: "1px solid #eee", padding: 8 }}>{p.balance ?? 0}</td>
                  <td style={{ border: "1px solid #eee", padding: 8 }}>{p.reorderPoint ?? "-"}</td>

                  <td style={{ border: "1px solid #eee", padding: 8 }}>
                    {editingId === p.id ? (
                      <>
                        <button onClick={() => saveEdit(p.id)} style={{ marginRight: 8 }}>Save</button>
                        <button onClick={cancelEdit}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(p)} style={{ marginRight: 6 }}>Edit</button>
                        <button onClick={() => onDelete(p.id)} style={{ marginRight: 6 }}>Delete</button>
                        <button onClick={() => updateProduct(p.id, { status: "Discontinued" })}>Discontinue</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
