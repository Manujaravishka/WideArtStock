// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('token');
let currentUser = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (authToken) {
        checkAuth();
    } else {
        showLogin();
    }

    // Setup event listeners
    setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);

            // Update active state
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Login form
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        login();
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });

    // Add stock form
    document.getElementById('addStockForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addStock();
    });

    // Update stock form
    document.getElementById('updateStockForm').addEventListener('submit', function(e) {
        e.preventDefault();
        updateStockQuantity();
    });

    // Edit stock form
    document.getElementById('saveEditBtn').addEventListener('click', saveEditStock);

    // Report generation
    document.getElementById('generateReportBtn').addEventListener('click', generateReport);

    // Report type change
    document.getElementById('reportType').addEventListener('change', function() {
        document.getElementById('customRange').style.display =
            this.value === 'custom' ? 'block' : 'none';
    });

    // History filter
    document.getElementById('historyFilter').addEventListener('change', function() {
        loadHistory(1);
    });

    // Stock search
    document.getElementById('searchStock').addEventListener('input', function() {
        loadStockItems(1);
    });

    // Set today's date for reports
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    document.getElementById('endDate').value = today;
}

// Show/Hide sections
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';

        // Load data for section
        switch(sectionId) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'stock':
                loadStockItems(1);
                break;
            case 'history':
                loadHistory(1);
                break;
            case 'reports':
                loadReports();
                break;
        }
    }
}

// Show login screen
function showLogin() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('appSections').style.display = 'none';
}

// Show app sections
function showApp() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('appSections').style.display = 'block';

    // Show dashboard by default
    showSection('dashboard');

    // Set dashboard as active
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('.nav-link[data-section="dashboard"]').classList.add('active');
}

// Login function
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.data.token;
            currentUser = data.data.user;

            // Save token to localStorage
            localStorage.setItem('token', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));

            // Show app
            showApp();
            showNotification('Login successful!', 'success');
        } else {
            showNotification(data.message || 'Login failed', 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Connection error. Please try again.', 'danger');
    }
}

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.data;
            showApp();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showLogin();
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    showLogin();
    showNotification('Logged out successfully', 'info');
}

// Load dashboard data
async function loadDashboard() {
    try {
        // Load statistics
        const statsResponse = await fetch(`${API_BASE_URL}/stock/statistics`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const statsData = await statsResponse.json();

        if (statsData.success) {
            updateDashboardStats(statsData.data);
        }

        // Load recent activity
        const historyResponse = await fetch(`${API_BASE_URL}/history?limit=10`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const historyData = await historyResponse.json();

        if (historyData.success) {
            updateRecentActivity(historyData.items);
        }

        // Load low stock items
        const lowStockResponse = await fetch(`${API_BASE_URL}/stock/low-stock`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const lowStockData = await lowStockResponse.json();

        if (lowStockData.success) {
            updateLowStockList(lowStockData.data);
        }

        // Load stock chart data
        loadStockChart();
        loadCategoryChart();

    } catch (error) {
        console.error('Dashboard load error:', error);
        showNotification('Failed to load dashboard data', 'danger');
    }
}

// Update dashboard statistics
function updateDashboardStats(stats) {
    document.getElementById('totalItems').textContent =
        stats.totalItems?.[0]?.count || 0;
    document.getElementById('lowStock').textContent =
        stats.lowStockCount?.[0]?.count || 0;
    document.getElementById('totalValue').textContent =
        '$' + (stats.totalValue?.[0]?.value || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    // Calculate today's updates
    const today = new Date().toISOString().split('T')[0];
    const todayUpdates = 0; // This would come from a specific endpoint
    document.getElementById('todayUpdates').textContent = todayUpdates;
}

// Update recent activity
function updateRecentActivity(activities) {
    const tbody = document.getElementById('recentActivity');
    tbody.innerHTML = '';

    if (!activities || activities.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">No recent activity</td>
            </tr>
        `;
        return;
    }

    activities.forEach(activity => {
        const date = new Date(activity.created_at);
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let actionBadge = '';
        switch(activity.action_type) {
            case 'add':
                actionBadge = '<span class="badge bg-success">Added</span>';
                break;
            case 'update':
                actionBadge = '<span class="badge bg-warning text-dark">Updated</span>';
                break;
            case 'delete':
                actionBadge = '<span class="badge bg-danger">Deleted</span>';
                break;
            default:
                actionBadge = `<span class="badge bg-secondary">${activity.action_type}</span>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${time}</td>
            <td>${actionBadge}</td>
            <td>${activity.item_name || 'N/A'}</td>
            <td>${activity.user_name || 'System'}</td>
        `;
        tbody.appendChild(row);
    });
}

// Update low stock list
function updateLowStockList(items) {
    const container = document.getElementById('lowStockList');
    container.innerHTML = '';

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="bi bi-check-circle display-6 text-success"></i>
                <p class="mt-2">No low stock items</p>
            </div>
        `;
        return;
    }

    items.slice(0, 5).forEach(item => {
        const percentage = Math.round((item.quantity / item.low_stock_threshold) * 100);

        const itemDiv = document.createElement('div');
        itemDiv.className = 'mb-3';
        itemDiv.innerHTML = `
            <div class="d-flex justify-content-between mb-1">
                <strong>${item.name}</strong>
                <span class="badge bg-danger">${item.quantity} left</span>
            </div>
            <div class="progress" style="height: 6px;">
                <div class="progress-bar bg-danger" style="width: ${Math.min(percentage, 100)}%"></div>
            </div>
            <small class="text-muted">Threshold: ${item.low_stock_threshold}</small>
        `;
        container.appendChild(itemDiv);
    });
}

// Load stock items with pagination
async function loadStockItems(page = 1) {
    try {
        const search = document.getElementById('searchStock').value;
        let url = `${API_BASE_URL}/stock?page=${page}&limit=10`;

        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            updateStockTable(data.items);
            updatePagination(data.page, data.totalPages, 'stock');
            document.getElementById('itemCount').textContent = data.total;
        }
    } catch (error) {
        console.error('Stock load error:', error);
        showNotification('Failed to load stock items', 'danger');
    }
}

// Update stock table
function updateStockTable(items) {
    const tbody = document.getElementById('stockTable');
    tbody.innerHTML = '';

    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-box display-6 text-muted"></i>
                    <p class="mt-2">No stock items found</p>
                </td>
            </tr>
        `;
        return;
    }

    items.forEach((item, index) => {
        const totalValue = item.quantity * item.unit_price;
        const status = getStockStatus(item.quantity, item.low_stock_threshold);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.name}</strong></td>
            <td>${item.category}</td>
            <td>${item.quantity}</td>
            <td>$${item.unit_price.toFixed(2)}</td>
            <td>$${totalValue.toFixed(2)}</td>
            <td><span class="status-badge status-${status}">${status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary btn-action" onclick="editStock(${item.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-action" onclick="showDeleteModal(${item.id}, '${item.name}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Update the select dropdown for stock updates
    updateStockSelect(items);
}

// Get stock status
function getStockStatus(quantity, threshold) {
    if (quantity <= threshold) return 'low';
    if (quantity <= threshold * 2) return 'medium';
    return 'high';
}

// Update stock select dropdown
function updateStockSelect(items) {
    const select = document.getElementById('updateItem');
    select.innerHTML = '<option value="">Select Item</option>';

    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.name} (${item.quantity} available)`;
        select.appendChild(option);
    });
}

// Add new stock item
async function addStock() {
    const itemData = {
        name: document.getElementById('itemName').value,
        category: document.getElementById('itemCategory').value,
        quantity: parseInt(document.getElementById('itemQuantity').value),
        unit_price: parseFloat(document.getElementById('itemPrice').value),
        low_stock_threshold: parseInt(document.getElementById('itemThreshold').value) || 10,
        description: document.getElementById('itemDescription').value,
        supplier: document.getElementById('itemSupplier').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/stock`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemData)
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Stock item added successfully!', 'success');
            document.getElementById('addStockForm').reset();
            loadStockItems(1);
            loadDashboard();
        } else {
            showNotification(data.message || 'Failed to add item', 'danger');
        }
    } catch (error) {
        console.error('Add stock error:', error);
        showNotification('Failed to add stock item', 'danger');
    }
}

// Edit stock item (show modal)
async function editStock(itemId) {
    try {
        const response = await fetch(`${API_BASE_URL}/stock/${itemId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const item = data.data;

            // Fill form
            document.getElementById('editItemId').value = item.id;
            document.getElementById('editItemName').value = item.name;
            document.getElementById('editItemCategory').value = item.category;
            document.getElementById('editItemQuantity').value = item.quantity;
            document.getElementById('editItemPrice').value = item.unit_price;
            document.getElementById('editItemDescription').value = item.description || '';

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editStockModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Edit stock error:', error);
        showNotification('Failed to load item data', 'danger');
    }
}

// Save edited stock
async function saveEditStock() {
    const itemId = document.getElementById('editItemId').value;
    const itemData = {
        name: document.getElementById('editItemName').value,
        category: document.getElementById('editItemCategory').value,
        quantity: parseInt(document.getElementById('editItemQuantity').value),
        unit_price: parseFloat(document.getElementById('editItemPrice').value),
        description: document.getElementById('editItemDescription').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/stock/${itemId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemData)
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Stock item updated successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editStockModal')).hide();
            loadStockItems(1);
            loadDashboard();
        } else {
            showNotification(data.message || 'Failed to update item', 'danger');
        }
    } catch (error) {
        console.error('Update stock error:', error);
        showNotification('Failed to update stock item', 'danger');
    }
}

// Show delete confirmation modal
function showDeleteModal(itemId, itemName) {
    document.getElementById('deleteItemName').textContent = itemName;
    document.getElementById('confirmDeleteBtn').onclick = function() {
        deleteStock(itemId);
    };

    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
}

// Delete stock item
async function deleteStock(itemId) {
    try {
        const response = await fetch(`${API_BASE_URL}/stock/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Stock item deleted successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
            loadStockItems(1);
            loadDashboard();
        } else {
            showNotification(data.message || 'Failed to delete item', 'danger');
        }
    } catch (error) {
        console.error('Delete stock error:', error);
        showNotification('Failed to delete stock item', 'danger');
    }
}

// Update stock quantity
async function updateStockQuantity() {
    const itemId = document.getElementById('updateItem').value;
    const action = document.getElementById('updateAction').value;
    const quantity = parseInt(document.getElementById('updateQuantity').value);
    const notes = document.getElementById('updateReason').value;

    if (!itemId) {
        showNotification('Please select an item', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/stock/${itemId}/quantity`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action === 'add' ? 'add' : 'remove',
                quantity: quantity,
                notes: notes
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Stock quantity updated successfully!', 'success');
            document.getElementById('updateStockForm').reset();
            loadStockItems(1);
            loadDashboard();
        } else {
            showNotification(data.message || 'Failed to update quantity', 'danger');
        }
    } catch (error) {
        console.error('Update quantity error:', error);
        showNotification('Failed to update stock quantity', 'danger');
    }
}

// Load history with pagination
async function loadHistory(page = 1) {
    try {
        const filter = document.getElementById('historyFilter').value;
        let url = `${API_BASE_URL}/history?page=${page}&limit=15`;

        if (filter !== 'all') {
            url += `&actionType=${filter}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            updateHistoryTable(data.items);
            updatePagination(data.page, data.totalPages, 'history');
            document.getElementById('historyCount').textContent = data.total;
        }
    } catch (error) {
        console.error('History load error:', error);
        showNotification('Failed to load history', 'danger');
    }
}

// Update history table
function updateHistoryTable(items) {
    const tbody = document.getElementById('historyTable');
    tbody.innerHTML = '';

    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="bi bi-clock-history display-6 text-muted"></i>
                    <p class="mt-2">No history records found</p>
                </td>
            </tr>
        `;
        return;
    }

    items.forEach(item => {
        const date = new Date(item.created_at);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let actionBadge = '';
        switch(item.action_type) {
            case 'add':
                actionBadge = '<span class="badge bg-success">Added</span>';
                break;
            case 'update':
                actionBadge = '<span class="badge bg-warning text-dark">Updated</span>';
                break;
            case 'delete':
                actionBadge = '<span class="badge bg-danger">Deleted</span>';
                break;
            default:
                actionBadge = `<span class="badge bg-secondary">${item.action_type}</span>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div>${dateStr}</div>
                <small class="text-muted">${timeStr}</small>
            </td>
            <td>${actionBadge}</td>
            <td>${item.item_name || 'N/A'}</td>
            <td class="${item.quantity_change > 0 ? 'text-success' : 'text-danger'}">
                ${item.quantity_change > 0 ? '+' : ''}${item.quantity_change}
            </td>
            <td>${item.previous_quantity}</td>
            <td>${item.new_quantity}</td>
            <td>${item.user_name || 'System'}</td>
        `;
        tbody.appendChild(row);
    });
}

// Load reports
async function loadReports() {
    try {
        // Load today's report
        const todayResponse = await fetch(`${API_BASE_URL}/history/today`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const todayData = await todayResponse.json();

        if (todayData.success) {
            updateTodayReport(todayData);
        }

        // Load category chart
        loadCategoryChart();

    } catch (error) {
        console.error('Reports load error:', error);
        showNotification('Failed to load reports', 'danger');
    }
}

// Update today's report
function updateTodayReport(data) {
    document.getElementById('todayAdded').textContent = data.summary?.items_added || 0;
    document.getElementById('todayUpdated').textContent = data.summary?.items_updated || 0;
    document.getElementById('todayDeleted').textContent = data.summary?.items_deleted || 0;
    document.getElementById('todayTotal').textContent = data.summary?.total_actions || 0;

    const tbody = document.getElementById('todayReportTable');
    tbody.innerHTML = '';

    if (!data.data || data.data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-calendar-check display-6 text-muted"></i>
                    <p class="mt-2">No activity today</p>
                </td>
            </tr>
        `;
        return;
    }

    data.data.forEach(item => {
        let actionBadge = '';
        switch(item.action_type) {
            case 'add':
                actionBadge = '<span class="badge bg-success">Added</span>';
                break;
            case 'update':
                actionBadge = '<span class="badge bg-warning text-dark">Updated</span>';
                break;
            case 'delete':
                actionBadge = '<span class="badge bg-danger">Deleted</span>';
                break;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.time || 'N/A'}</td>
            <td>${item.item_name || 'N/A'}</td>
            <td>${actionBadge}</td>
            <td class="${item.quantity_change > 0 ? 'text-success' : 'text-danger'}">
                ${item.quantity_change > 0 ? '+' : ''}${item.quantity_change}
            </td>
            <td>${item.user_name || 'System'}</td>
        `;
        tbody.appendChild(row);
    });
}

// Generate report
async function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const format = document.getElementById('reportFormat').value;

    let url = `${API_BASE_URL}/reports/`;
    let params = `?format=${format}`;

    if (reportType === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (!startDate || !endDate) {
            showNotification('Please select start and end dates', 'warning');
            return;
        }

        url += 'history';
        params += `&startDate=${startDate}&endDate=${endDate}`;
    } else {
        url += 'stock-summary';
    }

    try {
        const response = await fetch(url + params, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (format === 'csv') {
            // Download CSV
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `stock_report_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showNotification('Report downloaded successfully', 'success');
        } else {
            // Show JSON data (for demo)
            const data = await response.json();
            console.log('Report data:', data);
            showNotification('Report generated (check console)', 'info');
        }
    } catch (error) {
        console.error('Generate report error:', error);
        showNotification('Failed to generate report', 'danger');
    }
}

// Stock Chart
let stockChartInstance = null;
async function loadStockChart() {
    try {
        const response = await fetch(`${API_BASE_URL}/stock/statistics`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success && stockChartInstance) {
            const ctx = document.getElementById('stockChart').getContext('2d');

            // Get low stock count
            const lowStockCount = data.data.lowStockCount?.[0]?.count || 0;
            const totalItems = data.data.totalItems?.[0]?.count || 1;
            const normalStockCount = totalItems - lowStockCount;

            if (stockChartInstance) {
                stockChartInstance.destroy();
            }

            stockChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Low Stock', 'Normal Stock'],
                    datasets: [{
                        data: [lowStockCount, normalStockCount],
                        backgroundColor: ['#e74c3c', '#2ecc71'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        title: {
                            display: true,
                            text: 'Stock Status Distribution'
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Stock chart error:', error);
    }
}

// Category Chart
let categoryChartInstance = null;
async function loadCategoryChart() {
    try {
        const response = await fetch(`${API_BASE_URL}/stock/statistics`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const ctx = document.getElementById('categoryChart').getContext('2d');
            const categoryStats = data.data.categoryStats || [];

            if (categoryChartInstance) {
                categoryChartInstance.destroy();
            }

            categoryChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: categoryStats.map(cat => cat.category),
                    datasets: [{
                        label: 'Number of Items',
                        data: categoryStats.map(cat => cat.item_count),
                        backgroundColor: '#3498db',
                        borderColor: '#2980b9',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Items by Category'
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Category chart error:', error);
    }
}

// Update pagination
function updatePagination(currentPage, totalPages, type) {
    const paginationId = type === 'stock' ? 'pagination' : 'historyPagination';
    const pagination = document.getElementById(paginationId);
    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>`;
    pagination.appendChild(prevLi);

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
        pagination.appendChild(pageLi);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>`;
    pagination.appendChild(nextLi);

    // Add event listeners
    pagination.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (page && page >= 1 && page <= totalPages) {
                if (type === 'stock') {
                    loadStockItems(page);
                } else {
                    loadHistory(page);
                }
            }
        });
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingAlert = document.querySelector('.alert-notification');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show alert-notification`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alert);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}