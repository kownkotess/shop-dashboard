// src/lib/firestore.js
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction
} from "firebase/firestore";
import { db } from "../firebase";

const productsCol = collection(db, "products");

// Create product
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
    reorderPoint: Number(data.reorderPoint || 0)
  });
}

// Real-time listener for all products
export function subscribeProducts(callback) {
  const q = query(productsCol, orderBy("createdAt", "desc"));
  return onSnapshot(q, snapshot => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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

// Utility: safe update stock after sale or purchase (example)
export async function adjustProductStock(productId, deltaPurchased = 0, deltaSold = 0) {
  const productRef = doc(db, "products", productId);
  await runTransaction(db, async (t) => {
    const snap = await t.get(productRef);
    if (!snap.exists()) throw new Error("Product not found");
    const prod = snap.data();
    const newTotalPurchased = (prod.totalPurchased || 0) + deltaPurchased;
    const newQuantitySold = (prod.quantitySold || 0) + deltaSold;
    const newBalance = (prod.startingStock || 0) + newTotalPurchased - newQuantitySold;
    t.update(productRef, {
      totalPurchased: newTotalPurchased,
      quantitySold: newQuantitySold,
      balance: newBalance
    });
  });
}
