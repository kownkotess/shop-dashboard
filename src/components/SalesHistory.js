// src/components/SalesHistory.js
import React, { useEffect, useState } from "react";
import { subscribeSales, getSaleLineItems, updateSale, updateLineItem } from "../lib/firestore";

function toDate(s) {
  if (!s) return null;
  if (s.toDate) return s.toDate();
  return new Date(s);
}

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [editMode, setEditMode] = useState(false); // ✅ toggle edit mode
  const [saleEdits, setSaleEdits] = useState({});  // ✅ track sale changes
  const [lineItemEdits, setLineItemEdits] = useState({}); // ✅ track line item edits

  useEffect(() => {
    const unsub = subscribeSales(items => setSales(items));
    return () => unsub && unsub();
  }, []);

  async function openSale(sale) {
    setSelectedSale(sale);
    setSaleEdits({ customer: sale.customer, paymentType: sale.paymentType }); // ✅ preload edits
    try {
      const items = await getSaleLineItems(sale.id);
      setLineItems(items);
      // create edit state for line items
      const liEdits = {};
      items.forEach(li => {
        liEdits[li.id] = { productName: li.productName, quantity: li.quantity ?? li.totalUnits, subtotal: li.subtotal };
      });
      setLineItemEdits(liEdits);
    } catch (err) {
      console.error("Error loading line items", err);
      setLineItems([]);
    }
  }

  async function saveSaleEdits() {
    if (!selectedSale) return;
    try {
      await updateSale(selectedSale.id, {
        customer: saleEdits.customer,
        paymentType: saleEdits.paymentType
      });

      // update all line items
      for (const li of lineItems) {
        const updates = lineItemEdits[li.id];
        await updateLineItem(selectedSale.id, li.id, {
          productName: updates.productName,
          quantity: Number(updates.quantity || 0),
          subtotal: Number(updates.subtotal || 0)
        });
      }

      alert("Changes saved ✅");
      setEditMode(false);
    } catch (err) {
      console.error("Save failed", err);
      alert("Save failed: " + (err.message || err));
    }
  }

  return (
    <div>
      <h2>Sales History</h2>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1, border: "1px solid #ddd", padding: 12, borderRadius: 6, maxHeight: "60vh", overflowY: "auto" }}>
          <h4 style={{ marginTop: 0 }}>Recent Sales</h4>
          {sales.length === 0 ? <p>No sales yet.</p> : (
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {sales.map(s => (
                <li key={s.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{s.customer || "Customer"}</strong><br/>
                      <small>{toDate(s.createdAt)?.toLocaleString()}</small>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div>RM {Number(s.total || 0).toFixed(2)}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>{s.paymentType || "Cash"}</div>
                      <button onClick={() => openSale(s)} style={{ marginTop: 6 }}>Open</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ width: 420, border: "1px solid #ddd", padding: 12, borderRadius: 6, maxHeight: "60vh", overflowY: "auto" }}>
          <h4 style={{ marginTop: 0 }}>Sale details</h4>
          {!selectedSale ? <div>Select a sale to see line items</div> : (
            <div>
              {/* ✅ Edit toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>Sale: {selectedSale.id}</strong>
                <button onClick={() => setEditMode(!editMode)}>
                  {editMode ? "Cancel" : "Edit"}
                </button>
              </div>

              {/* ✅ Editable fields */}
              <div>
                <label>Customer: </label>
                {editMode ? (
                  <input
                    value={saleEdits.customer}
                    onChange={e => setSaleEdits({ ...saleEdits, customer: e.target.value })}
                  />
                ) : (
                  <span>{selectedSale.customer}</span>
                )}
              </div>
              <div>
                <label>Payment Type: </label>
                {editMode ? (
                  <select
                    value={saleEdits.paymentType}
                    onChange={e => setSaleEdits({ ...saleEdits, paymentType: e.target.value })}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online Transfer">Online Transfer</option>
                    <option value="Hutang">Hutang</option>
                  </select>
                ) : (
                  <span>{selectedSale.paymentType}</span>
                )}
              </div>
              <div style={{ marginTop: 8 }}>
                <strong>Total: RM {Number(selectedSale.total || 0).toFixed(2)}</strong>
              </div>

              {/* ✅ Editable line items */}
              <div style={{ marginTop: 10 }}>
                <h5>Line Items</h5>
                {lineItems.length === 0 ? <div>No line items (or loading)...</div> : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign:"left", padding:6 }}>Product</th>
                        <th style={{ textAlign:"right", padding:6 }}>Qty</th>
                        <th style={{ textAlign:"right", padding:6 }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map(li => (
                        <tr key={li.id}>
                          <td style={{ padding:6 }}>
                            {editMode ? (
                              <input
                                value={lineItemEdits[li.id]?.productName || ""}
                                onChange={e => setLineItemEdits({
                                  ...lineItemEdits,
                                  [li.id]: { ...lineItemEdits[li.id], productName: e.target.value }
                                })}
                              />
                            ) : li.productName}
                          </td>
                          <td style={{ padding:6, textAlign:"right" }}>
                            {editMode ? (
                              <input
                                type="number"
                                value={lineItemEdits[li.id]?.quantity || 0}
                                onChange={e => setLineItemEdits({
                                  ...lineItemEdits,
                                  [li.id]: { ...lineItemEdits[li.id], quantity: e.target.value }
                                })}
                                style={{ width: 60 }}
                              />
                            ) : (li.quantity ?? li.totalUnits ?? "-")}
                          </td>
                          <td style={{ padding:6, textAlign:"right" }}>
                            {editMode ? (
                              <input
                                type="number"
                                value={lineItemEdits[li.id]?.subtotal || 0}
                                onChange={e => setLineItemEdits({
                                  ...lineItemEdits,
                                  [li.id]: { ...lineItemEdits[li.id], subtotal: e.target.value }
                                })}
                                style={{ width: 80 }}
                              />
                            ) : `RM ${Number(li.subtotal || (li.unitPrice * (li.quantity||0)) || 0).toFixed(2)}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ✅ Save button */}
              {editMode && (
                <div style={{ marginTop: 10 }}>
                  <button onClick={saveSaleEdits}>Save Changes</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
