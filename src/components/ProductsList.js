// src/components/ProductsList.js
import React, { useEffect, useState } from "react";
import { subscribeProducts, deleteProduct, updateProduct } from "../lib/firestore";

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeProducts(items => {
      setProducts(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function onDelete(id) {
    if (!window.confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
    } catch (err) {
      console.error(err);
      alert("Delete failed: " + err.message);
    }
  }

  async function markDiscontinued(id) {
    try {
      await updateProduct(id, { status: "Discontinued" });
    } catch (err) {
      console.error(err);
      alert("Update failed: " + err.message);
    }
  }

  return (
    <div>
      <h3>Products</h3>

      {loading ? (
        <p>Loading…</p>
      ) : products.length === 0 ? (
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
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={{ border: "1px solid #eee", padding: 8 }}>{p.name}</td>
                  <td style={{ border: "1px solid #eee", padding: 8 }}>{p.status || "In Store"}</td>
                  <td style={{ border: "1px solid #eee", padding: 8 }}>{p.supplier || "-"}</td>
                  <td style={{ border: "1px solid #eee", padding: 8 }}>{p.startingStock ?? 0}</td>
                  <td style={{ border: "1px solid #eee", padding: 8 }}>{Number(p.unitPrice || 0).toFixed(2)}</td>
                  <td style={{ border: "1px solid #eee", padding: 8 }}>{p.balance ?? 0}</td>
                  <td style={{ border: "1px solid #eee", padding: 8 }}>{p.reorderPoint ?? "-"}</td>
                  <td style={{ border: "1px solid #eee", padding: 8 }}>
                    <button onClick={() => markDiscontinued(p.id)} style={{ marginRight: 8 }}>Discontinue</button>
                    <button onClick={() => onDelete(p.id)}>Delete</button>
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

