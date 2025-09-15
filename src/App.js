// src/App.js
import React from "react";
import ProductForm from "./components/ProductForm";
import SalesForm from "./components/SalesForm";
import ProductsList from "./components/ProductsList";
import SalesHistory from "./components/SalesHistory";

function App() {
  return (
    <div style={{ display: "flex", gap: 24, padding: 24, alignItems: "flex-start" }}>
      <div style={{ flex: "0 0 320px" }}>
        <ProductForm />
      </div>

      <div style={{ flex: "0 0 520px" }}>
        <SalesForm />
      </div>

      <div style={{ flex: 1 }}>
        <ProductsList />
      </div>

      <div style={{ flex: "0 0 520px" }}>
        <SalesHistory />
      </div>
    </div>
  );
}

export default App;
