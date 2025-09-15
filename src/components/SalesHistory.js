// src/components/SalesHistory.js
import React, { useEffect, useState } from "react";
import { subscribeSales, getSaleLineItems } from "../lib/firestore";

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openSaleId, setOpenSaleId] = useState(null);
  const [saleItemsMap, setSaleItemsMap] = useState({});

  useEffect(() => {
    const unsub = subscribeSales(items => {
      setSales(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function toggleItems(saleId) {
    if (openSaleId === saleId) {
      setOpenSaleId(null);
      return;
    }
    // if we already fetched items, just open
    if (saleItemsMap[saleId]) {
      setOpenSaleId(saleId);
      return;
    }
    // fetch line items
    try {
      const items = await getSaleLineItems(saleId);
      setSaleItemsMap(prev => ({ ...prev, [saleId]: items }));
      setOpenSaleId(saleId);
    } catch (err) {
      console.error("Failed to load sale items:", err);
      alert("Failed to load sale items: " + err.message);
    }
  }

  function formatDate(ts) {
    if (!ts) return "-";
    // Firestore timestamp has toDate()
    if (ts.toDate) return ts.toDate().toLocaleString();
    try { return new Date(ts).toLocaleString(); } catch (e) { return "-"; }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h3>Sales History</h3>
      {loading ? <p>Loading…</p> : sales.length === 0 ? <p>No sales yet.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Date</th>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Sale ID</th>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Payment</th>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Total (RM)</th>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Cash</th>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Online</th>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Items</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <React.Fragment key={s.id}>
                  <tr>
                    <td style={{ border: "1px solid #eee", padding: 8 }}>{formatDate(s.createdAt)}</td>
                    <td style={{ border: "1px solid #eee", padding: 8 }}>{s.id || s.id}</td>
                    <td style={{ border: "1px solid #eee", padding: 8 }}>{s.paymentType || "-"}</td>
                    <td style={{ border: "1px solid #eee", padding: 8 }}>RM {Number(s.total || 0).toFixed(2)}</td>
                    <td style={{ border: "1px solid #eee", padding: 8 }}>RM {Number(s.cashTotal || 0).toFixed(2)}</td>
                    <td style={{ border: "1px solid #eee", padding: 8 }}>RM {Number(s.onlineTotal || 0).toFixed(2)}</td>
                    <td style={{ border: "1px solid #eee", padding: 8 }}>
                      <button onClick={() => toggleItems(s.id)}>{openSaleId === s.id ? "Hide" : "View"}</button>
                    </td>
                  </tr>

                  {openSaleId === s.id && (
                    <tr>
                      <td colSpan={7} style={{ padding: 8, border: "1px solid #f0f0f0", background: "#fafafa" }}>
                        <strong>Line items</strong>
                        {(!saleItemsMap[s.id] || saleItemsMap[s.id].length === 0) ? (
                          <p>No line items</p>
                        ) : (
                          <table style={{ width: "100%", marginTop: 8, borderCollapse: "collapse" }}>
                            <thead>
                              <tr>
                                <th style={{ border: "1px solid #ddd", padding: 6 }}>Product</th>
                                <th style={{ border: "1px solid #ddd", padding: 6 }}>Qty</th>
                                <th style={{ border: "1px solid #ddd", padding: 6 }}>Subtotal (RM)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {saleItemsMap[s.id].map(li => (
                                <tr key={li.id}>
                                  <td style={{ border: "1px solid #eee", padding: 6 }}>{li.productName}</td>
                                  <td style={{ border: "1px solid #eee", padding: 6 }}>{li.totalUnits} (boxes:{li.bigBoxQty} packs:{li.smallPackQty} loose:{li.looseUnits})</td>
                                  <td style={{ border: "1px solid #eee", padding: 6 }}>RM {Number(li.subtotal || 0).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
