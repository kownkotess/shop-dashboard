// src/components/HutangPage.js
import React, { useEffect, useState } from "react";
import { subscribeHutang, getSaleLineItems, recordPayment } from "../lib/firestore";

export default function HutangPage() {
  const [hutangList, setHutangList] = useState([]);
  const [openSaleId, setOpenSaleId] = useState(null);
  const [saleLineItems, setSaleLineItems] = useState([]);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeHutang(items => {
      // ✅ Only keep sales with paymentType = "Hutang"
      const filtered = items.filter(s => s.paymentType === "Hutang");
      setHutangList(filtered);
      setLoading(false);
    });
    return () => unsub && unsub();
  }, []);

  async function openSale(sale) {
    setOpenSaleId(sale.id);
    try {
      const items = await getSaleLineItems(sale.id);
      setSaleLineItems(items);
    } catch (err) {
      console.error("Failed to load line items:", err);
      setSaleLineItems([]);
    }
  }

  async function doPayment(sale) {
    const amt = Number(payAmount || 0);
    if (!amt || amt <= 0) return alert("Enter a valid payment amount");
    if (!["Cash", "Online Transfer"].includes(payMethod)) return alert("Choose payment method");

    try {
      await recordPayment(sale.id, amt, payMethod);
      alert("Payment recorded");
      setPayAmount("");
      setPayMethod("Cash");
      setOpenSaleId(null);
    } catch (err) {
      console.error("Payment error", err);
      alert("Payment failed: " + (err.message || err));
    }
  }

  function formatDate(ts) {
    if (!ts) return "-";
    if (ts.toDate) return ts.toDate().toLocaleString();
    return new Date(ts).toLocaleString();
  }

  return (
    <div>
      <h3>Hutang (Owing) — Outstanding debts</h3>
      {loading ? <p>Loading…</p> : hutangList.length === 0 ? <p>No outstanding hutang.</p> : (
        <div style={{ display: "grid", gap: 12 }}>
          {hutangList.map(s => (
            <div key={s.id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>{s.customer || "Customer"}</strong><br/>
                  <small>{formatDate(s.createdAt)}</small>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>Total: RM {Number(s.total || 0).toFixed(2)}</div>
                  <div>Remaining: RM {Number(s.remaining || 0).toFixed(2)}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{s.status || "-"}</div>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <button onClick={() => openSale(s)}>Open</button>
                <button onClick={() => { setOpenSaleId(openSaleId === s.id ? null : s.id); }} style={{ marginLeft: 8 }}>
                  {openSaleId === s.id ? "Hide" : "Details"}
                </button>
              </div>

              {openSaleId === s.id && (
                <div style={{ marginTop: 8, background: "#fafafa", padding: 8 }}>
                  <h4>Line Items</h4>
                  {saleLineItems.length === 0 ? <p>No items</p> : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr><th style={{ padding:6, textAlign:"left" }}>Product</th><th style={{ padding:6 }}>Qty</th><th style={{ padding:6 }}>Subtotal</th></tr></thead>
                      <tbody>
                        {saleLineItems.map(li => (
                          <tr key={li.id}>
                            <td style={{ padding:6 }}>{li.productName}</td>
                            <td style={{ padding:6 }}>{li.totalUnits ?? li.quantity ?? "-"}</td>
                            <td style={{ padding:6 }}>RM {Number(li.subtotal || (li.unitPrice*(li.quantity||0)) || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <div style={{ marginTop: 10 }}>
                    <label>Amount to record as payment</label><br/>
                    <input type="number" min="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ width: 140 }} />
                    <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={{ marginLeft: 8 }}>
                      <option value="Cash">Cash</option>
                      <option value="Online Transfer">Online Transfer</option>
                    </select>
                    <button onClick={() => doPayment(s)} style={{ marginLeft: 8 }}>Record Payment</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
