// src/App.js
import React, { useState } from "react";
import ProductForm from "./components/ProductForm";
import ProductsList from "./components/ProductsList";
import SalesForm from "./components/SalesForm";
import SalesHistory from "./components/SalesHistory";
import Dashboard from "./components/Dashboard";
import HutangPage from "./components/HutangPage";   // ✅ new
import DashboardCards from "./components/DashboardCards"; // ✅ new

export default function App() {
  const [view, setView] = useState("dashboard"); 
  // views: dashboard | products | newproduct | sales | history | hutang

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: 16 }}>
      <header style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Shop System</h1>
        <nav style={{ marginLeft: 12 }}>
          <button onClick={() => setView("dashboard")} style={{ marginRight: 6 }}>Dashboard</button>
          <button onClick={() => setView("products")} style={{ marginRight: 6 }}>Products</button>
          <button onClick={() => setView("newproduct")} style={{ marginRight: 6 }}>Add Product</button>
          <button onClick={() => setView("sales")} style={{ marginRight: 6 }}>New Sale</button>
          <button onClick={() => setView("history")} style={{ marginRight: 6 }}>Sales History</button>
          <button onClick={() => setView("hutang")} style={{ marginRight: 6 }}>Hutang</button> {/* ✅ new button */}
        </nav>
      </header>

      <main>
        {view === "dashboard" && (
          <div>
            <Dashboard />
            <hr />
            <DashboardCards />  {/* ✅ new summary cards */}
          </div>
        )}
        {view === "products" && <ProductsList />}
        {view === "newproduct" && <ProductForm />}
        {view === "sales" && <SalesForm />}
        {view === "history" && <SalesHistory />}
        {view === "hutang" && <HutangPage />} {/* ✅ new page */}
      </main>
    </div>
  );
}
