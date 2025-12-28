// Global variables
let currentUser = null;
let appData = {
    settings: {},
    lapakTenda: [],
    glamping: [],
    reservasi: [],
    invoice: [],
    users: {},
    barangSewa: [],
    akomodasiLainnya: []
};

// Utility functions
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
}

function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

function formatDateID(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('id-ID', options);
}

function generateInvoiceCode() {
    const now = new Date();
    const datePart = [
        now.getFullYear().toString().slice(-2),
        (now.getMonth() + 1).toString().padStart(2, '0'),
        now.getDate().toString().padStart(2, '0')
    ].join('');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INV-${datePart}-${randomPart}`;
}

function showLoading(message = 'Memuat...') {
    document.getElementById('loading-message').textContent = message;
    document.getElementById('loading-modal').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-modal').style.display = 'none';
}

// Authentication
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('login-error');

    if (!username || !password) {
        errorElement.textContent = 'Harap isi username dan password!';
        errorElement.classList.remove('hidden');
        return;
    }

    showLoading('Memeriksa login...');

    try {
        // In production, use Firebase Authentication
        // For demo, we'll check against Firebase Realtime Database
        const usersRef = firebase.database().ref('users');
        const snapshot = await usersRef.once('value');
        const users = snapshot.val();

        let userFound = null;
        for (const key in users) {
            if (users[key].username === username && users[key].password === password) {
                userFound = users[key];
                userFound.id = key;
                break;
            }
        }

        if (userFound) {
            currentUser = userFound;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            errorElement.classList.add('hidden');
            
            // Load all data
            await loadAllData();
            
            // Show main app
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').classList.remove('hidden');
            
            // Initialize UI
            initializeUI();
            
            // Update sync status
            updateSyncStatus(true);
        } else {
            errorElement.textContent = 'Username atau password salah!';
            errorElement.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorElement.textContent = 'Terjadi kesalahan saat login. Coba lagi.';
        errorElement.classList.remove('hidden');
    } finally {
        hideLoading();
    }
}

function logout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        currentUser = null;
        localStorage.removeItem('currentUser');
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }
}

// Data Loading
async function loadAllData() {
    showLoading('Memuat data...');
    
    try {
        const refs = {
            settings: firebase.database().ref('settings'),
            lapakTenda: firebase.database().ref('lapakTenda'),
            glamping: firebase.database().ref('glamping'),
            reservasi: firebase.database().ref('reservasi'),
            invoice: firebase.database().ref('invoice'),
            barangSewa: firebase.database().ref('barangSewa'),
            akomodasiLainnya: firebase.database().ref('akomodasiLainnya'),
            users: firebase.database().ref('users')
        };

        const promises = Object.keys(refs).map(key =>
            refs[key].once('value').then(snapshot => {
                appData[key] = snapshot.val() || [];
            })
        );

        await Promise.all(promises);
        
        // Convert object to array if needed
        if (appData.reservasi && typeof appData.reservasi === 'object') {
            appData.reservasi = Object.values(appData.reservasi);
        }
        if (appData.invoice && typeof appData.invoice === 'object') {
            appData.invoice = Object.values(appData.invoice);
        }
        
        console.log('Data loaded successfully:', appData);
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Gagal memuat data. Silahkan refresh halaman.');
    } finally {
        hideLoading();
    }
}

// Save data to Firebase
async function saveData(path, data) {
    try {
        await firebase.database().ref(path).set(data);
        updateSyncStatus(true);
        return true;
    } catch (error) {
        console.error('Error saving data:', error);
        updateSyncStatus(false);
        return false;
    }
}

// UI Functions
function initializeUI() {
    if (!currentUser) return;

    // Set user info
    document.getElementById('current-user').textContent = currentUser.nama;
    document.getElementById('user-role').textContent = currentUser.role.toUpperCase();
    document.getElementById('user-avatar').textContent = currentUser.nama.charAt(0).toUpperCase();
    
    // Show/hide admin sections
    document.querySelectorAll('.admin-only').forEach(el => {
        if (currentUser.role !== 'admin') {
            el.style.display = 'none';
        }
    });

    // Set today's date for filters
    const today = formatDate(new Date());
    document.getElementById('filter-tanggal').value = today;

    // Load initial sections
    showSection('dashboard');
    updateDashboard();
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });

    // Remove active class from all nav items
    document.querySelectorAll('nav a').forEach(a => {
        a.classList.remove('active');
    });

    // Show selected section
    document.getElementById(sectionId + '-section').classList.remove('hidden');
    
    // Set active nav item
    document.querySelector(`nav a[onclick="showSection('${sectionId}')"]`).classList.add('active');

    // Load section content
    switch (sectionId) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'reservasi':
            loadReservasiForm();
            break;
        case 'lapak':
            loadLapakStatus();
            break;
        case 'invoice':
            loadInvoiceList();
            break;
        case 'laporan':
            loadLaporan();
            break;
        case 'pengaturan':
            loadPengaturan();
            break;
        case 'users':
            loadUsers();
            break;
        case 'backup':
            loadBackup();
            break;
    }
}

function toggleMobileMenu() {
    document.getElementById('main-nav').classList.toggle('active');
}

// Dashboard Functions
async function updateDashboard() {
    const filterDate = document.getElementById('filter-tanggal').value || formatDate(new Date());
    
    // Calculate statistics
    const reservedLapak = await getReservedLapak('tenda', filterDate);
    const reservedGlamping = await getReservedLapak('glamping', filterDate);
    
    const lapakTerpakai = reservedLapak.length;
    const glampingTerpakai = reservedGlamping.length;
    const lapakTersedia = appData.lapakTenda.length - lapakTerpakai;
    
    let pengunjungHariIni = 0;
    let omzetHarian = 0;
    
    // Calculate pengunjung and omzet
    if (appData.reservasi && Array.isArray(appData.reservasi)) {
        appData.reservasi.forEach(r => {
            if (r.tanggalCheckin === filterDate && (r.status === 'aktif' || r.status === 'dibayar')) {
                pengunjungHariIni += parseInt(r.jumlahOrang) || 0;
            }
        });
    }
    
    if (appData.invoice && Array.isArray(appData.invoice)) {
        const today = formatDate(new Date());
        appData.invoice.forEach(inv => {
            if (inv.tanggalReservasi === today && (inv.status === 'dibayar' || inv.status === 'selesai')) {
                omzetHarian += parseInt(inv.totalBiaya) || 0;
            }
        });
    }
    
    // Update dashboard cards
    document.getElementById('lapak-tersedia').textContent = lapakTersedia;
    document.getElementById('lapak-terpakai').textContent = lapakTerpakai;
    document.getElementById('glamping-terpakai').textContent = glampingTerpakai;
    document.getElementById('pengunjung-hari-ini').textContent = pengunjungHariIni;
    document.getElementById('omzet-harian').textContent = formatRupiah(omzetHarian);
    
    // Update lapak status visualization
    const container = document.getElementById('lapak-status-container');
    container.innerHTML = '';
    
    if (appData.lapakTenda && Array.isArray(appData.lapakTenda)) {
        appData.lapakTenda.forEach(lapak => {
            const isReserved = reservedLapak.includes(lapak.kode);
            const item = document.createElement('div');
            item.className = `lapak-item ${isReserved ? 'lapak-terpakai' : 'lapak-tersedia'}`;
            item.textContent = lapak.kode;
            container.appendChild(item);
        });
    }
}

async function getReservedLapak(jenis, tanggal) {
    const reserved = [];
    
    if (!appData.reservasi || !Array.isArray(appData.reservasi)) return reserved;
    
    appData.reservasi.forEach(r => {
        if (r.jenis === jenis && (r.status === 'dibayar' || r.status === 'aktif')) {
            const checkin = r.tanggalCheckin;
            const checkout = r.tanggalCheckout;
            
            if (tanggal >= checkin && tanggal < checkout) {
                if (jenis === 'tenda' && Array.isArray(r.lapak)) {
                    reserved.push(...r.lapak);
                } else if (jenis === 'glamping' && Array.isArray(r.glamping)) {
                    reserved.push(...r.glamping);
                }
            }
        }
    });
    
    return [...new Set(reserved)];
}

// Reservasi Functions
function loadReservasiForm() {
    const section = document.getElementById('reservasi-section');
    section.innerHTML = `
        <h2 class="section-title"><i class="fas fa-calendar-plus"></i> Form Reservasi Baru</h2>
        
        <div class="tabs">
            <button class="tab-btn active" onclick="showReservasiTab('tenda')">Lapak Tenda</button>
            <button class="tab-btn" onclick="showReservasiTab('glamping')">Glamping</button>
        </div>
        
        <div id="reservasi-tenda-form" class="reservasi-form">
            <h3>Reservasi Lapak Tenda</h3>
            <!-- Form akan diisi oleh JavaScript -->
        </div>
        
        <div id="reservasi-glamping-form" class="reservasi-form hidden">
            <h3>Reservasi Glamping</h3>
            <!-- Form akan diisi oleh JavaScript -->
        </div>
    `;
    
    // Load forms
    loadReservasiFormContent('tenda');
    loadReservasiFormContent('glamping');
}

function loadReservasiFormContent(jenis) {
    const form = document.getElementById(`reservasi-${jenis}-form`);
    
    form.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label for="nama-${jenis}">Nama Pemesan</label>
                <input type="text" id="nama-${jenis}" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="telepon-${jenis}">Telepon</label>
                <input type="tel" id="telepon-${jenis}" class="form-control" required>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="tanggal-checkin-${jenis}">Tanggal Check-in</label>
                <input type="date" id="tanggal-checkin-${jenis}" class="form-control" value="${formatDate(new Date())}" required>
            </div>
            <div class="form-group">
                <label for="tanggal-checkout-${jenis}">Tanggal Check-out</label>
                <input type="date" id="tanggal-checkout-${jenis}" class="form-control" value="${formatDate(new Date(Date.now() + 86400000))}" required>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="jumlah-orang-${jenis}">Jumlah Orang</label>
                <input type="number" id="jumlah-orang-${jenis}" class="form-control" min="1" value="1" required>
            </div>
            <div class="form-group">
                <label for="jumlah-malam-${jenis}">Jumlah Malam</label>
                <input type="number" id="jumlah-malam-${jenis}" class="form-control" min="1" value="1" required>
            </div>
        </div>
        
        <div class="form-group">
            <label>Pilih ${jenis === 'tenda' ? 'Lapak' : 'Glamping'}</label>
            <div id="${jenis}-pilihan-container" class="lapak-container"></div>
        </div>
        
        <div class="form-group">
            <label>Metode Pembayaran</label>
            <select id="payment-method-${jenis}" class="form-control">
                <option value="transfer">Transfer DP</option>
                <option value="lokasi">Bayar di Lokasi</option>
            </select>
        </div>
        
        <button class="btn btn-primary btn-block" onclick="submitReservasi('${jenis}')">
            <i class="fas fa-save"></i> Buat Reservasi
        </button>
    `;
    
    // Load available lapak/glamping
    loadAvailableOptions(jenis);
}

function loadAvailableOptions(jenis) {
    const container = document.getElementById(`${jenis}-pilihan-container`);
    const checkinDate = document.getElementById(`tanggal-checkin-${jenis}`).value;
    
    container.innerHTML = '';
    
    const items = jenis === 'tenda' ? appData.lapakTenda : appData.glamping;
    
    if (items && Array.isArray(items)) {
        // Get reserved items for the date
        getReservedLapak(jenis, checkinDate).then(reserved => {
            items.forEach(item => {
                const isReserved = reserved.includes(item.kode);
                const div = document.createElement('div');
                div.className = `lapak-item ${isReserved ? 'lapak-terpakai' : 'lapak-tersedia'}`;
                div.textContent = item.kode;
                div.title = isReserved ? 'Sudah terpakai' : 'Tersedia';
                
                if (!isReserved) {
                    div.onclick = function() {
                        this.classList.toggle('lapak-dipilih');
                    };
                }
                
                container.appendChild(div);
            });
        });
    }
}

async function submitReservasi(jenis) {
    // Validate form
    const nama = document.getElementById(`nama-${jenis}`).value;
    const telepon = document.getElementById(`telepon-${jenis}`).value;
    const checkin = document.getElementById(`tanggal-checkin-${jenis}`).value;
    const checkout = document.getElementById(`tanggal-checkout-${jenis}`).value;
    const jumlahOrang = document.getElementById(`jumlah-orang-${jenis}`).value;
    const jumlahMalam = document.getElementById(`jumlah-malam-${jenis}`).value;
    const paymentMethod = document.getElementById(`payment-method-${jenis}`).value;
    
    if (!nama || !telepon || !checkin || !checkout) {
        alert('Harap lengkapi semua field!');
        return;
    }
    
    // Get selected items
    const selectedItems = [];
    document.querySelectorAll(`#${jenis}-pilihan-container .lapak-dipilih`).forEach(item => {
        selectedItems.push(item.textContent);
    });
    
    if (selectedItems.length === 0) {
        alert(`Pilih minimal 1 ${jenis === 'tenda' ? 'lapak' : 'glamping'}!`);
        return;
    }
    
    // Calculate total price
    let totalBiaya = 0;
    const items = jenis === 'tenda' ? appData.lapakTenda : appData.glamping;
    
    selectedItems.forEach(kode => {
        const item = items.find(i => i.kode === kode);
        if (item) {
            totalBiaya += (item.harga || 0) * jumlahMalam;
        }
    });
    
    // Add ticket price
    totalBiaya += (jumlahOrang * jumlahMalam * (appData.settings?.perusahaan?.hargaTiket || 15000));
    
    // Calculate DP
    const dpPercentage = appData.settings?.dpPercentage || 50;
    const dp = paymentMethod === 'transfer' ? totalBiaya * (dpPercentage / 100) : 0;
    const status = paymentMethod === 'transfer' ? 'pending' : 'aktif';
    
    // Create invoice
    const invoiceCode = generateInvoiceCode();
    const invoice = {
        invoice: invoiceCode,
        tanggalReservasi: formatDate(new Date()),
        jenis: jenis,
        nama: nama,
        telepon: telepon,
        tanggalCheckin: checkin,
        tanggalCheckout: checkout,
        jumlahOrang: parseInt(jumlahOrang),
        jumlahMalam: parseInt(jumlahMalam),
        [jenis === 'tenda' ? 'lapak' : 'glamping']: selectedItems,
        totalBiaya: totalBiaya,
        dp: dp,
        sisaPembayaran: totalBiaya - dp,
        status: status,
        paymentMethod: paymentMethod
    };
    
    // Create reservasi
    const reservasi = {
        invoice: invoiceCode,
        jenis: jenis,
        tanggalReservasi: invoice.tanggalReservasi,
        tanggalCheckin: checkin,
        tanggalCheckout: checkout,
        jumlahOrang: parseInt(jumlahOrang),
        [jenis === 'tenda' ? 'lapak' : 'glamping']: selectedItems,
        status: status
    };
    
    showLoading('Menyimpan reservasi...');
    
    try {
        // Save to Firebase
        const invoiceRef = firebase.database().ref(`invoice/${invoiceCode}`);
        await invoiceRef.set(invoice);
        
        const reservasiRef = firebase.database().ref(`reservasi/${invoiceCode}`);
        await reservasiRef.set(reservasi);
        
        // Update local data
        if (!appData.invoice) appData.invoice = [];
        appData.invoice.push(invoice);
        
        if (!appData.reservasi) appData.reservasi = [];
        appData.reservasi.push(reservasi);
        
        alert(`Reservasi berhasil dibuat!\nInvoice: ${invoiceCode}\nTotal: ${formatRupiah(totalBiaya)}`);
        
        // Reset form
        loadReservasiFormContent(jenis);
        
        // Update dashboard
        updateDashboard();
        
    } catch (error) {
        console.error('Error saving reservasi:', error);
        alert('Gagal menyimpan reservasi. Coba lagi.');
    } finally {
        hideLoading();
    }
}

// Lapak Status Functions
function loadLapakStatus() {
    const section = document.getElementById('lapak-section');
    section.innerHTML = `
        <h2 class="section-title"><i class="fas fa-map-marked-alt"></i> Status Lapak/Glamping</h2>
        
        <div class="form-row">
            <div class="form-group">
                <label for="lapak-filter-tanggal">Filter Tanggal</label>
                <input type="date" id="lapak-filter-tanggal" class="form-control" value="${formatDate(new Date())}" onchange="updateLapakStatus()">
            </div>
        </div>
        
        <div class="tabs">
            <button class="tab-btn active" onclick="showLapakTab('tenda')">Lapak Tenda</button>
            <button class="tab-btn" onclick="showLapakTab('glamping')">Glamping</button>
        </div>
        
        <div id="lapak-tenda-container" class="lapak-status-container">
            <h3>Status Lapak Tenda</h3>
            <div id="lapak-tenda-visual" class="lapak-container"></div>
        </div>
        
        <div id="lapak-glamping-container" class="lapak-status-container hidden">
            <h3>Status Glamping</h3>
            <div id="lapak-glamping-visual" class="lapak-container"></div>
        </div>
    `;
    
    updateLapakStatus();
}

async function updateLapakStatus() {
    const filterDate = document.getElementById('lapak-filter-tanggal')?.value || formatDate(new Date());
    
    // Update tenda
    const reservedTenda = await getReservedLapak('tenda', filterDate);
    const containerTenda = document.getElementById('lapak-tenda-visual');
    if (containerTenda) {
        containerTenda.innerHTML = '';
        if (appData.lapakTenda && Array.isArray(appData.lapakTenda)) {
            appData.lapakTenda.forEach(lapak => {
                const isReserved = reservedTenda.includes(lapak.kode);
                const item = document.createElement('div');
                item.className = `lapak-item ${isReserved ? 'lapak-terpakai' : 'lapak-tersedia'}`;
                item.textContent = lapak.kode;
                item.title = `${lapak.kode}: ${isReserved ? 'Terpakai' : 'Tersedia'}`;
                containerTenda.appendChild(item);
            });
        }
    }
    
    // Update glamping
    const reservedGlamping = await getReservedLapak('glamping', filterDate);
    const containerGlamping = document.getElementById('lapak-glamping-visual');
    if (containerGlamping) {
        containerGlamping.innerHTML = '';
        if (appData.glamping && Array.isArray(appData.glamping)) {
            appData.glamping.forEach(glamping => {
                const isReserved = reservedGlamping.includes(glamping.kode);
                const item = document.createElement('div');
                item.className = `lapak-item ${isReserved ? 'lapak-terpakai' : 'lapak-tersedia'}`;
                item.textContent = glamping.kode;
                item.title = `${glamping.kode}: ${isReserved ? 'Terpakai' : 'Tersedia'}`;
                containerGlamping.appendChild(item);
            });
        }
    }
}

// Invoice Functions
function loadInvoiceList() {
    const section = document.getElementById('invoice-section');
    section.innerHTML = `
        <h2 class="section-title"><i class="fas fa-file-invoice-dollar"></i> Daftar Invoice Reservasi</h2>
        
        <div class="form-row">
            <div class="form-group">
                <input type="text" id="invoice-search" class="form-control" placeholder="Cari invoice/nama..." onkeyup="searchInvoice()">
            </div>
        </div>
        
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Invoice</th>
                        <th>Nama</th>
                        <th>Jenis</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Tgl Reservasi</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody id="invoice-list-body">
                    <!-- Will be populated by JavaScript -->
                </tbody>
            </table>
        </div>
    `;
    
    populateInvoiceList();
}

function populateInvoiceList() {
    const tbody = document.getElementById('invoice-list-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!appData.invoice || !Array.isArray(appData.invoice)) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Tidak ada data invoice</td></tr>';
        return;
    }
    
    // Sort by date (newest first)
    const sortedInvoices = [...appData.invoice].sort((a, b) => 
        new Date(b.tanggalReservasi) - new Date(a.tanggalReservasi)
    );
    
    sortedInvoices.forEach(invoice => {
        const row = document.createElement('tr');
        
        // Status badge
        let statusBadge;
        switch(invoice.status) {
            case 'pending': statusBadge = '<span class="badge badge-warning">Pending</span>'; break;
            case 'dibayar': statusBadge = '<span class="badge badge-primary">Dibayar</span>'; break;
            case 'aktif': statusBadge = '<span class="badge badge-success">Aktif</span>'; break;
            case 'selesai': statusBadge = '<span class="badge badge-secondary">Selesai</span>'; break;
            default: statusBadge = '<span class="badge badge-danger">Dibatalkan</span>';
        }
        
        row.innerHTML = `
            <td>${invoice.invoice}</td>
            <td>${invoice.nama}</td>
            <td>${invoice.jenis}</td>
            <td>${formatRupiah(invoice.totalBiaya)}</td>
            <td>${statusBadge}</td>
            <td>${formatDateID(invoice.tanggalReservasi)}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="viewInvoice('${invoice.invoice}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Laporan Functions
function loadLaporan() {
    const section = document.getElementById('laporan-section');
    section.innerHTML = `
        <h2 class="section-title"><i class="fas fa-chart-bar"></i> Laporan dan Statistik</h2>
        
        <div class="form-row">
            <div class="form-group">
                <select id="laporan-periode" class="form-control" onchange="generateLaporan()">
                    <option value="hari_ini">Hari Ini</option>
                    <option value="bulan_ini">Bulan Ini</option>
                    <option value="tahun_ini">Tahun Ini</option>
                </select>
            </div>
        </div>
        
        <div class="dashboard-cards">
            <div class="card">
                <div class="card-icon"><i class="fas fa-file-invoice"></i></div>
                <div class="card-value" id="laporan-total-reservasi">0</div>
                <div class="card-label">Total Reservasi</div>
            </div>
            <div class="card">
                <div class="card-icon"><i class="fas fa-users"></i></div>
                <div class="card-value" id="laporan-total-pengunjung">0</div>
                <div class="card-label">Total Pengunjung</div>
            </div>
            <div class="card">
                <div class="card-icon"><i class="fas fa-dollar-sign"></i></div>
                <div class="card-value" id="laporan-total-omzet">Rp 0</div>
                <div class="card-label">Total Omzet</div>
            </div>
        </div>
        
        <div class="table-responsive mt-3">
            <table class="table">
                <thead>
                    <tr>
                        <th>Invoice</th>
                        <th>Tgl Reservasi</th>
                        <th>Nama</th>
                        <th>Jenis</th>
                        <th>Total</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="laporan-detail-body">
                    <!-- Will be populated by JavaScript -->
                </tbody>
            </table>
        </div>
    `;
    
    generateLaporan();
}

function generateLaporan() {
    const periode = document.getElementById('laporan-periode')?.value || 'bulan_ini';
    
    let filteredInvoices = [];
    if (appData.invoice && Array.isArray(appData.invoice)) {
        filteredInvoices = appData.invoice.filter(invoice => {
            const invoiceDate = new Date(invoice.tanggalReservasi);
            const now = new Date();
            
            switch(periode) {
                case 'hari_ini':
                    return invoiceDate.toDateString() === now.toDateString();
                case 'bulan_ini':
                    return invoiceDate.getMonth() === now.getMonth() && 
                           invoiceDate.getFullYear() === now.getFullYear();
                case 'tahun_ini':
                    return invoiceDate.getFullYear() === now.getFullYear();
                default:
                    return true;
            }
        });
    }
    
    // Calculate totals
    const totalReservasi = filteredInvoices.length;
    let totalPengunjung = 0;
    let totalOmzet = 0;
    
    filteredInvoices.forEach(invoice => {
        totalPengunjung += invoice.jumlahOrang || 0;
        if (invoice.status === 'dibayar' || invoice.status === 'selesai') {
            totalOmzet += invoice.totalBiaya || 0;
        }
    });
    
    // Update cards
    document.getElementById('laporan-total-reservasi').textContent = totalReservasi;
    document.getElementById('laporan-total-pengunjung').textContent = totalPengunjung;
    document.getElementById('laporan-total-omzet').textContent = formatRupiah(totalOmzet);
    
    // Update table
    const tbody = document.getElementById('laporan-detail-body');
    if (tbody) {
        tbody.innerHTML = '';
        
        filteredInvoices.forEach(invoice => {
            let statusBadge;
            switch(invoice.status) {
                case 'pending': statusBadge = '<span class="badge badge-warning">Pending</span>'; break;
                case 'dibayar': statusBadge = '<span class="badge badge-primary">Dibayar</span>'; break;
                case 'aktif': statusBadge = '<span class="badge badge-success">Aktif</span>'; break;
                case 'selesai': statusBadge = '<span class="badge badge-secondary">Selesai</span>'; break;
                default: statusBadge = '<span class="badge badge-danger">Dibatalkan</span>';
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${invoice.invoice}</td>
                <td>${formatDateID(invoice.tanggalReservasi)}</td>
                <td>${invoice.nama}</td>
                <td>${invoice.jenis}</td>
                <td>${formatRupiah(invoice.totalBiaya)}</td>
                <td>${statusBadge}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Sync Status
function updateSyncStatus(connected) {
    const icon = document.getElementById('sync-status-icon');
    const status = document.getElementById('sync-status');
    
    if (connected) {
        icon.className = 'fas fa-cloud';
        status.textContent = 'Online - Firebase';
        status.style.color = 'var(--success-color)';
    } else {
        icon.className = 'fas fa-cloud-slash';
        status.textContent = 'Offline - Mode Local';
        status.style.color = 'var(--danger-color)';
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
    // Check for saved user
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').classList.remove('hidden');
            
            // Load data
            await loadAllData();
            initializeUI();
            
            // Set up realtime listener for data changes
            setupRealtimeListeners();
            
        } catch (error) {
            console.error('Error loading saved user:', error);
            localStorage.removeItem('currentUser');
        }
    }
    
    // Set today's date in date inputs
    const today = formatDate(new Date());
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) {
            input.value = today;
        }
    });
});

// Setup realtime listeners for data changes
function setupRealtimeListeners() {
    const refs = [
        'reservasi',
        'invoice',
        'lapakTenda',
        'glamping',
        'settings'
    ];
    
    refs.forEach(ref => {
        firebase.database().ref(ref).on('value', (snapshot) => {
            appData[ref] = snapshot.val();
            
            // If it's an object, convert to array for some refs
            if (ref === 'reservasi' || ref === 'invoice') {
                if (appData[ref] && typeof appData[ref] === 'object') {
                    appData[ref] = Object.values(appData[ref]);
                }
            }
            
            // Update UI based on current section
            const activeSection = document.querySelector('.content-section:not(.hidden)');
            if (activeSection) {
                const sectionId = activeSection.id.replace('-section', '');
                showSection(sectionId);
            }
            
            updateSyncStatus(true);
        });
    });
    
    // Handle connection status
    const connectedRef = firebase.database().ref('.info/connected');
    connectedRef.on('value', (snap) => {
        updateSyncStatus(snap.val() === true);
    });
}