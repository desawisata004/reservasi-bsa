// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyALzmkMAaJEwZO04OMAZaaWfcLBjYU2GCM",
    authDomain: "reservasi-kemah-bsa.firebaseapp.com",
    databaseURL: "https://reservasi-kemah-bsa-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "reservasi-kemah-bsa",
    storageBucket: "reservasi-kemah-bsa.firebasestorage.app",
    messagingSenderId: "883193001958",
    appId: "1:883193001958:web:9aa40ce72e83e0ac32c827"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Initialize default data if not exists
function initializeFirebaseData() {
    const defaultData = {
        settings: {
            perusahaan: {
                nama: "Bukit Sampalan Asri",
                hargaTiket: 15000,
                namaBank: "Bank BRI",
                norek: "4045-0100-1680-532",
                anRekening: "SUNARYA",
                noLayanan: "+62812-9639-2270"
            },
            dpPercentage: 50,
            jamCheckin: "14:00",
            jamCheckout: "12:00",
            maxLapakPerReservasi: 30
        },
        users: {
            admin: {
                id: 1,
                nama: "Admin Utama",
                username: "admin",
                password: "admin123", // In production, use proper hashing
                role: "admin"
            },
            staff: {
                id: 2,
                nama: "Staff Reservasi",
                username: "staff",
                password: "staff123",
                role: "staff"
            }
        },
        lapakTenda: generateDefaultLapak(),
        glamping: generateDefaultGlamping(),
        barangSewa: generateDefaultBarang(),
        akomodasiLainnya: generateDefaultAkomodasi()
    };

    // Check and set default data
    database.ref('settings').once('value').then((snapshot) => {
        if (!snapshot.exists()) {
            // Set all default data
            database.ref().set(defaultData).then(() => {
                console.log("Default data initialized successfully");
            }).catch((error) => {
                console.error("Error initializing default data:", error);
            });
        }
    });
}

function generateDefaultLapak() {
    const lapak = [];
    for (let i = 1; i <= 30; i++) {
        lapak.push({
            kode: `L${i.toString().padStart(2, '0')}`,
            harga: 0,
            kapasitas: 4,
            status: 'tersedia'
        });
    }
    return lapak;
}

function generateDefaultGlamping() {
    return [
        { kode: 'G01', nama: 'Glamping Tipe A (4pax)', harga: 150000, kapasitas: 4, status: 'tersedia' },
        { kode: 'G02', nama: 'Glamping Tipe A (4pax)', harga: 150000, kapasitas: 4, status: 'tersedia' },
        { kode: 'G03', nama: 'Glamping Tipe A (4pax)', harga: 150000, kapasitas: 4, status: 'tersedia' },
        { kode: 'G04', nama: 'Glamping Tipe A (4pax)', harga: 150000, kapasitas: 4, status: 'tersedia' },
        { kode: 'G05', nama: 'Glamping Tipe A (4pax)', harga: 150000, kapasitas: 4, status: 'tersedia' }
    ];
}

function generateDefaultBarang() {
    return [
        { id: 1, nama: "Tenda Dome Kapasitas 4", harga: 70000, satuan: "hari", stok: 15 },
        { id: 2, nama: "Sleeping Bag", harga: 10000, satuan: "hari", stok: 30 },
        { id: 3, nama: "Matras", harga: 5000, satuan: "hari", stok: 30 },
        { id: 4, nama: "Kompor Portable", harga: 15000, satuan: "hari", stok: 10 }
    ];
}

function generateDefaultAkomodasi() {
    return [
        { id: 1, nama: "Tenda Dome 3 Orang", harga: 60000, satuan: "unit", stok: 15 },
        { id: 2, nama: "Kayu Bakar (1 pack)", harga: 10000, satuan: "pack", stok: 50 },
        { id: 3, nama: "Kasur Lipat", harga: 15000, satuan: "unit", stok: 20 },
        { id: 4, nama: "Nasi Liwet Porsi Keluarga", harga: 20000, satuan: "porsi", stok: 30 }
    ];
}

// Export for use in other files
window.firebaseApp = {
    app,
    database,
    auth,
    initializeFirebaseData
};

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
    initializeFirebaseData();
});