const API_BASE = '';

// Current user state
let currentUser = null;

// ============ AUTH FUNCTIONS ============

function showAuthPage(page) {
    document.querySelectorAll('.auth-page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (result.success) {
            currentUser = result.data;
            localStorage.setItem('user', JSON.stringify(currentUser));
            showApp();
            showToast('Login successful!');
        } else {
            showToast(result.message || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Error connecting to server', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    if (password !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }

    const data = {
        email: document.getElementById('register-email').value,
        password: password,
        confirmPassword: confirm,
        firstName: document.getElementById('register-firstName').value || null,
        lastName: document.getElementById('register-lastName').value || null
    };

    try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showToast('Registration successful! Please sign in.', 'success');
            // Show verification token info
            if (result.data && result.data.token) {
                alert(`Registration successful!\n\nVerification Token (for demo):\n${result.data.token}\n\nYou can now sign in.`);
            }
            showAuthPage('login');
            document.getElementById('login-email').value = data.email;
        } else {
            showToast(result.message || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Error connecting to server', 'error');
    }
}

async function handleForgotPassword(event) {
    event.preventDefault();

    const email = document.getElementById('forgot-email').value;

    try {
        const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (result.success) {
            showToast('Reset token generated!', 'success');
            if (result.data) {
                document.getElementById('reset-token-value').textContent = result.data;
                document.getElementById('reset-token-display').style.display = 'block';
            }
        } else {
            showToast(result.message || 'Error', 'error');
        }
    } catch (error) {
        showToast('Error connecting to server', 'error');
    }
}

async function handleResetPassword(event) {
    event.preventDefault();

    const password = document.getElementById('reset-password').value;
    const confirm = document.getElementById('reset-confirm').value;

    if (password !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }

    const data = {
        token: document.getElementById('reset-token').value,
        newPassword: password,
        confirmPassword: confirm
    };

    try {
        const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showToast('Password reset successful! Please sign in.', 'success');
            showAuthPage('login');
        } else {
            showToast(result.message || 'Reset failed', 'error');
        }
    } catch (error) {
        showToast('Error connecting to server', 'error');
    }
}

async function handleVerifyEmail(event) {
    event.preventDefault();

    const token = document.getElementById('verify-token').value;

    try {
        const response = await fetch(`${API_BASE}/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const result = await response.json();

        if (result.success) {
            showToast('Email verified successfully!', 'success');
            showAuthPage('login');
        } else {
            showToast(result.message || 'Verification failed', 'error');
        }
    } catch (error) {
        showToast('Error connecting to server', 'error');
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('user');
    showAuth();
    showToast('Logged out successfully');
}

function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('user-display').textContent = currentUser.email;
    loadUsers();
}

function showAuth() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    showAuthPage('login');
}

// ============ NAVIGATION ============

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.target.dataset.section;

        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');

        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(`${section}-section`).classList.add('active');

        if (section === 'users') loadUsers();
        if (section === 'products') loadProducts();
        if (section === 'activity') loadLoginActivity();
    });
});

// ============ TOAST ============

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============ USERS ============

async function loadUsers() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading...</td></tr>';

    try {
        const response = await fetch(`${API_BASE}/api/users`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            tbody.innerHTML = result.data.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.email}</td>
                    <td>${user.firstName || ''} ${user.lastName || ''}</td>
                    <td><span class="status-${user.emailVerified ? 'verified' : 'unverified'}">${user.emailVerified ? 'Verified' : 'Unverified'}</span></td>
                    <td><span class="status-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</td>
                    <td class="actions">
                        <button class="btn btn-secondary btn-sm" onclick="editUser(${user.id})">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">Delete</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No users found. Add one!</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Error loading users</td></tr>';
        showToast('Error loading users', 'error');
    }
}

function showUserModal(user = null) {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');
    const passwordGroup = document.getElementById('password-group');
    const passwordInput = document.getElementById('password');

    form.reset();
    document.getElementById('user-id').value = '';

    if (user) {
        title.textContent = 'Edit User';
        document.getElementById('user-id').value = user.id;
        document.getElementById('email').value = user.email;
        document.getElementById('firstName').value = user.firstName || '';
        document.getElementById('lastName').value = user.lastName || '';
        passwordInput.required = false;
        passwordGroup.querySelector('small').style.display = 'block';
    } else {
        title.textContent = 'Add User';
        passwordInput.required = true;
        passwordGroup.querySelector('small').style.display = 'none';
    }

    modal.classList.add('active');
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
}

async function editUser(id) {
    try {
        const response = await fetch(`${API_BASE}/api/users/${id}`);
        const result = await response.json();
        if (result.success) {
            showUserModal(result.data);
        }
    } catch (error) {
        showToast('Error loading user', 'error');
    }
}

async function saveUser(event) {
    event.preventDefault();

    const id = document.getElementById('user-id').value;
    const password = document.getElementById('password').value;

    const data = {
        email: document.getElementById('email').value,
        firstName: document.getElementById('firstName').value || null,
        lastName: document.getElementById('lastName').value || null
    };

    // Only include password for new users or if password field has value
    if (!id || password) {
        data.password = password;
    }

    try {
        const url = id ? `${API_BASE}/api/users/${id}` : `${API_BASE}/api/users`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showToast(id ? 'User updated!' : 'User created!');
            closeUserModal();
            loadUsers();
        } else {
            showToast(result.message || 'Error saving user', 'error');
        }
    } catch (error) {
        showToast('Error saving user', 'error');
    }
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await fetch(`${API_BASE}/api/users/${id}`, { method: 'DELETE' });
        const result = await response.json();

        if (result.success) {
            showToast('User deleted!');
            loadUsers();
        } else {
            showToast(result.message || 'Error deleting user', 'error');
        }
    } catch (error) {
        showToast('Error deleting user', 'error');
    }
}

// ============ PRODUCTS ============

async function loadProducts() {
    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading...</td></tr>';

    try {
        const response = await fetch(`${API_BASE}/api/products`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            tbody.innerHTML = result.data.map(product => `
                <tr>
                    <td>${product.id}</td>
                    <td>${product.name}</td>
                    <td>${product.sku}</td>
                    <td>$${product.price.toFixed(2)}</td>
                    <td>${product.stockQuantity}</td>
                    <td>${product.category || '-'}</td>
                    <td class="actions">
                        <button class="btn btn-secondary btn-sm" onclick="editProduct(${product.id})">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${product.id})">Delete</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No products found. Add one!</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Error loading products</td></tr>';
        showToast('Error loading products', 'error');
    }
}

function showProductModal(product = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('product-modal-title');
    const form = document.getElementById('product-form');

    form.reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-sku').disabled = false;

    if (product) {
        title.textContent = 'Edit Product';
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-sku').value = product.sku;
        document.getElementById('product-sku').disabled = true;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-stock').value = product.stockQuantity;
        document.getElementById('product-category').value = product.category || '';
        document.getElementById('product-description').value = product.description || '';
    } else {
        title.textContent = 'Add Product';
    }

    modal.classList.add('active');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
}

async function editProduct(id) {
    try {
        const response = await fetch(`${API_BASE}/api/products/${id}`);
        const result = await response.json();
        if (result.success) {
            showProductModal(result.data);
        }
    } catch (error) {
        showToast('Error loading product', 'error');
    }
}

async function saveProduct(event) {
    event.preventDefault();

    const id = document.getElementById('product-id').value;
    const data = {
        name: document.getElementById('product-name').value,
        sku: document.getElementById('product-sku').value,
        price: parseFloat(document.getElementById('product-price').value),
        stockQuantity: parseInt(document.getElementById('product-stock').value) || 0,
        category: document.getElementById('product-category').value || null,
        description: document.getElementById('product-description').value || null
    };

    try {
        const url = id ? `${API_BASE}/api/products/${id}` : `${API_BASE}/api/products`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showToast(id ? 'Product updated!' : 'Product created!');
            closeProductModal();
            loadProducts();
        } else {
            showToast(result.message || 'Error saving product', 'error');
        }
    } catch (error) {
        showToast('Error saving product', 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const response = await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE' });
        const result = await response.json();

        if (result.success) {
            showToast('Product deleted!');
            loadProducts();
        } else {
            showToast(result.message || 'Error deleting product', 'error');
        }
    } catch (error) {
        showToast('Error deleting product', 'error');
    }
}

// ============ LOGIN ACTIVITY ============

async function loadLoginActivity() {
    const tbody = document.getElementById('activity-table-body');
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Loading...</td></tr>';

    if (!currentUser) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Please log in to view activity</td></tr>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/auth/login-activity/${currentUser.userId}`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            tbody.innerHTML = result.data.map(activity => `
                <tr>
                    <td>${new Date(activity.loginTime).toLocaleString()}</td>
                    <td>${activity.ipAddress || 'Unknown'}</td>
                    <td>${truncate(activity.userAgent, 50) || 'Unknown'}</td>
                    <td><span class="status-${activity.isSuccessful ? 'success' : 'failed'}">${activity.isSuccessful ? 'Success' : 'Failed'}</span></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="loading">No login activity found</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Error loading activity</td></tr>';
        showToast('Error loading login activity', 'error');
    }
}

function truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
}

// ============ INITIALIZATION ============

// Check for saved user on page load
const savedUser = localStorage.getItem('user');
if (savedUser) {
    try {
        currentUser = JSON.parse(savedUser);
        showApp();
    } catch (e) {
        localStorage.removeItem('user');
        showAuth();
    }
} else {
    showAuth();
}
