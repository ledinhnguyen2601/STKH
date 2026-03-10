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
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// MÃ CẤU HÌNH MỚI TINH TỪ APP QLDS
const firebaseConfig = {
  apiKey: "AIzaSyCjHwQeiqR1qTAS9RBwfJKUXrQDSRJkNkY",
  authDomain: "portfolio-k12a1-nau.firebaseapp.com",
  projectId: "portfolio-k12a1-nau",
  storageBucket: "portfolio-k12a1-nau.firebasestorage.app",
  messagingSenderId: "537336340193",
  appId: "1:537336340193:web:d25a8c6a90152bfc6aa1a0",
  measurementId: "G-01MB4141EE",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Khởi tạo Auth

enableIndexedDbPersistence(db).catch((err) => {
  console.log("Lỗi offline: ", err.code);
});

const expensesCollection = collection(db, "expenses");
let currentMonthExpenses = [];
let activeUser = ""; // Lưu email người đang dùng

// --- 1. LẮNG NGHE TRẠNG THÁI ĐĂNG NHẬP ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Đã đăng nhập
    activeUser = user.email.split("@")[0];
    document.getElementById("currentUserDisplay").innerText = activeUser;
    document.getElementById("login-section").style.display = "none";
    document.getElementById("app-section").style.display = "block";
    loadDataRealtime();
  } else {
    // Chưa đăng nhập
    document.getElementById("login-section").style.display = "block";
    document.getElementById("app-section").style.display = "none";
  }
});

// --- 2. ĐĂNG KÝ ---
document.getElementById("btnRegister").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorMsg = document.getElementById("login-error");

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Đăng ký thành công! Đã tự động đăng nhập.");
  } catch (error) {
    errorMsg.style.display = "block";
    errorMsg.innerText = "Lỗi đăng ký: " + error.message;
  }
});

// --- 3. ĐĂNG NHẬP & ĐĂNG XUẤT ---
document.getElementById("btnLogin").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorMsg = document.getElementById("login-error");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    errorMsg.style.display = "none";
  } catch (error) {
    errorMsg.style.display = "block";
    errorMsg.innerText = "Sai email hoặc mật khẩu!";
  }
});

document.getElementById("btnLogout").addEventListener("click", async () => {
  await signOut(auth);
});

// --- 4. THÊM KHOẢN CHI ---
document.getElementById("btnAddExpense").addEventListener("click", async () => {
  const nameInput = document.getElementById("itemName");
  const priceInput = document.getElementById("itemPrice");
  const btnAdd = document.getElementById("btnAddExpense");

  const name = nameInput.value;
  const price = priceInput.value;

  if (!name || !price) return alert("Vui lòng nhập đầy đủ thông tin!");

  btnAdd.disabled = true;
  btnAdd.innerText = "Đang lưu...";
  btnAdd.style.backgroundColor = "#6c757d";

  try {
    await addDoc(expensesCollection, {
      name: name,
      price: parseInt(price),
      payer: activeUser,
      timestamp: new Date(),
      dateString: new Date().toLocaleDateString("vi-VN"),
    });

    nameInput.value = "";
    priceInput.value = "";
  } catch (e) {
    alert("Lưu thất bại. Dữ liệu đã được lưu tạm offline.");
  } finally {
    btnAdd.disabled = false;
    btnAdd.innerText = "Thêm khoản chi";
    btnAdd.style.backgroundColor = "#28a745";
  }
});

// --- 5. HIỂN THỊ DỮ LIỆU ---
function loadDataRealtime() {
  const q = query(expensesCollection, orderBy("timestamp", "desc"));

  onSnapshot(q, (snapshot) => {
    const listElement = document.getElementById("expenseList");
    listElement.innerHTML = "";
    let total = 0;
    currentMonthExpenses = [];

    const isOffline = snapshot.metadata.fromCache;
    document.getElementById("network-status").innerText = isOffline
      ? "Đang Offline (Lưu tạm)"
      : "Đã đồng bộ Online";
    document.getElementById("network-status").style.backgroundColor = isOffline
      ? "#ff9800"
      : "#4caf50";

    snapshot.forEach((docSnap) => {
      const item = docSnap.data();
      currentMonthExpenses.push(item);
      total += item.price;

      const li = document.createElement("li");
      li.innerHTML = `
        <div>
            <strong>${item.name}</strong> - ${item.price.toLocaleString("vi-VN")} VNĐ <br>
            <small>Người mua: ${item.payer} (${item.dateString})</small>
        </div>
        <button class="delete-btn" data-id="${docSnap.id}">Xóa</button>
      `;
      listElement.appendChild(li);
    });

    document.getElementById("totalAmount").innerText =
      total.toLocaleString("vi-VN");

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        if (confirm("Bạn có chắc muốn xóa khoản này không?")) {
          await deleteDoc(
            doc(db, "expenses", e.target.getAttribute("data-id")),
          );
        }
      });
    });
  });
}

// --- 6. THUẬT TOÁN CHỐT SỔ TỰ ĐỘNG ---
document.getElementById("btnSettle").addEventListener("click", () => {
  const numPeople = parseInt(
    prompt("Nhập tổng số người trong phòng trọ:", "3"),
  );
  if (isNaN(numPeople) || numPeople <= 0)
    return alert("Số người không hợp lệ!");

  let totalSpent = 0;
  let paidByMember = {};

  currentMonthExpenses.forEach((exp) => {
    totalSpent += exp.price;
    if (!paidByMember[exp.payer]) paidByMember[exp.payer] = 0;
    paidByMember[exp.payer] += exp.price;
  });

  if (totalSpent === 0) return alert("Chưa có khoản chi nào để chốt sổ!");

  const average = totalSpent / numPeople;

  const resultList = document.getElementById("settlementList");
  resultList.innerHTML = `<li style="color: blue;"><strong>💵 Trung bình mỗi người chịu:</strong> ${Math.round(average).toLocaleString("vi-VN")} VNĐ</li>`;

  for (const member in paidByMember) {
    const balance = paidByMember[member] - average;
    let statusText = "";
    let color = "";

    if (balance > 0) {
      statusText = `Được nhận lại: +${Math.round(balance).toLocaleString("vi-VN")} VNĐ`;
      color = "green";
    } else if (balance < 0) {
      statusText = `Cần đóng thêm: ${Math.round(Math.abs(balance)).toLocaleString("vi-VN")} VNĐ`;
      color = "red";
    } else {
      statusText = "Đã đóng đủ (Không cần bù)";
      color = "gray";
    }

    const li = document.createElement("li");
    li.innerHTML = `<strong>Tài khoản: ${member}</strong> (Đã chi: ${paidByMember[member].toLocaleString("vi-VN")}) <br> <span style="color: ${color}; font-weight: bold;">${statusText}</span>`;
    resultList.appendChild(li);
  }

  const liNote = document.createElement("li");
  liNote.innerHTML = `<em>*Những người không có tên ở trên cần đóng nguyên mức trung bình.</em>`;
  resultList.appendChild(liNote);

  document.getElementById("settlementResult").style.display = "block";
});
