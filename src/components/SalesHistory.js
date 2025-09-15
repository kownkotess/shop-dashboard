// src/components/SalesHistory.js
import React, { useEffect, useState } from "react";
import { subscribeSales, getSaleLineItems } from "../lib/firestore";

function toDate(s) {
  if (!s) return null;
  if (s.toDate) return s.toDate();
  return new Date(s);
}

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [lineItems, setLineItems] = useState([]);

  useEffect(() => {
    const unsub = subscribeSales(items => setSales(items));
    return () => unsub && unsub();
  }, []);

  async function openSale(sale) {
    setSelectedSale(sale);
    try {
      const items = await getSaleLineItems(sale.id);
      setLineItems(items);
    } catch (err) {
      console.error("Error loading line items", err);
      setLineItems([]);
    }
  }

  return (
    <div>
      <h2>Sales History</h2>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1, border: "1px solid #ddd", padding: 12, borderRadius: 6, maxHeight: "60vh", overflowY: "auto" }}>
          <h4 style={{ marginTop: 0 }}>Recent Sales</h4>
          {sales.length === 0 ? <p>No sales yet.</p> : (
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {sales.map(s => (
                <li key={s.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{s.customer || "Customer"}</strong><br/>
                      <small>{toDate(s.createdAt)?.toLocaleString()}</small>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div>RM {Number(s.total || 0).toFixed(2)}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>{s.paymentType || "Cash"}</div>
                      <button onClick={() => openSale(s)} style={{ marginTop: 6 }}>Open</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ width: 420, border: "1px solid #ddd", padding: 12, borderRadius: 6, maxHeight: "60vh", overflowY: "auto" }}>
          <h4 style={{ marginTop: 0 }}>Sale details</h4>
          {!selectedSale ? <div>Select a sale to see line items</div> : (
            <div>
              <div><strong>{selectedSale.customer}</strong></div>
              <div style={{ fontSize: 12, color: "#666" }}>{toDate(selectedSale.createdAt)?.toLocaleString()}</div>
              <div style={{ marginTop: 8 }}><strong>Total: RM {Number(selectedSale.total || 0).toFixed(2)}</strong></div>

              <div style={{ marginTop: 10 }}>
                <h5>Line Items</h5>
                {lineItems.length === 0 ? <div>No line items (or loading)...</div> : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr><th style={{ textAlign:"left", padding:6 }}>Product</th><th style={{ textAlign:"right", padding:6 }}>Qty</th><th style={{ textAlign:"right", padding:6 }}>Subtotal</th></tr>
                    </thead>
                    <tbody>
                      {lineItems.map(li => (
                        <tr key={li.id}>
                          <td style={{ padding:6 }}>{li.productName}</td>
                          <td style={{ padding:6, textAlign: "right" }}>{li.quantity ?? li.totalUnits ?? "-"}</td>
                          <td style={{ padding:6, textAlign: "right" }}>RM {Number(li.subtotal || (li.unitPrice * (li.quantity||0)) || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
