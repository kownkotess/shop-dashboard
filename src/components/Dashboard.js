// src/components/Dashboard.js
import React, { useEffect, useState } from "react";
import { subscribeSales, subscribeProducts } from "../lib/firestore";

function toDate(s) {
  if (!s) return null;
  if (s.toDate) return s.toDate();
  return new Date(s);
}

function sameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function sameMonth(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth();
}

export default function Dashboard() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const unsubS = subscribeSales(items => setSales(items));
    const unsubP = subscribeProducts(items => setProducts(items));
    return () => { unsubS && unsubS(); unsubP && unsubP(); };
  }, []);

  const now = new Date();

  // aggregator helpers: prefer cashTotal/onlineTotal if present
  function sumForDay(list, date) {
    let cash = 0, online = 0;
    list.forEach(s => {
      const d = toDate(s.createdAt) || new Date();
      if (!sameDay(d, date)) return;
      if (typeof s.cashTotal === "number" || typeof s.onlineTotal === "number") {
        cash += Number(s.cashTotal || 0);
        online += Number(s.onlineTotal || 0);
      } else {
        const total = Number(s.total || 0);
        const payment = (s.paymentType || "").toLowerCase();
        if (payment.includes("online") || payment.includes("transfer")) online += total;
        else cash += total;
      }
    });
    return { cash, online };
  }

  function sumForMonth(list, date) {
    let cash = 0, online = 0;
    list.forEach(s => {
      const d = toDate(s.createdAt) || new Date();
      if (!sameMonth(d, date)) return;
      if (typeof s.cashTotal === "number" || typeof s.onlineTotal === "number") {
        cash += Number(s.cashTotal || 0);
        online += Number(s.onlineTotal || 0);
      } else {
        const total = Number(s.total || 0);
        const payment = (s.paymentType || "").toLowerCase();
        if (payment.includes("online") || payment.includes("transfer")) online += total;
        else cash += total;
      }
    });
    return { cash, online };
  }

  const todayTotals = sumForDay(sales, now);
  const monthTotals = sumForMonth(sales, now);

  // low stock
  const lowStock = products.filter(p => {
    if (typeof p.reorderPoint !== "number") return false;
    const balance = Number(p.balance ?? p.startingStock ?? 0);
    return balance <= Number(p.reorderPoint || 0);
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 6, minWidth: 220 }}>
          <h3 style={{ marginTop: 0 }}>Today</h3>
          <div>Cash: RM {todayTotals.cash.toFixed(2)}</div>
          <div>Online: RM {todayTotals.online.toFixed(2)}</div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>{now.toLocaleDateString()}</div>
        </div>

        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 6, minWidth: 220 }}>
          <h3 style={{ marginTop: 0 }}>This Month</h3>
          <div>Cash: RM {monthTotals.cash.toFixed(2)}</div>
          <div>Online: RM {monthTotals.online.toFixed(2)}</div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>{now.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 6 }}>
        <h3 style={{ marginTop: 0 }}>Low Stock</h3>
        {lowStock.length === 0 ? <div>All good ✅</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 6 }}>Product</th>
                <th style={{ textAlign: "right", padding: 6 }}>Balance</th>
                <th style={{ textAlign: "right", padding: 6 }}>Reorder Point</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map(p => (
                <tr key={p.id}>
                  <td style={{ padding: 6 }}>{p.name || p.productName}</td>
                  <td style={{ padding: 6, textAlign: "right" }}>{Number(p.balance ?? p.startingStock ?? 0)}</td>
                  <td style={{ padding: 6, textAlign: "right" }}>{Number(p.reorderPoint ?? "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
