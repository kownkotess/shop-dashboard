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
  const [discBigPrice, setDiscBigPrice] = useState("");
  const [discSmallPrice, setDiscSmallPrice] = useState("");
  const [discUnitPrice, setDiscUnitPrice] = useState("");
  const [cart, setCart] = useState([]);
  const [paymentType, setPaymentType] = useState("Cash");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const prods = await getProducts();
        setProducts(prods);
      } catch (err) {
        console.error("Failed load products", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const selectedProduct = products.find(p => p.id === selectedProductId) || null;

  function computeItemSubtotal(product, bigBoxesVal, smallPacksVal, looseUnitsVal, dBig, dSmall, dUnit) {
    const bigPrice = (dBig !== "" && dBig != null) ? Number(dBig) : Number(product.bigBulkPrice || 0);
    const smallPrice = (dSmall !== "" && dSmall != null) ? Number(dSmall) : Number(product.smallBulkPrice || 0);
    const unitPrice = (dUnit !== "" && dUnit != null) ? Number(dUnit) : Number(product.price || 0);

    return (Number(bigBoxesVal || 0) * bigPrice)
      + (Number(smallPacksVal || 0) * smallPrice)
      + (Number(looseUnitsVal || 0) * unitPrice);
  }

  function computeItemUnits(product, bigBoxesVal, smallPacksVal, looseUnitsVal) {
    const bigPerBox = Number(product.bigBulkQty || 0);
    const smallPerPack = Number(product.smallBulkQty || 0);
    return Number(bigBoxesVal || 0) * bigPerBox
      + Number(smallPacksVal || 0) * smallPerPack
      + Number(looseUnitsVal || 0);
  }

  function resetBuilder() {
    setSelectedProductId("");
    setBigBoxes(0);
    setSmallPacks(0);
    setLooseUnits(0);
    setDiscBigPrice("");
    setDiscSmallPrice("");
    setDiscUnitPrice("");
  }

  function addToCart() {
    if (!selectedProduct) return alert("Choose a product first");

    const totalUnits = computeItemUnits(selectedProduct, bigBoxes, smallPacks, looseUnits);
    if (totalUnits <= 0) return alert("Enter some quantity (boxes/packs/units)");

    const subtotal = computeItemSubtotal(
      selectedProduct,
      bigBoxes,
      smallPacks,
      looseUnits,
      discBigPrice,
      discSmallPrice,
      discUnitPrice
    );

    const newItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      bigBoxes: Number(bigBoxes || 0),
      bigBoxQty: Number(selectedProduct.bigBulkQty || 0),
      bigBoxPrice: Number(selectedProduct.bigBulkPrice || 0),
      smallPacks: Number(smallPacks || 0),
      smallPackQty: Number(selectedProduct.smallBulkQty || 0),
      smallPackPrice: Number(selectedProduct.smallBulkPrice || 0),
      looseUnits: Number(looseUnits || 0),
      loosePrice: Number(selectedProduct.price || 0),
      discountedBigPrice: discBigPrice === "" ? null : Number(discBigPrice),
      discountedSmallPrice: discSmallPrice === "" ? null : Number(discSmallPrice),
      discountedUnitPrice: discUnitPrice === "" ? null : Number(discUnitPrice),
      totalUnits,
      subtotal: Number(subtotal || 0),
    };

    // merge if same product exists
    const existing = cart.find(c => c.productId === newItem.productId);
    if (existing) {
      const merged = cart.map(c => {
        if (c.productId === newItem.productId) {
          const big = c.bigBoxes + newItem.bigBoxes;
          const small = c.smallPacks + newItem.smallPacks;
          const loose = c.looseUnits + newItem.looseUnits;
          const subtotalMerged = computeItemSubtotal(
            selectedProduct,
            big,
            small,
            loose,
            newItem.discountedBigPrice ?? c.discountedBigPrice,
            newItem.discountedSmallPrice ?? c.discountedSmallPrice,
            newItem.discountedUnitPrice ?? c.discountedUnitPrice
          );
          return {
            ...c,
            bigBoxes: big,
            smallPacks: small,
            looseUnits: loose,
            totalUnits: computeItemUnits(selectedProduct, big, small, loose),
            subtotal: subtotalMerged,
          };
        }
        return c;
      });
      setCart(merged);
    } else {
      setCart(prev => [...prev, newItem]);
    }

    resetBuilder();
  }

  function removeFromCart(productId) {
    setCart(prev => prev.filter(i => i.productId !== productId));
  }

  const totalAmount = cart.reduce((s, i) => s + Number(i.subtotal || 0), 0);

  async function handleSale() {
    if (paymentType === "Hutang" && (!customerName || !customerName.trim())) {
      return alert("Please enter a customer name for Hutang (credit) sales.");
    }

    const customer = (customerName && customerName.trim()) ? customerName.trim() : "Walk-in";
    if (cart.length === 0) return alert("Cart is empty");

    const saleData = {
      customer,
      paymentType,
      items: cart.map(i => ({
        productId: i.productId,
        productName: i.productName,
        bigBoxes: i.bigBoxes,
        bigBoxQty: i.bigBoxQty,
        bigBoxPrice: i.discountedBigPrice ?? i.bigBoxPrice,
        smallPacks: i.smallPacks,
        smallPackQty: i.smallPackQty,
        smallPackPrice: i.discountedSmallPrice ?? i.smallPackPrice,
        looseUnits: i.looseUnits,
        unitPrice: i.discountedUnitPrice ?? i.loosePrice,
        totalUnits: i.totalUnits,
        subtotal: i.subtotal,
        discountedBigPrice: i.discountedBigPrice,
        discountedSmallPrice: i.discountedSmallPrice,
        discountedUnitPrice: i.discountedUnitPrice,
      })),
      total: Number(totalAmount || 0),
    };

    setLoading(true);
    try {
      const saleId = await createSale(saleData);
      alert("Sale recorded. ID: " + saleId);
      setCustomerName("");
      setCart([]);
      setPaymentType("Cash");
    } catch (err) {
      console.error("Sale error", err);
      alert("Sale failed: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h3>Sales / New Transaction</h3>

      <div style={{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }}>
        <div style={{ marginBottom: 8 }}>
          <label>Customer: </label>
          <input
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Customer name (required for Hutang)"
            style={{ width: 300 }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Product: </label>
          <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
            <option value="">— choose product —</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          <div>
            <label>Big boxes</label><br />
            <input
              type="number"
              value={bigBoxes}
              min="0"
              onChange={e => setBigBoxes(Number(e.target.value || 0))}
              style={{ width: 100 }}
            />
            <div style={{ fontSize: 12, color: "#666" }}>
              {selectedProduct ? `${selectedProduct.bigBulkQty || "-"} units/box` : "-"}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Box price: {selectedProduct ? (selectedProduct.bigBulkPrice ?? "-") : "-"}
            </div>
            <div style={{ fontSize: 12 }}>
              Disc:{" "}
              <input
                type="number"
                value={discBigPrice}
                onChange={e => setDiscBigPrice(e.target.value)}
                style={{ width: 80 }}
              />
            </div>
          </div>

          <div>
            <label>Small packs</label><br />
            <input
              type="number"
              value={smallPacks}
              min="0"
              onChange={e => setSmallPacks(Number(e.target.value || 0))}
              style={{ width: 100 }}
            />
            <div style={{ fontSize: 12, color: "#666" }}>
              {selectedProduct ? `${selectedProduct.smallBulkQty || "-"} units/pack` : "-"}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Pack price: {selectedProduct ? (selectedProduct.smallBulkPrice ?? "-") : "-"}
            </div>
            <div style={{ fontSize: 12 }}>
              Disc:{" "}
              <input
                type="number"
                value={discSmallPrice}
                onChange={e => setDiscSmallPrice(e.target.value)}
                style={{ width: 80 }}
              />
            </div>
          </div>

          <div>
            <label>Loose units</label><br />
            <input
              type="number"
              value={looseUnits}
              min="0"
              onChange={e => setLooseUnits(Number(e.target.value || 0))}
              style={{ width: 100 }}
            />
            <div style={{ fontSize: 12, color: "#666" }}>
              Unit price: {selectedProduct ? (selectedProduct.price ?? "-") : "-"}
            </div>
            <div style={{ fontSize: 12 }}>
              Disc:{" "}
              <input
                type="number"
                value={discUnitPrice}
                onChange={e => setDiscUnitPrice(e.target.value)}
                style={{ width: 80 }}
              />
            </div>
          </div>

          <div style={{ marginLeft: "auto" }}>
            <div>
              Preview units:{" "}
              <strong>{computeItemUnits(selectedProduct || {}, bigBoxes, smallPacks, looseUnits)}</strong>
            </div>
            <div>
              Preview subtotal:{" "}
              <strong>
                RM{" "}
                {computeItemSubtotal(
                  selectedProduct || {},
                  bigBoxes,
                  smallPacks,
                  looseUnits,
                  discBigPrice,
                  discSmallPrice,
                  discUnitPrice
                ).toFixed(2)}
              </strong>
            </div>
            <div style={{ marginTop: 8 }}>
              <button onClick={addToCart}>Add In Cart</button> {/* ✅ changed */}
              <button onClick={resetBuilder} style={{ marginLeft: 8 }}>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <h4>🛒 In Cart</h4> {/* ✅ changed */}
        {cart.length === 0 ? (
          <p>No items added</p>
        ) : (
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Product</th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Qty (big/small/loose)</th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Subtotal (RM)</th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Remove</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((li, i) => (
                <tr key={i}>
                  <td style={{ border: "1px solid #eee", padding: 6 }}>{li.productName}</td>
                  <td style={{ border: "1px solid #eee", padding: 6 }}>
                    {li.bigBoxes ? `${li.bigBoxes} big` : null}{" "}
                    {li.smallPacks ? `${li.smallPacks} pack` : null}{" "}
                    {li.looseUnits ? `${li.looseUnits} unit` : null}
                  </td>
                  <td style={{ border: "1px solid #eee", padding: 6 }}>
                    RM {Number(li.subtotal || 0).toFixed(2)}
                  </td>
                  <td style={{ border: "1px solid #eee", padding: 6 }}>
                    <button onClick={() => removeFromCart(li.productId)}>Remove</button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={{ textAlign: "right", padding: 6 }}>
                  Total:
                </td>
                <td style={{ padding: 6 }}>RM {Number(totalAmount || 0).toFixed(2)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Payment type: </label>
        <select value={paymentType} onChange={e => setPaymentType(e.target.value)}>
          <option value="Cash">Cash</option>
          <option value="Online Transfer">Online Transfer</option>
          <option value="Hutang">Hutang (credit)</option>
        </select>

        <div style={{ marginTop: 10 }}>
          <button onClick={handleSale} disabled={loading || cart.length === 0}>
            {loading ? "Saving..." : "Complete Sale"}
          </button>
        </div>
      </div>
    </div>
  );
}
