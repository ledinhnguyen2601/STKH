// Import các hàm cần thiết từ Firebase SDK (Phiên bản 10.x)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  enableIndexedDbPersistence,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 🔴 BƯỚC 1: THAY THẾ ĐOẠN NÀY BẰNG FIREBASE CONFIG CỦA BẠN
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Khởi tạo Firebase và Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Kích hoạt tính năng lưu Offline (Đáp ứng yêu cầu đi chợ không có mạng)
enableIndexedDbPersistence(db).catch((err) => {
  console.log("Lỗi khởi tạo offline: ", err.code);
});

// Tham chiếu đến bảng "expenses" trong Database
const expensesCollection = collection(db, "expenses");

// --- LOGIC ĐĂNG NHẬP (Giữ nguyên như cũ) ---
const correctPassword = "1234";

document.getElementById("btnLogin").addEventListener("click", () => {
  const pwd = document.getElementById("room-password").value;
  if (pwd === correctPassword) {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("app-section").style.display = "block";
    loadDataRealtime(); // Chỉ tải dữ liệu khi đăng nhập thành công
  } else {
    document.getElementById("login-error").style.display = "block";
  }
});

document.getElementById("btnLogout").addEventListener("click", () => {
  document.getElementById("login-section").style.display = "block";
  document.getElementById("app-section").style.display = "none";
  document.getElementById("room-password").value = "";
});

// --- LOGIC QUẢN LÝ DỮ LIỆU FIREBASE ---

// 1. Thêm khoản chi mới lên Firebase
document.getElementById("btnAddExpense").addEventListener("click", async () => {
  const name = document.getElementById("itemName").value;
  const price = document.getElementById("itemPrice").value;
  const payer = document.getElementById("payerName").value;

  if (!name || !price || !payer) {
    alert("Vui lòng nhập đầy đủ thông tin!");
    return;
  }

  try {
    await addDoc(expensesCollection, {
      name: name,
      price: parseInt(price),
      payer: payer,
      timestamp: new Date(), // Dùng thời gian thực để sắp xếp
      dateString: new Date().toLocaleDateString("vi-VN"),
    });

    // Xóa trắng form
    document.getElementById("itemName").value = "";
    document.getElementById("itemPrice").value = "";
  } catch (e) {
    console.error("Lỗi khi thêm: ", e);
  }
});

// 2. Lấy dữ liệu Realtime (Tự động cập nhật khi người khác thêm vào)
function loadDataRealtime() {
  // Truy vấn sắp xếp theo thời gian mới nhất
  const q = query(expensesCollection, orderBy("timestamp", "desc"));

  onSnapshot(q, (snapshot) => {
    const listElement = document.getElementById("expenseList");
    listElement.innerHTML = "";
    let total = 0;

    // Trạng thái mạng
    const isOffline = snapshot.metadata.fromCache;
    document.getElementById("network-status").innerText = isOffline
      ? "Đang Offline (Lưu tạm)"
      : "Đã đồng bộ Online";
    document.getElementById("network-status").style.backgroundColor = isOffline
      ? "#ff9800"
      : "#4caf50";

    snapshot.forEach((docSnap) => {
      const item = docSnap.data();
      const id = docSnap.id;
      total += item.price;

      const li = document.createElement("li");
      li.innerHTML = `
                <div>
                    <strong>${item.name}</strong> - ${item.price.toLocaleString("vi-VN")} VNĐ <br>
                    <small>Người mua: ${item.payer} (${item.dateString})</small>
                </div>
                <button class="delete-btn" data-id="${id}">Xóa</button>
            `;
      listElement.appendChild(li);
    });

    document.getElementById("totalAmount").innerText =
      total.toLocaleString("vi-VN");

    // Gắn sự kiện xóa cho các nút vừa tạo
    const deleteButtons = document.querySelectorAll(".delete-btn");
    deleteButtons.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const docId = e.target.getAttribute("data-id");
        if (confirm("Bạn có chắc muốn xóa khoản này không?")) {
          await deleteDoc(doc(db, "expenses", docId));
        }
      });
    });
  });
}
