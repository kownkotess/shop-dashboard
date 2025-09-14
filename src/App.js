// src/App.js
import React from "react";
import ProductForm from "./components/ProductForm";
import ProductsList from "./components/ProductsList";

function App() {
  return (
    <div style={{ display: "flex", gap: 24, padding: 24 }}>
      <div style={{ flex: "0 0 420px" }}>
        <ProductForm />
      </div>
      <div style={{ flex: 1 }}>
        <ProductsList />
      </div>
    </div>
  );
}

export default App;
