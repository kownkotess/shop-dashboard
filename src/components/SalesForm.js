// src/components/SalesForm.js
import React, { useState, useEffect } from "react";
import { getProducts, createSale } from "../lib/firestore";

export default function SalesForm() {
  const [customerName, setCustomerName] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState([]);
  const [paymentType, setPaymentType] = useState("Cash");

  // 🔄 Load products when page loads
  useEffect(() => {
    async function loadProducts() {
      try {
        const prods = await getProducts();
        setProducts(prods);
      } catch (err) {
        console.error("Error loading products:", err);
      }
    }
    loadProducts();
  }, []);

  // ➕ Add selected product to cart
  const addToCart = () => {
    if (!selectedProductId) return;

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    // If already in cart, update qty
    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + Number(quantity) }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: Number(quantity) || 1,
        },
      ]);
    }

    setSelectedProductId("");
    setQuantity(1);
  };

  // ❌ Remove item
  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  // 🧮 Compute total
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  // 🧾 Submit sale
  const handleSale = async () => {
    if (!customerName.trim()) {
      alert("Please enter customer name");
      return;
    }
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    try {
      const saleId = await createSale({
        customer: customerName,
        items: cart,
        paymentType,
        total: totalAmount,
      });

      alert("Sale recorded. ID: " + saleId);

      // Reset form
      setCustomerName("");
      setCart([]);
      setPaymentType("Cash");
    } catch (err) {
      alert("Sale failed: " + err.message);
      console.error(err);
    }
  };

  return (
    <div className="p-4 border rounded bg-gray-50">
      <h2 className="text-xl font-bold mb-3">New Sale</h2>

      {/* Customer Name */}
      <div className="mb-3">
        <label className="block text-sm font-medium">Customer</label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full border p-2 rounded"
          placeholder="Enter customer name"
        />
      </div>

      {/* Product selection */}
      <div className="mb-3">
        <label className="block text-sm font-medium">Select Product</label>
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">-- Select a product --</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (Stock: {p.balance ?? p.stock ?? 0}) — RM {p.price}
            </option>
          ))}
        </select>
      </div>

      {/* Quantity + Add to cart */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-20 border p-2 rounded text-center"
        />
        <button
          onClick={addToCart}
          className="bg-blue-500 text-white px-3 py-2 rounded"
        >
          Add to Cart
        </button>
      </div>

      {/* Cart */}
      <h3 className="font-semibold mb-2">Cart</h3>
      {cart.length === 0 ? (
        <p>No items in cart.</p>
      ) : (
        <ul className="space-y-1 mb-3">
          {cart.map((item) => (
            <li
              key={item.productId}
              className="flex justify-between items-center border p-2 rounded"
            >
              <span>
                {item.productName} — {item.quantity} × RM {item.price} = RM{" "}
                {item.quantity * item.price}
              </span>
              <button
                onClick={() => removeFromCart(item.productId)}
                className="bg-red-500 text-white px-2 py-1 rounded"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Total */}
      <div className="mb-3 font-bold text-lg">
        Total: RM {totalAmount.toFixed(2)}
      </div>

      {/* Payment type */}
      <div className="mb-3">
        <label className="block text-sm font-medium">Payment Type</label>
        <select
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="Cash">Cash</option>
          <option value="Online">Online</option>
          <option value="Transfer">Transfer</option>
        </select>
      </div>

      {/* Submit */}
      <button
        onClick={handleSale}
        disabled={cart.length === 0}
        className="bg-green-600 text-white px-4 py-2 rounded w-full"
      >
        Complete Sale
      </button>
    </div>
  );
}
