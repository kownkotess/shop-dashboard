// src/lib/firestore.js
import { db } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  getDocs,
  where
} from "firebase/firestore";

const productsCol = collection(db, "products");
const salesCol = collection(db, "sales");
const paymentsCol = collection(db, "payments"); // top-level payments for easy reporting

// --------------------
// Add product (keep numeric fields safe)
// --------------------
export async function addProduct(data) {
  return await addDoc(productsCol, {
    ...data,
    createdAt: serverTimestamp(),
    startingStock: Number(data.startingStock || 0),
    totalPurchased: Number(data.totalPurchased || 0),
    quantitySold: Number(data.quantitySold || 0),
    balance: Number(data.balance || data.startingStock || 0),
    unitPrice: Number(data.unitPrice || 0),
    smallBulkQty: Number(data.smallBulkQty || 0),
    smallBulkPrice: Number(data.smallBulkPrice || 0),
    bigBulkQty: Number(data.bigBulkQty || 0),
    bigBulkPrice: Number(data.bigBulkPrice || 0),
    reorderPoint: Number(data.reorderPoint || 0),
  });
}

// --------------------
// One-time fetch of products (used by Sales UI)
// --------------------
export async function getProducts() {
  const q = query(productsCol, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || data.productName || "",
      price: Number(data.unitPrice || data.price || 0),
      startingStock: Number(data.startingStock || 0),
      smallBulkQty: Number(data.smallBulkQty || 0),
      smallBulkPrice: Number(data.smallBulkPrice || 0),
      bigBulkQty: Number(data.bigBulkQty || 0),
      bigBulkPrice: Number(data.bigBulkPrice || 0),
      balance: Number(data.balance || 0),
      ...data
    };
  });
}

// --------------------
// Real-time products listener
// --------------------
export function subscribeProducts(callback) {
  const q = query(productsCol, orderBy("createdAt", "desc"));
  return onSnapshot(q, snapshot => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

// --------------------
// Sales real-time listener
// --------------------
export function subscribeSales(callback) {
  const q = query(salesCol, orderBy("createdAt", "desc"));
  return onSnapshot(q, snapshot => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

// --------------------
// Subscribe Hutang (client-side filter for remaining > 0)
// --------------------
export function subscribeHutang(callback) {
  // get all sales then filter client-side (avoids extra index requirements).
  const unsub = subscribeSales(all => {
    const hutang = all.filter(s => Number(s.remaining || s.total || 0) > 0);
    callback(hutang);
  });
  return unsub;
}

// --------------------
// Get sale line items
// --------------------
export async function getSaleLineItems(saleId) {
  const liCol = collection(db, "sales", saleId, "lineItems");
  const snap = await getDocs(liCol);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --------------------
// Helper: compute total units for a line item (supports many formats)
// --------------------
function computeUnitsFromLineItem(li, prod = {}) {
  if (typeof li.totalUnits === "number") return Number(li.totalUnits || 0);
  // prefer explicit values, otherwise fall back to product's pack sizes
  const bigPerBox = Number(li.bigBoxQty || prod.bigBulkQty || 0);
  const smallPerPack = Number(li.smallPackQty || prod.smallBulkQty || 0);
  const big = Number(li.bigBoxes || 0) * bigPerBox;
  const small = Number(li.smallPacks || 0) * smallPerPack;
  const loose = Number(li.looseUnits || li.quantity || 0);
  return big + small + loose;
}

// --------------------
// Create Sale (transaction-safe). Supports paymentType: "Cash", "Online Transfer", "Hutang".
// If paymentType === "Hutang" the sale will be created as unpaid (paidAmount:0, remaining:total).
// Also creates lineItems subcollection under sale and updates product stocks (transactionally).
// --------------------
export async function createSale(sale) {
  if (!sale || !Array.isArray(sale.items) || sale.items.length === 0) {
    throw new Error("createSale: sale.items must be a non-empty array");
  }

  const newSaleRef = doc(collection(db, "sales"));

  try {
    const saleId = await runTransaction(db, async (transaction) => {
      // READ PHASE: read all product docs referenced
      const productMap = {}; // productId -> { snap, ref }
      for (const li of sale.items) {
        const prodRef = doc(db, "products", li.productId);
        const snap = await transaction.get(prodRef);
        if (!snap.exists()) throw new Error("Product not found: " + li.productId);
        productMap[li.productId] = { snap, ref: prodRef };
      }

      // Validate stock
      for (const li of sale.items) {
        const prodSnap = productMap[li.productId].snap;
        const prodData = prodSnap.data();
        const currentStock = Number(prodData.startingStock || prodData.balance || 0);
        const want = computeUnitsFromLineItem(li, prodData);
        if (want > currentStock) {
          throw new Error(`Not enough stock for ${li.productName || li.name || prodData.name || li.productId}`);
        }
      }

      // WRITE PHASE

      // compute total (use sale.total if provided, otherwise sum line subtotals or compute)
      const computedTotal = Number(
        (sale.total !== undefined && sale.total !== null)
          ? sale.total
          : sale.items.reduce((s, i) => {
              // subtotal if provided, otherwise compute using prices
              if (i.subtotal !== undefined && i.subtotal !== null) return s + Number(i.subtotal || 0);
              const prod = productMap[i.productId].snap.data();
              const unitPrice = Number(i.discountedUnitPrice || i.unitPrice || prod.unitPrice || prod.price || 0);
              const bigPrice = Number(i.discountedBigPrice || i.bigBoxPrice || prod.bigBulkPrice || 0);
              const smallPrice = Number(i.discountedSmallPrice || i.smallPackPrice || prod.smallBulkPrice || 0);
              const units = computeUnitsFromLineItem(i, prod);
              // fallback: if the item supplies quantity only (i.quantity) assume unitPrice
              if (i.quantity !== undefined && i.quantity !== null) {
                return s + (Number(i.quantity) * (Number(i.price || unitPrice || 0)));
              }
              // otherwise use the big/small/loose breakdown
              const bigUnits = Number(i.bigBoxes || 0) * Number(i.bigBoxQty || prod.bigBulkQty || 0);
              const smallUnits = Number(i.smallPacks || 0) * Number(i.smallPackQty || prod.smallBulkQty || 0);
              const looseUnits = Number(i.looseUnits || 0);
              // compute subtotal with the appropriate prices
              const sub = (Number(i.bigBoxes || 0) * bigPrice) +
                          (Number(i.smallPacks || 0) * smallPrice) +
                          (Number(i.looseUnits || 0) * unitPrice);
              return s + Number(sub || 0);
            }, 0)
      );

      // set initial paid / cash / online totals depending on sale.paymentType
      const ptype = (sale.paymentType || "").toString().toLowerCase();
      let cashTotal = 0;
      let onlineTotal = 0;
      let paidAmount = 0;
      if (ptype === "cash") {
        cashTotal = computedTotal;
        paidAmount = computedTotal;
      } else if (ptype === "online" || ptype === "online transfer" || ptype === "transfer") {
        onlineTotal = computedTotal;
        paidAmount = computedTotal;
      } else {
        // Hutang or unknown -> leave paidAmount 0
        paidAmount = 0;
      }
      const remaining = Number(computedTotal - paidAmount);
      const status = remaining > 0 ? "Hutang" : "Paid";

      // write sale doc
      transaction.set(newSaleRef, {
        customer: sale.customer || "",
        total: Number(computedTotal || 0),
        paymentType: sale.paymentType || "Cash",
        cashTotal: Number(cashTotal || 0),
        onlineTotal: Number(onlineTotal || 0),
        paidAmount: Number(paidAmount || 0),
        remaining: Number(remaining || 0),
        status,
        createdAt: serverTimestamp(),
      });

      // update each product (stock and quantitySold) and create line items under sale
      for (const li of sale.items) {
        const { ref: prodRef, snap } = productMap[li.productId];
        const prod = snap.data();

        const unitsSold = computeUnitsFromLineItem(li, prod);
        const newQuantitySold = (prod.quantitySold || 0) + unitsSold;
        const currentStock = Number(prod.startingStock || prod.balance || 0);
        const newStartingStock = currentStock - unitsSold;
        const newBalance = newStartingStock;

        transaction.update(prodRef, {
          quantitySold: newQuantitySold,
          startingStock: newStartingStock,
          balance: newBalance
        });

        const liRef = doc(collection(newSaleRef, "lineItems"));
        transaction.set(liRef, {
          productId: li.productId,
          productName: li.productName || li.name || prod.name || "",
          unitPrice: Number(li.unitPrice || prod.unitPrice || prod.price || 0),
          bigBoxQty: Number(li.bigBoxQty || prod.bigBulkQty || 0),
          bigBoxes: Number(li.bigBoxes || 0),
          smallPackQty: Number(li.smallPackQty || prod.smallBulkQty || 0),
          smallPacks: Number(li.smallPacks || 0),
          looseUnits: Number(li.looseUnits || 0),
          totalUnits: Number(unitsSold || 0),
          subtotal: Number(li.subtotal || 0),
          discountedBigPrice: li.discountedBigPrice || null,
          discountedSmallPrice: li.discountedSmallPrice || null,
          discountedUnitPrice: li.discountedUnitPrice || null,
          createdAt: serverTimestamp()
        });
      }

      return newSaleRef.id;
    });

    return saleId;
  } catch (err) {
    console.error("createSale transaction failed:", err);
    throw err;
  }
}

// --------------------
// Record a payment for an existing sale (partial or full).
// --------------------
export async function recordPayment(saleId, amount, paymentType) {
  const saleRef = doc(db, "sales", saleId);
  const paymentTopRef = doc(paymentsCol); // top-level payment doc
  try {
    const paymentId = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(saleRef);
      if (!snap.exists()) throw new Error("Sale not found: " + saleId);
      const saleData = snap.data();
      const total = Number(saleData.total || 0);
      const prevPaid = Number(saleData.paidAmount || 0);
      const prevCash = Number(saleData.cashTotal || 0);
      const prevOnline = Number(saleData.onlineTotal || 0);

      const amt = Number(amount || 0);
      if (amt <= 0) throw new Error("Payment amount must be > 0");

      const newPaid = prevPaid + amt;
      const newRemaining = Math.max(0, total - newPaid);
      const newStatus = newRemaining > 0 ? "Hutang" : "Paid";

      // update sale totals according to paymentType
      const pty = (paymentType || "Cash").toString().toLowerCase();
      let newCash = prevCash;
      let newOnline = prevOnline;
      if (pty === "cash") newCash = prevCash + amt;
      else newOnline = prevOnline + amt;

      transaction.update(saleRef, {
        paidAmount: newPaid,
        remaining: newRemaining,
        status: newStatus,
        cashTotal: newCash,
        onlineTotal: newOnline
      });

      // create payment doc under sale
      const salePaymentRef = doc(collection(saleRef, "payments"));
      transaction.set(salePaymentRef, {
        amount: amt,
        paymentType,
        createdAt: serverTimestamp()
      });

      // create top-level payment record for querying/reporting
      transaction.set(paymentTopRef, {
        saleId,
        amount: amt,
        paymentType,
        createdAt: serverTimestamp()
      });

      return paymentTopRef.id;
    });

    return paymentId;
  } catch (err) {
    console.error("recordPayment failed:", err);
    throw err;
  }
}

// --------------------
// Totals for a period
// --------------------
export async function getTotalsForPeriod(startDate, endDate) {
  const salesQuery = query(salesCol, where("createdAt", ">=", startDate), where("createdAt", "<", endDate));
  const paymentsQuery = query(paymentsCol, where("createdAt", ">=", startDate), where("createdAt", "<", endDate));

  const [salesSnap, paymentsSnap] = await Promise.all([getDocs(salesQuery), getDocs(paymentsQuery)]);

  let cashTotal = 0;
  let onlineTotal = 0;

  salesSnap.forEach(docSnap => {
    const d = docSnap.data();
    cashTotal += Number(d.cashTotal || 0);
    onlineTotal += Number(d.onlineTotal || 0);
  });

  paymentsSnap.forEach(docSnap => {
    const d = docSnap.data();
    const pty = (d.paymentType || "").toString().toLowerCase();
    if (pty === "cash") cashTotal += Number(d.amount || 0);
    else onlineTotal += Number(d.amount || 0);
  });

  return { cashTotal, onlineTotal };
}

// --------------------
// Delete product helper
// --------------------
export async function deleteProduct(productId) {
  await deleteDoc(doc(db, "products", productId));
}

// --------------------
// Update product helper
// --------------------
export async function updateProduct(productId, updates) {
  const ref = doc(db, "products", productId);
  await updateDoc(ref, updates);
}

// ✅ Update a sale (e.g., change paymentType or customer)
export async function updateSale(saleId, updates) {
  const ref = doc(db, "sales", saleId);
  await updateDoc(ref, updates);
  return true;
}

// ✅ Update a line item (e.g., change product or quantity)
export async function updateLineItem(saleId, lineItemId, updates) {
  const ref = doc(db, "sales", saleId, "lineItems", lineItemId);
  await updateDoc(ref, updates);
  return true;
}