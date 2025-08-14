// home.js
export function HomePage() {
    const homeContent = document.createElement('div');
    homeContent.innerHTML = `
        <nav>
            <ul>
                <li><a href="#/">Home</a></li>
                <li><a href="#/about">About</a></li>
                <li><a href="#/contact">Contact</a></li>
            </ul>
        </nav>
        <h1>Welcome to the Home Page!</h1>
        <p>This is the main page of our SPA application.</p>
    `;
    return homeContent;
}
