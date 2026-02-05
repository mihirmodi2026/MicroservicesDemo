const API_BASE = '';

// Permission flags (must match server)
const Permission = {
    None: 0,
    ViewUsers: 1,
    EditUsers: 2,
    DeleteUsers: 4,
    ViewProducts: 8,
    EditProducts: 16,
    DeleteProducts: 32,
    All: 63
};

// Current user state
let currentUser = null;

// ============ PERMISSION HELPERS ============

function hasPermission(permission) {
    if (!currentUser) return false;
    if (currentUser.role === 1) return true; // Admin has all permissions
    return (currentUser.permissions & permission) === permission;
}

function isAdmin() {
    return currentUser && currentUser.role === 1;
}

function getPermissionNames(permissions) {
    const names = [];
    if (permissions & Permission.ViewUsers) names.push('View Users');
    if (permissions & Permission.EditUsers) names.push('Edit Users');
    if (permissions & Permission.DeleteUsers) names.push('Delete Users');
    if (permissions & Permission.ViewProducts) names.push('View Products');
    if (permissions & Permission.EditProducts) names.push('Edit Products');
    if (permissions & Permission.DeleteProducts) names.push('Delete Products');
    return names;
}

// ============ AUTH FUNCTIONS ============

function showAuthPage(page) {
    document.querySelectorAll('.auth-page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');
}

function showResendVerification() {
    showAuthPage('resend-verification');
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
            showToast(result.message || 'Registration successful! Check your email to verify.', 'success');
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
            showToast('If the email exists, a password reset link has been sent to your email.', 'success');
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

async function verifyEmailFromUrl(token) {
    showAuthPage('verify-email');
    document.getElementById('verify-loading').style.display = 'block';
    document.getElementById('verify-success').style.display = 'none';
    document.getElementById('verify-error').style.display = 'none';

    try {
        const response = await fetch(`${API_BASE}/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const result = await response.json();

        document.getElementById('verify-loading').style.display = 'none';

        if (result.success) {
            document.getElementById('verify-status-text').textContent = 'Email Verified!';
            document.getElementById('verify-success').style.display = 'block';
        } else {
            document.getElementById('verify-status-text').textContent = 'Verification Failed';
            document.getElementById('verify-error-message').textContent = result.message || 'Invalid or expired verification link.';
            document.getElementById('verify-error').style.display = 'block';
        }
    } catch (error) {
        document.getElementById('verify-loading').style.display = 'none';
        document.getElementById('verify-status-text').textContent = 'Verification Failed';
        document.getElementById('verify-error-message').textContent = 'Error connecting to server.';
        document.getElementById('verify-error').style.display = 'block';
    }
}

async function handleResendVerification(event) {
    event.preventDefault();

    const email = document.getElementById('resend-email').value;

    try {
        const response = await fetch(`${API_BASE}/api/auth/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (result.success) {
            showToast('Verification email sent! Check your inbox.', 'success');
            showAuthPage('login');
        } else {
            showToast(result.message || 'Error sending verification email', 'error');
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

    // Update user display
    document.getElementById('user-display').textContent = currentUser.email;

    // Update role badge
    const roleBadge = document.getElementById('role-badge');
    if (currentUser.role === 1) {
        roleBadge.textContent = 'Admin';
        roleBadge.className = 'role-badge admin';
    } else {
        roleBadge.textContent = 'User';
        roleBadge.className = 'role-badge user';
    }

    // Update dashboard
    document.getElementById('dashboard-name').textContent = currentUser.firstName || currentUser.email.split('@')[0];
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-role').textContent = currentUser.role === 1 ? 'Administrator' : 'Standard User';

    // Update permissions display
    const permNames = isAdmin() ? ['All Permissions (Admin)'] : getPermissionNames(currentUser.permissions);
    document.getElementById('my-permissions').innerHTML = permNames.length > 0
        ? permNames.map(p => `<span class="permission-badge">${p}</span>`).join('')
        : '<span class="no-permissions">No permissions assigned</span>';

    // Show/hide admin panel card
    document.getElementById('admin-stats-card').style.display = isAdmin() ? 'block' : 'none';

    // Show/hide nav links based on permissions
    document.getElementById('nav-users').style.display = hasPermission(Permission.ViewUsers) ? 'inline-block' : 'none';
    document.getElementById('nav-products').style.display = hasPermission(Permission.ViewProducts) ? 'inline-block' : 'none';

    // Show info box if no permissions
    const hasAnyPermission = hasPermission(Permission.ViewUsers) || hasPermission(Permission.ViewProducts);
    document.getElementById('no-permission-info').style.display = hasAnyPermission ? 'none' : 'block';

    navigateTo('dashboard');
}

function showAuth() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    showAuthPage('login');
}

// ============ NAVIGATION ============

function navigateTo(section) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const navLink = document.querySelector(`.nav-link[data-section="${section}"]`);
    if (navLink) navLink.classList.add('active');

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`${section}-section`).classList.add('active');

    if (section === 'users') loadUsers();
    if (section === 'products') loadProducts();
    if (section === 'activity') loadLoginActivity();
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.target.dataset.section;
        navigateTo(section);
    });
});

// ============ TOAST ============

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============ API HEADERS ============

function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (currentUser) {
        headers['X-User-Id'] = currentUser.userId;
    }
    return headers;
}

// ============ USERS ============

async function loadUsers() {
    const tbody = document.getElementById('users-table-body');
    const tableContainer = document.getElementById('users-table-container');
    const noPermission = document.getElementById('users-no-permission');
    const addBtn = document.getElementById('add-user-btn');

    if (!hasPermission(Permission.ViewUsers)) {
        tableContainer.style.display = 'none';
        noPermission.style.display = 'block';
        addBtn.style.display = 'none';
        return;
    }

    tableContainer.style.display = 'block';
    noPermission.style.display = 'none';
    addBtn.style.display = hasPermission(Permission.EditUsers) ? 'inline-block' : 'none';

    tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading...</td></tr>';

    try {
        const response = await fetch(`${API_BASE}/api/users`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            tbody.innerHTML = result.data.map(user => {
                const canEdit = hasPermission(Permission.EditUsers);
                const canDelete = hasPermission(Permission.DeleteUsers);
                const isCurrentUser = user.id === currentUser.userId;

                let actions = '';
                if (canEdit || isCurrentUser) {
                    actions += `<button class="btn btn-secondary btn-sm" onclick="editUser(${user.id})">Edit</button>`;
                }
                if (isAdmin() && !isCurrentUser) {
                    actions += `<button class="btn btn-info btn-sm" onclick="showPermissionsModal(${user.id}, '${user.email}', ${user.permissions})">Permissions</button>`;
                    if (user.role !== 1) {
                        actions += `<button class="btn btn-warning btn-sm" onclick="makeAdmin(${user.id})">Make Admin</button>`;
                    }
                }
                if (canDelete && !isCurrentUser) {
                    actions += `<button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">Delete</button>`;
                }

                return `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.email}</td>
                        <td>${user.firstName || ''} ${user.lastName || ''}</td>
                        <td><span class="role-badge ${user.role === 1 ? 'admin' : 'user'}">${user.role === 1 ? 'Admin' : 'User'}</span></td>
                        <td><span class="status-${user.emailVerified ? 'verified' : 'unverified'}">${user.emailVerified ? 'Verified' : 'Unverified'}</span></td>
                        <td><span class="status-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td class="actions">${actions}</td>
                    </tr>
                `;
            }).join('');
        } else if (result.success) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No users found.</td></tr>';
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="loading">${result.message || 'Error loading users'}</td></tr>`;
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
        const response = await fetch(`${API_BASE}/api/users/${id}`, {
            headers: getAuthHeaders()
        });
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

    if (!id || password) {
        data.password = password;
    }

    try {
        const url = id ? `${API_BASE}/api/users/${id}` : `${API_BASE}/api/users`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: getAuthHeaders(),
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
        const response = await fetch(`${API_BASE}/api/users/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
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

// ============ PERMISSIONS ============

function showPermissionsModal(userId, email, permissions) {
    document.getElementById('perm-user-id').value = userId;
    document.getElementById('perm-user-email').textContent = email;

    // Set checkboxes
    document.getElementById('perm-view-users').checked = (permissions & Permission.ViewUsers) !== 0;
    document.getElementById('perm-edit-users').checked = (permissions & Permission.EditUsers) !== 0;
    document.getElementById('perm-delete-users').checked = (permissions & Permission.DeleteUsers) !== 0;
    document.getElementById('perm-view-products').checked = (permissions & Permission.ViewProducts) !== 0;
    document.getElementById('perm-edit-products').checked = (permissions & Permission.EditProducts) !== 0;
    document.getElementById('perm-delete-products').checked = (permissions & Permission.DeleteProducts) !== 0;

    document.getElementById('permissions-modal').classList.add('active');
}

function closePermissionsModal() {
    document.getElementById('permissions-modal').classList.remove('active');
}

function selectAllPermissions() {
    document.querySelectorAll('#permissions-modal input[type="checkbox"]').forEach(cb => cb.checked = true);
}

function clearAllPermissions() {
    document.querySelectorAll('#permissions-modal input[type="checkbox"]').forEach(cb => cb.checked = false);
}

async function savePermissions() {
    const userId = document.getElementById('perm-user-id').value;

    let permissions = 0;
    if (document.getElementById('perm-view-users').checked) permissions |= Permission.ViewUsers;
    if (document.getElementById('perm-edit-users').checked) permissions |= Permission.EditUsers;
    if (document.getElementById('perm-delete-users').checked) permissions |= Permission.DeleteUsers;
    if (document.getElementById('perm-view-products').checked) permissions |= Permission.ViewProducts;
    if (document.getElementById('perm-edit-products').checked) permissions |= Permission.EditProducts;
    if (document.getElementById('perm-delete-products').checked) permissions |= Permission.DeleteProducts;

    try {
        const response = await fetch(`${API_BASE}/api/auth/update-permissions`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ userId: parseInt(userId), permissions })
        });

        const result = await response.json();

        if (result.success) {
            showToast('Permissions updated!');
            closePermissionsModal();
            loadUsers();
        } else {
            showToast(result.message || 'Error updating permissions', 'error');
        }
    } catch (error) {
        showToast('Error updating permissions', 'error');
    }
}

async function makeAdmin(userId) {
    if (!confirm('Are you sure you want to make this user an Admin? This will give them full access.')) return;

    try {
        const response = await fetch(`${API_BASE}/api/auth/make-admin/${userId}`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (result.success) {
            showToast('User is now an Admin!');
            loadUsers();
        } else {
            showToast(result.message || 'Error promoting user', 'error');
        }
    } catch (error) {
        showToast('Error promoting user', 'error');
    }
}

// ============ PRODUCTS ============

async function loadProducts() {
    const tbody = document.getElementById('products-table-body');
    const tableContainer = document.getElementById('products-table-container');
    const noPermission = document.getElementById('products-no-permission');
    const addBtn = document.getElementById('add-product-btn');

    if (!hasPermission(Permission.ViewProducts)) {
        tableContainer.style.display = 'none';
        noPermission.style.display = 'block';
        addBtn.style.display = 'none';
        return;
    }

    tableContainer.style.display = 'block';
    noPermission.style.display = 'none';
    addBtn.style.display = hasPermission(Permission.EditProducts) ? 'inline-block' : 'none';

    tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading...</td></tr>';

    try {
        const response = await fetch(`${API_BASE}/api/products`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            const canEdit = hasPermission(Permission.EditProducts);
            const canDelete = hasPermission(Permission.DeleteProducts);

            tbody.innerHTML = result.data.map(product => {
                let actions = '';
                if (canEdit) {
                    actions += `<button class="btn btn-secondary btn-sm" onclick="editProduct(${product.id})">Edit</button>`;
                }
                if (canDelete) {
                    actions += `<button class="btn btn-danger btn-sm" onclick="deleteProduct(${product.id})">Delete</button>`;
                }

                return `
                    <tr>
                        <td>${product.id}</td>
                        <td>${product.name}</td>
                        <td>${product.sku}</td>
                        <td>$${product.price.toFixed(2)}</td>
                        <td>${product.stockQuantity}</td>
                        <td>${product.category || '-'}</td>
                        <td class="actions">${actions || '-'}</td>
                    </tr>
                `;
            }).join('');
        } else if (result.success) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No products found.</td></tr>';
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="loading">${result.message || 'Error loading products'}</td></tr>`;
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
        const response = await fetch(`${API_BASE}/api/products/${id}`, {
            headers: getAuthHeaders()
        });
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
            headers: getAuthHeaders(),
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
        const response = await fetch(`${API_BASE}/api/products/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
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
        const response = await fetch(`${API_BASE}/api/auth/login-activity/${currentUser.userId}`, {
            headers: getAuthHeaders()
        });
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

// Check URL parameters for verification or password reset
function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);

    // Check for email verification
    const verifyToken = params.get('verify');
    if (verifyToken) {
        verifyEmailFromUrl(verifyToken);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
    }

    // Check for password reset
    const resetToken = params.get('reset');
    if (resetToken) {
        showAuthPage('reset-password');
        document.getElementById('reset-token').value = resetToken;
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
    }

    return false;
}

// Initialize
const hasUrlAction = checkUrlParams();

if (!hasUrlAction) {
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
}
