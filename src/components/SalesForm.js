// src/components/SalesForm.js
import React, { useState, useEffect } from "react";
import { getProducts, createSale } from "../lib/firestore";

export default function SalesForm() {
  const [customerName, setCustomerName] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [bigBoxes, setBigBoxes] = useState(0);
  const [smallPacks, setSmallPacks] = useState(0);
  const [looseUnits, setLooseUnits] = useState(0);
  const [cart, setCart] = useState([]);
  const [paymentType, setPaymentType] = useState("Cash");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Load products once when page loads
  useEffect(() => {
    async function loadProducts() {
      try {
        const prods = await getProducts();
        setProducts(prods);
      } catch (err) {
        console.error("Error loading products:", err);
        alert("Failed to load products: " + (err.message || err));
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  function computeItemTotal(item) {
    return (
      (Number(item.bigBoxes || 0) * Number(item.bigBulkPrice || 0)) +
      (Number(item.smallPacks || 0) * Number(item.smallBulkPrice || 0)) +
      (Number(item.looseUnits || 0) * Number(item.loosePrice || 0))
    );
  }

  function addToCart() {
    if (!selectedProductId) return alert("Choose a product first");

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return alert("Product not found");

    const newItem = {
      productId: product.id,
      productName: product.name || product.productName || "Product",
      bigBoxes: Number(bigBoxes || 0),
      bigBulkQty: Number(product.bigBulkQty || 0),
      bigBulkPrice: Number(product.bigBulkPrice || product.bigBoxPrice || 0),
      smallPacks: Number(smallPacks || 0),
      smallBulkQty: Number(product.smallBulkQty || 0),
      smallBulkPrice: Number(product.smallBulkPrice || 0),
      looseUnits: Number(looseUnits || 0),
      loosePrice: Number(product.price ?? product.unitPrice ?? 0),
    };

    // require at least one non-zero qty
    const totalUnits =
      newItem.bigBoxes * newItem.bigBulkQty +
      newItem.smallPacks * newItem.smallBulkQty +
      newItem.looseUnits;
    if (totalUnits <= 0) return alert("Enter a quantity for this product (big / small / loose).");

    // merge if same product exists (just sum the parts)
    const existing = cart.find((c) => c.productId === newItem.productId);
    if (existing) {
      setCart((prev) =>
        prev.map((c) =>
          c.productId === newItem.productId
            ? {
                ...c,
                bigBoxes: c.bigBoxes + newItem.bigBoxes,
                smallPacks: c.smallPacks + newItem.smallPacks,
                looseUnits: c.looseUnits + newItem.looseUnits,
              }
            : c
        )
      );
    } else {
      setCart((prev) => [...prev, newItem]);
    }

    // reset builder
    setSelectedProductId("");
    setBigBoxes(0);
    setSmallPacks(0);
    setLooseUnits(0);
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  const totalAmount = cart.reduce((s, item) => s + computeItemTotal(item), 0);

  async function handleSale() {
    if (cart.length === 0) return alert("Cart is empty");

    setProcessing(true);
    try {
      // normalize items into the shape createSale expects:
      // { productId, productName, quantity, price, subtotal, ... }
      const normalizedItems = cart.map((item) => {
        const totalUnits =
          Number(item.bigBoxes || 0) * Number(item.bigBulkQty || 0) +
          Number(item.smallPacks || 0) * Number(item.smallBulkQty || 0) +
          Number(item.looseUnits || 0);

        const subtotal =
          Number(item.bigBoxes || 0) * Number(item.bigBulkPrice || 0) +
          Number(item.smallPacks || 0) * Number(item.smallBulkPrice || 0) +
          Number(item.looseUnits || 0) * Number(item.loosePrice || 0);

        const unitPrice = totalUnits ? subtotal / totalUnits : Number(item.loosePrice || 0);

        return {
          productId: item.productId,
          productName: item.productName,
          quantity: Number(totalUnits),
          price: Number(unitPrice),
          subtotal: Number(subtotal),
          // keep original breakdown for history if needed
          bigBoxes: Number(item.bigBoxes || 0),
          bigBulkQty: Number(item.bigBulkQty || 0),
          bigBulkPrice: Number(item.bigBulkPrice || 0),
          smallPacks: Number(item.smallPacks || 0),
          smallBulkQty: Number(item.smallBulkQty || 0),
          smallBulkPrice: Number(item.smallBulkPrice || 0),
          looseUnits: Number(item.looseUnits || 0),
          loosePrice: Number(item.loosePrice || 0),
        };
      });

      // double check no zero-quantity item slipped through
      for (const ni of normalizedItems) {
        if (!ni.quantity || ni.quantity <= 0) {
          throw new Error("One item has zero quantity — remove or correct it before completing sale.");
        }
      }

      const customerForSale = customerName && customerName.trim() !== "" ? customerName.trim() : "Walk-in";

      const saleId = await createSale({
        customer: customerForSale,
        items: normalizedItems,
        paymentType, // values: "Cash" or "Online Transfer"
        total: Number(totalAmount || 0),
      });

      alert("Sale recorded. ID: " + saleId);

      // reset UI
      setCustomerName("");
      setCart([]);
      setPaymentType("Cash");
    } catch (err) {
      console.error("Sale failed:", err);
      alert("Sale failed: " + (err.message || err));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="p-4 border rounded bg-gray-50">
      <h2 className="text-xl font-bold mb-3">New Sale</h2>

      {/* Customer Name */}
      <div className="mb-3">
        <label className="block text-sm font-medium">Customer (optional)</label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full border p-2 rounded"
          placeholder="Leave blank => Walk-in"
        />
      </div>

      {/* Product selection (name only) */}
      <div className="mb-3">
        <label className="block text-sm font-medium">Select Product</label>
        {loadingProducts ? (
          <div>Loading products…</div>
        ) : (
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">-- Select a product --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Quantity Inputs */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="block text-xs">Big Bulk (boxes)</label>
          <input
            type="number"
            min="0"
            value={bigBoxes}
            onChange={(e) => setBigBoxes(Number(e.target.value || 0))}
            className="w-full border p-2 rounded text-center"
          />
        </div>
        <div>
          <label className="block text-xs">Small Bulk (packs)</label>
          <input
            type="number"
            min="0"
            value={smallPacks}
            onChange={(e) => setSmallPacks(Number(e.target.value || 0))}
            className="w-full border p-2 rounded text-center"
          />
        </div>
        <div>
          <label className="block text-xs">Loose Units</label>
          <input
            type="number"
            min="0"
            value={looseUnits}
            onChange={(e) => setLooseUnits(Number(e.target.value || 0))}
            className="w-full border p-2 rounded text-center"
          />
        </div>
      </div>

      {/* Add button */}
      <div className="mb-3">
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
        <ul className="space-y-2 mb-3">
          {cart.map((item) => (
            <li key={item.productId} className="border p-2 rounded">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{item.productName}</div>
                  <div style={{ fontSize: 13, color: "#444" }}>
                    {/* show only non-zero breakdown pieces */}
                    {item.bigBoxes > 0 && (
                      <span>{item.bigBoxes} × box ({item.bigBulkQty}u) = RM{(item.bigBoxes * item.bigBulkPrice).toFixed(2)}</span>
                    )}
                    {item.bigBoxes > 0 && (item.smallPacks > 0 || item.looseUnits > 0) && <span> · </span>}
                    {item.smallPacks > 0 && (
                      <span>{item.smallPacks} × pack ({item.smallBulkQty}u) = RM{(item.smallPacks * item.smallBulkPrice).toFixed(2)}</span>
                    )}
                    {item.smallPacks > 0 && item.looseUnits > 0 && <span> · </span>}
                    {item.looseUnits > 0 && (
                      <span>{item.looseUnits} × unit = RM{(item.looseUnits * item.loosePrice).toFixed(2)}</span>
                    )}
                    <div style={{ marginTop: 6, fontWeight: 600 }}>Subtotal: RM {computeItemTotal(item).toFixed(2)}</div>
                  </div>
                </div>

                <div>
                  <button onClick={() => removeFromCart(item.productId)} className="bg-red-500 text-white px-2 py-1 rounded">Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Total */}
      <div className="mb-3 font-bold text-lg">Total: RM {totalAmount.toFixed(2)}</div>

      {/* Payment type (only two options) */}
      <div className="mb-3">
        <label className="block text-sm font-medium">Payment Type</label>
        <select
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="Cash">Cash</option>
          <option value="Online Transfer">Online Transfer</option>
        </select>
      </div>

      {/* Submit */}
      <div>
        <button
          onClick={handleSale}
          disabled={cart.length === 0 || processing}
          className="bg-green-600 text-white px-4 py-2 rounded w-full"
        >
          {processing ? "Processing..." : "Complete Sale"}
        </button>
      </div>
    </div>
  );
}
