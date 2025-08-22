
        function toggleUserMenu(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('userDropdown');
    const isVisible = dropdown.classList.contains('show');
    
    if (isVisible) {
        hideUserMenu();
    } else {
        showUserMenu();
    }
}

function showUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.add('show');
}

function hideUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.remove('show');
}

function handleMenuClick(action) {
    hideUserMenu();
    
    switch(action) {
        case 'profile':
            // Redirigir a la página de perfil
            window.location.href = '/profile';
            break;
        case 'settings':
            // Redirigir a configuración
            window.location.href = '/settings';
            break;
        case 'help':
            // Redirigir a ayuda
            window.location.href = '/help';
            break;
        case 'logout':
            if(confirm('Are you sure you want to log out?')) {
                // Hacer logout
                window.location.href = '/logout';
            }
            break;
    }
}

// Cerrar menú al hacer clic fuera de él
document.addEventListener('click', function(event) {
    const userProfile = event.target.closest('.user-profile');
    const dropdown = document.getElementById('userDropdown');
    
    if (!userProfile && dropdown && dropdown.classList.contains('show')) {
        hideUserMenu();
    }
});