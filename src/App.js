// src/App.js
import React, { useState } from "react";
import ProductForm from "./components/ProductForm";
import ProductsList from "./components/ProductsList";
import SalesForm from "./components/SalesForm";
import SalesHistory from "./components/SalesHistory";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [view, setView] = useState("dashboard"); // dashboard | products | newproduct | sales | history

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
        </nav>
      </header>

      <main>
        {view === "dashboard" && <Dashboard />}
        {view === "products" && <ProductsList />}
        {view === "newproduct" && <ProductForm />}
        {view === "sales" && <SalesForm />}
        {view === "history" && <SalesHistory />}
      </main>
    </div>
  );
}
