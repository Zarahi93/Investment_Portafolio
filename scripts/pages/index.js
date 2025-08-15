// Managing the buttons for changing pages begins ---->
const logIn = document.getElementById("logIn");
logIn.addEventListener("click",goToLogIn);

function goToLogIn(){
    logIn.style.backgroundColor = 'green'; // Change background to green
    logIn.style.color = 'white'; 
window.location.href("/login");
};
// <---- Managing the buttons for changing pages ends