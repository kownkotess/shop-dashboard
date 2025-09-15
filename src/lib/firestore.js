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
  getDocs
} from "firebase/firestore";

const productsCol = collection(db, "products");
const salesCol = collection(db, "sales");

// Create product
export async function addProduct(data) {
  return await addDoc(productsCol, {
    ...data,
    createdAt: serverTimestamp(),
    startingStock: Number(data.startingStock || 0),
    totalPurchased: Number(data.totalPurchased || 0),
    quantitySold: Number(data.quantitySold || 0),
    balance: Number(data.balance ?? (data.startingStock || 0)),
    unitPrice: Number(data.unitPrice || 0),
    smallBulkQty: Number(data.smallBulkQty || 0),
    smallBulkPrice: Number(data.smallBulkPrice || 0),
    bigBulkQty: Number(data.bigBulkQty || 0),
    bigBulkPrice: Number(data.bigBulkPrice || 0),
    reorderPoint: Number(data.reorderPoint || 0)
  });
}

// One-time fetch of products (used by SalesForm)
export async function getProducts() {
  const q = query(productsCol, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || data.productName || "",
      price: Number(data.unitPrice ?? data.price ?? 0),
      startingStock: Number(data.startingStock ?? 0),
      smallBulkQty: Number(data.smallBulkQty ?? 0),
      smallBulkPrice: Number(data.smallBulkPrice ?? 0),
      bigBulkQty: Number(data.bigBulkQty ?? 0),
      bigBulkPrice: Number(data.bigBulkPrice ?? 0),
      balance: Number(data.balance ?? 0),
      ...data
    };
  });
}

// Real-time listener for all products
export function subscribeProducts(callback) {
  const q = query(productsCol, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

// Update product
export async function updateProduct(productId, updates) {
  const ref = doc(db, "products", productId);
  await updateDoc(ref, updates);
}

// Delete product
export async function deleteProduct(productId) {
  await deleteDoc(doc(db, "products", productId));
}

// Adjust stock helper (example)
export async function adjustProductStock(
  productId,
  deltaPurchased = 0,
  deltaSold = 0
) {
  const productRef = doc(db, "products", productId);
  await runTransaction(db, async (t) => {
    const snap = await t.get(productRef);
    if (!snap.exists()) throw new Error("Product not found");
    const prod = snap.data();
    const newTotalPurchased = (prod.totalPurchased || 0) + deltaPurchased;
    const newQuantitySold = (prod.quantitySold || 0) + deltaSold;
    const newBalance =
      (prod.startingStock || 0) + newTotalPurchased - newQuantitySold;
    t.update(productRef, {
      totalPurchased: newTotalPurchased,
      quantitySold: newQuantitySold,
      balance: newBalance,
    });
  });
}

// Sales helpers: realtime & line items fetch
export function subscribeSales(callback) {
  const q = query(salesCol, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

export async function getSaleLineItems(saleId) {
  const liCol = collection(db, "sales", saleId, "lineItems");
  const snap = await getDocs(liCol);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Create Sale (transaction-safe, reads first then writes)
// sale.items expected as array with at least:
// either { quantity, price } OR the normalized items we build in SalesForm:
// { productId, productName, quantity, price, subtotal, bigBoxes, smallPacks, looseUnits }
export async function createSale(sale) {
  if (!sale || !Array.isArray(sale.items) || sale.items.length === 0) {
    throw new Error("createSale: sale.items must be a non-empty array");
  }

  // new sale doc reference (auto id)
  const newSaleRef = doc(collection(db, "sales"));

  try {
    await runTransaction(db, async (transaction) => {
      // 1) READ PHASE: read all related product docs first
      const productSnapMap = {}; // productId -> { snap, ref }
      for (const li of sale.items) {
        const prodRef = doc(db, "products", li.productId);
        const snap = await transaction.get(prodRef);
        if (!snap.exists()) throw new Error("Product not found: " + li.productId);
        productSnapMap[li.productId] = { snap, ref: prodRef };
      }

      // 2) Validate stock levels (use li.quantity which SalesForm provides)
      for (const li of sale.items) {
        const prodData = productSnapMap[li.productId].snap.data();
        const currentStock = Number(prodData.startingStock ?? prodData.balance ?? 0);
        const want = Number(li.quantity || li.totalUnits || 0);
        if (want > currentStock) {
          throw new Error(`Not enough stock for ${li.productName || li.name || prodData.name || li.productId}`);
        }
      }

      // 3) WRITE PHASE: compute totals and write sale doc (reads are done)
      let computedTotal;
      if (sale.total != null) {
        computedTotal = Number(sale.total);
      } else {
        computedTotal = Number(
          sale.items.reduce((s, i) => {
            const unitPrice = Number(i.price ?? i.unitPrice ?? 0);
            const qty = Number(i.quantity ?? i.totalUnits ?? 0);
            return s + (unitPrice * qty);
          }, 0)
        );
      }

      // Normalize payment type: store either "Cash" or "Online Transfer"
      const paymentRaw = String(sale.paymentType || "Cash");
      const paymentNormalized = paymentRaw.toLowerCase().includes("cash") ? "Cash" : "Online Transfer";
      const isOnline = paymentNormalized !== "Cash";
      const cashTotal = isOnline ? 0 : computedTotal;
      const onlineTotal = isOnline ? computedTotal : 0;

      transaction.set(newSaleRef, {
        ...(sale.customer ? { customer: sale.customer } : { customer: "Walk-in" }),
        total: computedTotal,
        paymentType: paymentNormalized,
        cashTotal,
        onlineTotal,
        createdAt: serverTimestamp(),
      });

      // update products and create line item docs under sale
      for (const li of sale.items) {
        const { ref: prodRef, snap } = productSnapMap[li.productId];
        const prod = snap.data();

        const soldDelta = Number(li.quantity || li.totalUnits || 0);
        const newQuantitySold = (prod.quantitySold || 0) + soldDelta;
        const currentStock = Number(prod.startingStock ?? prod.balance ?? 0);
        const newStartingStock = currentStock - soldDelta;
        const newBalance = newStartingStock;

        transaction.update(prodRef, {
          quantitySold: newQuantitySold,
          startingStock: newStartingStock,
          balance: newBalance
        });

        const liRef = doc(collection(newSaleRef, "lineItems"));

        const unitPrice = Number((li.price ?? li.unitPrice) || 0);
        const qty = Number(li.quantity || li.totalUnits || 0);
        const subtotal = Number(li.subtotal ?? (unitPrice * qty) ?? 0);

        transaction.set(liRef, {
          productId: li.productId,
          productName: li.productName ?? li.name ?? prod.name ?? "",
          unitPrice,
          quantity: qty,
          subtotal,
          // keep breakdown if provided (helpful for history)
          bigBoxes: li.bigBoxes ?? null,
          bigBulkQty: li.bigBulkQty ?? null,
          bigBulkPrice: li.bigBulkPrice ?? null,
          smallPacks: li.smallPacks ?? null,
          smallBulkQty: li.smallBulkQty ?? null,
          smallBulkPrice: li.smallBulkPrice ?? null,
          looseUnits: li.looseUnits ?? null,
          loosePrice: li.loosePrice ?? null,
          createdAt: serverTimestamp()
        });
      }
    });

    // return the newly created sale id
    return newSaleRef.id;
  } catch (err) {
    console.error("createSale transaction failed:", err);
    throw err;
  }
}
