// Managing the buttons for changing pages begins ---->
const logIn = document.getElementById("signup-to-login");
logIn.addEventListener("click", goToLogIn);
const dashboard = document.getElementById("signup-to-porfolio");
dashboard.addEventListener("click", goToDashboard);

function goToLogIn(){
    window.location.assign("./logIn.html");
};

function goToDashboard(){
    window.location.assign("./dashboard.html");
};
// <---- Managing the buttons for changing pages ends