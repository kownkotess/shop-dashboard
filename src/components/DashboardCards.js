// src/components/DashboardCards.js
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function DashboardCards() {
  const [todayCash, setTodayCash] = useState(0);
  const [todayOnline, setTodayOnline] = useState(0);
  const [todayHutang, setTodayHutang] = useState(0);
  const [monthCash, setMonthCash] = useState(0);
  const [monthOnline, setMonthOnline] = useState(0);
  const [monthHutang, setMonthHutang] = useState(0);

  useEffect(() => {
    async function fetchData() {
      const salesRef = collection(db, "sales");
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const q = query(salesRef, where("createdAt", ">=", startOfMonth));
      const snap = await getDocs(q);

      let tCash = 0, tOnline = 0, tHutang = 0;
      let mCash = 0, mOnline = 0, mHutang = 0;

      snap.forEach(doc => {
        const d = doc.data();
        const created = d.createdAt?.toDate?.() || new Date(d.createdAt);
        if (!created) return;

        const total = Number(d.total || 0);

        // Month totals
        if (d.paymentType === "Cash") mCash += total;
        else if (d.paymentType === "Online Transfer") mOnline += total;
        else if (d.paymentType === "Hutang") mHutang += total;

        // Today totals
        if (created >= startOfDay) {
          if (d.paymentType === "Cash") tCash += total;
          else if (d.paymentType === "Online Transfer") tOnline += total;
          else if (d.paymentType === "Hutang") tHutang += total;
        }
      });

      setTodayCash(tCash);
      setTodayOnline(tOnline);
      setTodayHutang(tHutang);
      setMonthCash(mCash);
      setMonthOnline(mOnline);
      setMonthHutang(mHutang);
    }

    fetchData();
  }, []);

  const cardStyle = (bg) => ({
    flex: 1,
    background: bg,
    color: "white",
    padding: 16,
    borderRadius: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  });

  return (
    <div>
      <h3>Summary</h3>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={cardStyle("#3b82f6")}>
          <h4 style={{ margin: 0 }}>Today</h4>
          <p>Cash: RM {todayCash.toFixed(2)}</p>
          <p>Online: RM {todayOnline.toFixed(2)}</p>
          <p>Hutang: RM {todayHutang.toFixed(2)}</p>
        </div>
        <div style={cardStyle("#10b981")}>
          <h4 style={{ margin: 0 }}>This Month</h4>
          <p>Cash: RM {monthCash.toFixed(2)}</p>
          <p>Online: RM {monthOnline.toFixed(2)}</p>
          <p>Hutang: RM {monthHutang.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
