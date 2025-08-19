document.addEventListener("DOMContentLoaded", () => {
    const recoverButton = document.getElementById("recover-password");

    recoverButton.addEventListener("click", async () => {
        const email = document.getElementById("account-to-recover").value.trim();

        if (!email) {
            alert("Please enter your email");
            return;
        }

        try {
            // Call your API (backend)
            const response = await fetch(`/api/recover/${encodeURIComponent(email)}`);

            if (!response.ok) {
                alert("No user found with that email");
                return;
            }

            const user = await response.json();
            alert(`Your password is: ${user.data.password}`);
        } catch (err) {
            console.error(err);
            alert("Something went wrong. Try again later.");
        }
    });
});
