// router.js
class Router {
    constructor() {
        this.routes = [];
        this.currentRoute = '';
    }

    // Add route
    addRoute(path, view) {
        this.routes.push({ path, view });
    }

    // Match route and render view
    route() {
        const path = window.location.hash.slice(1) || '/';
        const route = this.routes.find(r => r.path === path);

        if (route) {
            this.currentRoute = path;
            this.renderView(route.view);
        } else {
            // If no route matches, redirect to home
            window.location.hash = '/';
        }
    }

    // Render view
    renderView(view) {
        const main = document.getElementById('main');
        main.innerHTML = '';
        main.appendChild(view);
    }
}

// Instantiate router
const router = new Router();

// Listen for hash change to trigger routing
window.addEventListener('hashchange', () => router.route());

// Initialize routing
router.route();
