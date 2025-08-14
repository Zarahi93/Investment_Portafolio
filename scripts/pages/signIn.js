// contact.js
export function ContactPage() {
    const contactContent = document.createElement('div');
    contactContent.innerHTML = `
        <nav>
            <ul>
                <li><a href="#/">Home</a></li>
                <li><a href="#/about">About</a></li>
                <li><a href="#/contact">Contact</a></li>
            </ul>
        </nav>
        <h1>Contact Us</h1>
        <p>This is the contact page of our SPA application.</p>
    `;
    return contactContent;
}
